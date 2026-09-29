/**
 * 线上干预的状态规则。干预是临时止血，不是修复：
 *   - 必须由 bad case 生成（关联 bad case 和它的 Trace）；
 *   - 有效期最长 7 天，到期自动结束；
 *   - 关联的 bad case 已加入回归集、且更新的版本在回归集上评测通过并成为线上版本后，平台自动让它失效；
 *   - 创建、撤销、自动失效都写入操作记录（治理 · 最近操作）。
 */
import type { Agent, AgentOps, Intervention } from '../../types/domain';
import { demoNow } from './clock';

export type InterventionState = '生效中' | '已撤销' | '已失效' | '已到期';

export function interventionState(item: Intervention, now = demoNow()): InterventionState {
  if (item.ended) return item.ended.auto ? '已失效' : '已撤销';
  return now >= item.expiresAt ? '已到期' : '生效中';
}

export const activeInterventions = (ops: AgentOps) => ops.interventions.filter(item => interventionState(item) === '生效中');

/** target 是否是修复了这条干预的版本：比干预针对的版本更新、回归集覆盖了关联的 bad case 且已评测 */
export function fixesIntervention(agent: Agent, ops: AgentOps, item: Intervention, targetId: string) {
  const order = (id: string) => agent.versions.findIndex(version => version.id === id);
  const target = agent.versions.find(version => version.id === targetId);
  const newer = order(targetId) !== -1 && order(item.appliesTo) !== -1 && order(targetId) < order(item.appliesTo);
  return Boolean(target && newer && ops.badcases[item.badcaseId]?.inEvalSet && target.evaluatedDatasets.includes('badcase'));
}
