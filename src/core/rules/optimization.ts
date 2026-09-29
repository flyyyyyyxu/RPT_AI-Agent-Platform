/**
 * 调优闭环：观测 / 评测发现问题 → 「发起优化」生成优化目标 → 构建与调优 → 评测核对目标 → 灰度验证 → 继续观测。
 * 这里只放规则：从不同来源预填目标、判断目标状态、把目标挂到候选版本上。
 */
import type { AbMetric, Agent, AgentOps, AlertDef, BadCase, OptimizationGoal, TuneTarget } from '../../types/domain';
import { baseOf } from '../../data';
import { evaluateGate, formatGateValue, type GateRuleResult } from './gate';
import { getCandidate } from './versions';

export type GoalSeed = Omit<OptimizationGoal, 'id' | 'createdAt' | 'createdBy' | 'version'>;
export type GoalState = '待开始' | '调优中' | '未达成' | '已达成' | '灰度验证中' | '已上线 · 观察中' | '已回退';
export const tuneTargets: TuneTarget[] = ['Prompt', '知识', '模型', '工具', '编排', '策略'];

/** 各业务的线上验证指标（灰度期看） */
const businessMetric: Record<string, { name: string; goal: string }> = {
  general: { name: '回答采纳率', goal: '回答采纳率 ≥ 87%（线上 87.2%）' },
  a: { name: '采纳率', goal: '采纳率不下降（线上 42.8%）' },
  b: { name: '申诉改判率', goal: '申诉改判率 ≤ 0.9%' },
  c: { name: '转人工率', goal: '转人工率 ≤ 10%（线上 12.1%）' },
  blank: { name: '回答采纳率', goal: '回答采纳率不下降' },
};
const metricOf = (agent: Agent) => businessMetric[baseOf(agent.profile)] ?? businessMetric.blank;
const targetOfText = (text: string): TuneTarget[] => /延迟|P95|耗时/.test(text) ? ['编排'] : /知识|条款|过期/.test(text) ? ['知识'] : [];

export function seedFromBadcase(agent: Agent, badcase: BadCase, stage: TuneTarget): GoalSeed {
  const metric = metricOf(agent);
  return {
    source: 'bad case', sourceId: badcase.id, title: badcase.summary, traceId: badcase.traceId, targets: [stage],
    metrics: [`${badcase.id} 在 bad case 回归集上通过`, ...(stage === '知识' ? ['过期知识命中 0 条'] : []), metric.goal],
    verify: `评测页用 bad case 回归集验证 → 灰度期看${metric.name}`,
  };
}

export function seedFromAlert(agent: Agent, alert: AlertDef): GoalSeed {
  const threshold = /门槛 ([^，,]+)/.exec(alert.detail)?.[1];
  return {
    source: '告警', sourceId: alert.id, title: `${alert.title}（${alert.version}）`, targets: targetOfText(alert.title),
    metrics: [threshold ? `${alert.title.replace(/超过门槛|超门槛/, '')} ${threshold}`.trim() : `${alert.title}恢复`, metricOf(agent).goal],
    verify: '评测页压测 → 灰度期看告警是否恢复',
  };
}

export function seedFromAb(agent: Agent, metric: AbMetric, versionId: string): GoalSeed {
  const bound = metric.threshold !== undefined ? `${metric.higherIsBetter ? '≥' : '≤'} ${metric.threshold}${metric.unit === '%' ? '%' : metric.unit}` : metric.higherIsBetter ? '不低于旧版本' : '不高于旧版本';
  return {
    source: 'AB 实验', sourceId: `${versionId}:${metric.label}`, title: `${versionId} 的${metric.label} ${metric.oldValue}${metric.unit} → ${metric.newValue}${metric.unit}`, targets: targetOfText(metric.label),
    metrics: [`${metric.label} ${bound}`, metricOf(agent).goal],
    verify: '评测页压测与回归 → 下一次灰度看 AB 报告',
  };
}

export function seedFromGate(agent: Agent, versionId: string, failedRules: GateRuleResult[], failedRedlines: number): GoalSeed {
  return {
    source: '评测门槛', sourceId: `${versionId}:gate`, title: `${versionId} 未通过上线门槛：${[...failedRules.map(rule => rule.metric), ...(failedRedlines ? [`红线样本漏判 ${failedRedlines} 条`] : [])].join('、')}`, targets: [],
    metrics: [...failedRules.map(rule => `${rule.metric} ${rule.op === '>=' ? '≥' : '≤'} ${formatGateValue(rule.threshold, rule.unit)}`), ...(failedRedlines ? ['红线样本全部通过'] : [])],
    verify: '去 Trace 定位原因，修改后在评测页重新评测',
  };
}

/** 目标挂在哪个版本：没挂上的，挂到当前候选版本 */
export const goalVersion = (agent: Agent, goal: OptimizationGoal) => goal.version ?? getCandidate(agent)?.id ?? null;

/** 目标是否达成：bad case 来源要在回归集上评测过且门槛通过；其它来源看门槛 */
export function goalState(agent: Agent, ops: AgentOps, goal: OptimizationGoal): GoalState {
  const id = goalVersion(agent, goal);
  const version = id ? agent.versions.find(item => item.id === id) : null;
  if (!version) return '待开始';
  if (version.status === '灰度中' || version.status === '影子运行') return '灰度验证中';
  if (version.status === '线上') return '已上线 · 观察中';
  if (version.status === '历史') return '已回退';
  const gate = evaluateGate(agent, ops, version);
  if (!gate.evaluated) return '调优中';
  const covered = goal.source !== 'bad case' || (version.evaluatedDatasets.includes('badcase') && Boolean(ops.badcases[goal.sourceId]?.inEvalSet));
  return covered && gate.passed ? '已达成' : '未达成';
}

export const isOpenGoal = (state: GoalState) => state !== '已上线 · 观察中' && state !== '已回退';

/** 某个版本上的目标（含等待挂载、当前会挂到它上面的） */
export const goalsOfVersion = (agent: Agent, ops: AgentOps, versionId: string | null) => ops.goals.filter(goal => goalVersion(agent, goal) === versionId);
/** 还在进行中的目标（导航上的「下一轮」计数） */
export const openGoals = (agent: Agent, ops: AgentOps) => ops.goals.filter(goal => isOpenGoal(goalState(agent, ops, goal)));
