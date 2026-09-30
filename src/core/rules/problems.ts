/**
 * 待处理问题：bad case、生效中的告警、AB 实验里变差的指标、候选版本没过的评测门槛。
 * 一轮优化 = 一个候选版本 + 一组要解决的问题；这里判断每个问题的状态、影响度，排出「下一轮」的待处理队列。
 */
import type { AbMetric, Agent, AgentOps, AlertDef, BadCase, BadCaseLabel, OptimizationSource, ProblemStage } from '../../types/domain';
import { badcaseSourceWeight } from '../../data';
import { abFor, alertsFor, badcasesFor } from '../data-access/scenarioData';
import { evaluateGate } from './gate';
import { goalState, isOpenGoal, seedFromAb, seedFromAlert, seedFromBadcase, seedFromGate, type GoalSeed } from './optimization';
import { getCandidate, getExperiment } from './versions';

/* ---------------- bad case ---------------- */

/** 待归因 → 已归因 → 已纳入本轮（挂在候选版本上）→ 验证中（所在版本灰度中）→ 已修复；或已忽略 */
export type BadCaseStatus = '待归因' | '已归因' | '已纳入本轮' | '验证中' | '已修复' | '已忽略';
export const badcaseStatuses: BadCaseStatus[] = ['待归因', '已归因', '已纳入本轮', '验证中', '已修复', '已忽略'];

/** 人工处理结果：没处理过时，标注平台回流的归因算作已确认 */
export const labelOf = (ops: AgentOps, item: BadCase): BadCaseLabel => ops.badcases[item.id] ?? { stage: item.labeled ?? null, inEvalSet: false };

/** 问题出在正在服务用户的版本上（线上或灰度中） */
export function servingVersion(agent: Agent, versionId: string) {
  const version = agent.versions.find(item => item.id === versionId);
  return Boolean(version && (version.id === agent.productionVersion || version.status === '灰度中'));
}

/** 更新的线上版本在回归集上评测过、且回归集覆盖了这条 bad case：视为已修复 */
function fixedOnline(agent: Agent, ops: AgentOps, item: BadCase) {
  const order = (id: string | null) => agent.versions.findIndex(version => version.id === id);
  const production = agent.versions.find(version => version.id === agent.productionVersion);
  return Boolean(production && order(production.id) !== -1 && order(item.version) !== -1 && order(production.id) < order(item.version)
    && Boolean(production.evaluatedBadcases?.includes(item.id)));
}

/** 这条 bad case 所在的优化目标（没结束的优先） */
export const goalOfBadcase = (agent: Agent, ops: AgentOps, id: string) => {
  const goals = ops.goals.filter(goal => goal.source === 'bad case' && goal.sourceId === id);
  return goals.find(goal => isOpenGoal(goalState(agent, ops, goal))) ?? goals[goals.length - 1] ?? null;
};

export function badcaseStatus(agent: Agent, ops: AgentOps, item: BadCase): BadCaseStatus {
  const label = labelOf(ops, item);
  if (label.ignored || item.closed?.status === '已忽略') return '已忽略';
  if (item.closed?.status === '已修复' || fixedOnline(agent, ops, item)) return '已修复';
  const goal = goalOfBadcase(agent, ops, item.id);
  // 目标所在版本已上线、但没在回归集上验证过这条 bad case：不算已修复，回到待处理（详情里提示上一轮的结果）
  if (goal && isOpenGoal(goalState(agent, ops, goal))) return goalState(agent, ops, goal) === '灰度验证中' ? '验证中' : '已纳入本轮';
  return label.stage ? '已归因' : '待归因';
}

/** 上一轮纳入过、但没有修复就结束的（版本已回退，或上线了却没在回归集上验证） */
export function lastRoundNote(agent: Agent, ops: AgentOps, item: BadCase): string | null {
  const goal = goalOfBadcase(agent, ops, item.id);
  const status = badcaseStatus(agent, ops, item);
  if (!goal || (status !== '待归因' && status !== '已归因')) return null;
  const state = goalState(agent, ops, goal);
  if (state === '已回退') return `上一轮纳入过（${goal.id}），但 ${goal.version ?? '对应版本'} 已回退，问题仍在线上，可以重新纳入本轮。`;
  if (state === '已上线 · 观察中') return `上一轮纳入过（${goal.id}），${goal.version} 已上线，但没有在 bad case 回归集上验证这条问题，不能算已修复；建议重新纳入并用回归集验证。`;
  return null;
}

/** 影响度 = 相似条数 × 来源权重（申诉 3 / 用户反馈 2 / 抽检 1）× 是否出在正在服务的版本上（1.5） */
export const badcaseImpact = (agent: Agent, item: BadCase) => item.similar * badcaseSourceWeight[item.source] * (servingVersion(agent, item.version) ? 1.5 : 1);
export type ImpactLevel = '高' | '中' | '低';
export const impactLevel = (impact: number): ImpactLevel => impact >= 40 ? '高' : impact >= 15 ? '中' : '低';

