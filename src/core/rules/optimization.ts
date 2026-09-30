/**
 * 调优闭环：观测 / 评测发现问题 → 「纳入本轮优化」生成优化目标 → 构建与调优 → 评测核对目标 → 灰度验证 → 继续观测。
 * 一轮优化 = 一个候选版本 + 一组要解决的问题（优化目标）。
 * 这里只放规则：从不同来源预填目标、判断目标状态、把目标挂到候选版本上、本轮进度。
 */
import type { AbMetric, Agent, AgentConfig, AgentOps, AlertDef, BadCase, OptimizationGoal, TuneTarget } from '../../types/domain';
import { baseOf } from '../../data';
import { evaluateGate, formatGateValue, type GateRuleResult } from './gate';
import { getCandidate, getProduction } from './versions';

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
    source: 'bad case', sourceId: badcase.id, title: `${badcase.summary}（×${badcase.similar} 条相似）`, traceId: badcase.traceId, targets: [stage],
    metrics: [`${badcase.id} 在 bad case 回归集上通过`, ...(stage === '知识' && /失效|过期/.test(`${badcase.step.issue}${badcase.suggest.evidence}`) ? ['过期知识命中 0 条'] : []), `灰度期：${metric.goal}`],
    verify: `评测页用 bad case 回归集验证 → 灰度期看${metric.name}`,
  };
}

export function seedFromAlert(agent: Agent, alert: AlertDef): GoalSeed {
  const threshold = /门槛 ([^，]+)/.exec(alert.detail)?.[1];
  return {
    source: '告警', sourceId: alert.id, title: `${alert.title}（${alert.version}）`, targets: targetOfText(alert.title),
    metrics: [threshold ? `${alert.title.replace(/超过门槛|超门槛/, '')} ${threshold}`.trim() : `${alert.title}恢复`, `灰度期：${metricOf(agent).goal}`],
    verify: '评测页压测 → 灰度期看告警是否恢复',
  };
}

export function seedFromAb(agent: Agent, metric: AbMetric, versionId: string): GoalSeed {
  const bound = metric.threshold !== undefined ? `${metric.higherIsBetter ? '≥' : '≤'} ${metric.threshold}${metric.unit === '%' ? '%' : metric.unit}` : metric.higherIsBetter ? '不低于旧版本' : '不高于旧版本';
  return {
    source: 'AB 实验', sourceId: `${versionId}:${metric.label}`, title: `${versionId} 的 ${metric.label} ${metric.oldValue}${metric.unit} → ${metric.newValue}${metric.unit}`, targets: targetOfText(metric.label),
    metrics: [`${metric.label} ${bound}`, `灰度期：${metricOf(agent).goal}`],
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
  // bad case 来源：这条 bad case 必须真的在这个版本的回归集评测里（评测后才加入的不算）
  const covered = goal.source !== 'bad case' || Boolean(version.evaluatedBadcases?.includes(goal.sourceId) && ops.badcases[goal.sourceId]?.inEvalSet);
  return covered && gate.passed ? '已达成' : '未达成';
}

export const isOpenGoal = (state: GoalState) => state !== '已上线 · 观察中' && state !== '已回退';

/** 某个版本上的目标（含等待挂载、当前会挂到它上面的） */
export const goalsOfVersion = (agent: Agent, ops: AgentOps, versionId: string | null) => ops.goals.filter(goal => goalVersion(agent, goal) === versionId);
/** 还在进行中的目标（导航上的「下一轮」计数） */
export const openGoals = (agent: Agent, ops: AgentOps) => ops.goals.filter(goal => isOpenGoal(goalState(agent, ops, goal)));

/** 构建与调优页的「建议动作」：每个调优对象去哪里改、怎么改 */
export const tuneAdvice: Record<TuneTarget, string> = {
  Prompt: '在左栏「角色指令」补充约束（输出结构、意图判断、要用到的输入参数），可以用「优化」生成建议稿后对比采纳。',
  知识: '去资产中心更新知识库：修正或补充条目、给过期条目设失效时间并发布新版本，再在能力配置里升级知识版本。',
  模型: '在能力配置里切换模型或备用模型，用右侧调试台拿本轮问题的原话对比回答。',
  工具: '在能力配置的「工具」里换工具版本或改调用说明；工具本身的缺陷找工具负责人修复并发布新版本。',
  编排: '在能力配置的「工作流」里调整步骤：并行调用、超时与重试、补充分支（如低置信度转人工、超时降级）。',
  策略: '去「设置」调整运行策略：护栏规则、转人工阈值、降级方式（设置对线上立即生效，不随版本发布）。',
};

/** 调优对象对应的版本配置；策略在「设置」里改，不在版本配置里 */
const configPart: Record<Exclude<TuneTarget, '策略'>, (config: AgentConfig) => unknown> = {
  Prompt: config => [config.prompt, config.outputFormat], 知识: config => [config.knowledge, config.retrieval], 模型: config => [config.model, config.fallbackModel, config.maxThinking],
  工具: config => [config.tools, config.database], 编排: config => config.steps,
};
/** 某个调优对象在 config 里相对线上版本改过没有（策略不在版本配置里，视为已处理） */
export function targetChanged(agent: Agent, config: AgentConfig, target: TuneTarget) {
  const production = getProduction(agent);
  if (target === '策略' || !production) return true;
  return JSON.stringify(configPart[target](config)) !== JSON.stringify(configPart[target](production.config));
}
/** 本轮调优对象里，候选版本相对线上版本还没改过的 */
export function untouchedTargets(agent: Agent, ops: AgentOps, versionId: string): TuneTarget[] {
  const version = agent.versions.find(item => item.id === versionId);
  if (!version) return [];
  return [...new Set(goalsOfVersion(agent, ops, versionId).flatMap(goal => goal.targets))].filter(target => !targetChanged(agent, version.config, target));
}

/** 本轮进度：① 改配置 ② 调试 ③ 评测核对 ④ 灰度验证（按版本快照判断，不含未保存的草稿） */
export type RoundStepState = 'done' | 'current' | 'todo';
export const roundSteps = ['改配置', '调试', '评测核对', '灰度验证'] as const;
export function roundProgress(agent: Agent, ops: AgentOps, versionId: string | null): RoundStepState[] {
  const version = versionId ? agent.versions.find(item => item.id === versionId) : null;
  if (!version) return ['current', 'todo', 'todo', 'todo'];
  if (version.status === '线上' || version.status === '历史') return ['done', 'done', 'done', 'done'];
  if (version.status === '灰度中' || version.status === '影子运行') return ['done', 'done', 'done', 'current'];
  const production = getProduction(agent);
  const goals = goalsOfVersion(agent, ops, version.id);
  const targets = goals.flatMap(goal => goal.targets);
  /* 改配置：本轮每个调优对象对应的配置都改过；只有「策略」时在设置里改，保存过候选版本即可；没有调优对象时看配置有没有变 */
  const changed = !production ? version.configured
    : targets.length ? untouchedTargets(agent, ops, version.id).length === 0 && (targets.some(target => target !== '策略') || version.configured)
    : JSON.stringify(version.config) !== JSON.stringify(production.config);
  const verified = goals.length > 0 && goals.every(goal => goalState(agent, ops, goal) === '已达成');
  const done = [changed, changed && version.debugged, verified, false];
  const current = done.findIndex(item => !item);
  return done.map((item, index) => item ? 'done' : index === current ? 'current' : 'todo');
}