/** 纳入本轮时用的调优对象：人工确认过的归因优先，否则用平台建议 */
export const stageForRound = (ops: AgentOps, item: BadCase): ProblemStage => labelOf(ops, item).stage ?? item.suggest.stage;

/* ---------------- 告警 / AB / 门槛 ---------------- */

/** 告警是否生效中：告警所在版本还在灰度、影子运行或就是线上版本 */
export function alertActive(agent: Agent, alert: AlertDef) {
  const version = agent.versions.find(item => item.id === alert.version);
  return Boolean(version && (version.status === '灰度中' || version.status === '影子运行' || version.id === agent.productionVersion));
}

/** AB 实验里需要优化的指标：超过门槛，或显著变差 */
export function abProblem(metric: AbMetric) {
  const delta = metric.newValue - metric.oldValue;
  const significant = metric.ci[0] > 0 || metric.ci[1] < 0;
  const good = metric.higherIsBetter ? delta > 0 : delta < 0;
  const overThreshold = metric.threshold !== undefined && (metric.higherIsBetter ? metric.newValue < metric.threshold : metric.newValue > metric.threshold);
  return overThreshold || (significant && !good);
}

/* ---------------- 待处理队列 ---------------- */

export interface PendingProblem {
  key: string; source: OptimizationSource; sourceId: string; title: string; meta: string;
  impact: number; level: ImpactLevel;
  seed: GoalSeed;
  /** 查看详情的页面（相对 /agents/:id/） */
  link: string;
  badcase?: BadCase;
}

/** 已经有进行中的优化目标的问题，不再出现在队列里 */
const inRound = (agent: Agent, ops: AgentOps, source: OptimizationSource, sourceId: string) =>
  ops.goals.some(goal => goal.source === source && goal.sourceId === sourceId && isOpenGoal(goalState(agent, ops, goal)));

export function pendingProblems(agent: Agent, ops: AgentOps): PendingProblem[] {
  const items: PendingProblem[] = [];
  for (const alert of alertsFor(agent)) {
    if (!alertActive(agent, alert) || inRound(agent, ops, '告警', alert.id)) continue;
    items.push({ key: `alert-${alert.id}`, source: '告警', sourceId: alert.id, title: alert.title, meta: `${alert.version} · ${alert.detail}`, impact: 60, level: '高', seed: seedFromAlert(agent, alert), link: 'monitor' });
  }
  const candidate = getCandidate(agent);
  if (candidate) {
    const gate = evaluateGate(agent, ops, candidate);
    const seed = seedFromGate(agent, candidate.id, gate.failedRules, gate.failedRedlines.length);
    if (gate.evaluated && !gate.passed && !inRound(agent, ops, '评测门槛', seed.sourceId))
      items.push({ key: 'gate', source: '评测门槛', sourceId: seed.sourceId, title: `${candidate.id} 未通过上线门槛`, meta: seed.title.replace(/^.*?：/, ''), impact: 50, level: '高', seed, link: 'evaluation' });
  }
  const experiment = getExperiment(agent);
  if (experiment && agent.productionVersion) {
    for (const metric of abFor(agent).metrics) {
      const seed = seedFromAb(agent, metric, experiment.id);
      if (!abProblem(metric) || inRound(agent, ops, 'AB 实验', seed.sourceId)) continue;
      items.push({ key: `ab-${metric.label}`, source: 'AB 实验', sourceId: seed.sourceId, title: `${metric.label}变差`, meta: seed.title, impact: 40, level: '高', seed, link: 'release' });
    }
  }
  for (const item of badcasesFor(agent)) {
    const status = badcaseStatus(agent, ops, item);
    if (status !== '待归因' && status !== '已归因') continue;
    const impact = badcaseImpact(agent, item);
    const stage = stageForRound(ops, item);
    items.push({ key: `bc-${item.id}`, source: 'bad case', sourceId: item.id, title: item.summary,
      meta: `${item.source} · ×${item.similar} 条相似 · ${item.version}${servingVersion(agent, item.version) ? '（服务中）' : ''} · ${status === '已归因' ? `归因 ${stage}` : `建议归因 ${stage}`}`,
      impact, level: impactLevel(impact), seed: seedFromBadcase(agent, item, stage), link: `trace?badcase=${item.id}`, badcase: item });
  }
  // 告警、门槛未过、AB 变差是正在发生或阻断发布的问题，排在 bad case 前面；同组内按影响度
  return items.sort((a, b) => Number(a.source === 'bad case') - Number(b.source === 'bad case') || b.impact - a.impact);
}
