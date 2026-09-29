/** 发布与实验：发布、回退、比例灰度 / 影子运行、放量、结束实验、全量。发布和回退都只改变线上指向。 */
import { rampSteps } from '../../../data';
import type { Agent, AgentOps } from '../../../types/domain';
import { nowStamp } from '../../rules/clock';
import { canRollbackTo, getCandidate, getExperiment, isEvaluated } from '../../rules/versions';
import { fixesIntervention, interventionState } from '../../rules/interventions';
import { switchProduction, updateVersion, type StoreKit } from '../kit';

interface OpsApi { opsOf: (agent: Agent) => AgentOps; updateOps: (agentId: string, updater: (ops: AgentOps) => AgentOps) => void }

export function releaseActions({ state, updateAgent }: StoreKit, { opsOf, updateOps }: OpsApi) {
  /** 线上指向切到新版本后：修复了关联 bad case 的线上干预自动失效，并写入操作记录。 */
  const settleInterventions = (agentId: string, targetId: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return;
    // 线上指向切换发生在同一轮更新里：用切换后的版本列表判断（评测记录在切换前后不变）
    updateOps(agentId, ops => {
      const fixed = ops.interventions.filter(item => interventionState(item) === '生效中' && fixesIntervention(agent, ops, item, targetId));
      if (!fixed.length) return ops;
      const at = nowStamp();
      const reason = `${targetId} 在 bad case 回归集上评测通过并成为线上版本`;
      return {
        ...ops,
        interventions: ops.interventions.map(item => fixed.includes(item) ? { ...item, ended: { at, by: '平台', reason, auto: true } } : item),
        approvals: [...fixed.map(item => ({ time: at, who: '平台', action: `线上干预 ${item.id} 自动失效：${reason}（关联 ${item.badcaseId}）` })), ...ops.approvals],
      };
    });
  };

  const markMonitored = (agentId: string) => updateAgent(agentId, agent => agent.monitored ? agent : { ...agent, monitored: true });

  /** 有进行中的灰度 / 影子运行时，不允许再发布新版本或回退：先放量完成或结束实验。 */
  const publishCandidate = (agentId: string) => {
    const before = state.agents.find(item => item.id === agentId);
    const target = before && !getExperiment(before) ? getCandidate(before) : null;
    updateAgent(agentId, agent => {
      if (getExperiment(agent)) return agent;
      const candidate = getCandidate(agent);
      if (!candidate || !candidate.configured || !candidate.debugged || !isEvaluated(candidate)) return agent;
      return { ...switchProduction(agent, candidate.id), stagingVersion: candidate.id };
    });
    if (target && target.configured && target.debugged && isEvaluated(target)) settleInterventions(agentId, target.id);
  };

  const rollbackTo = (agentId: string, versionId: string) => updateAgent(agentId, agent => {
    const target = agent.versions.find(version => version.id === versionId);
    return target && canRollbackTo(agent, target) && !getExperiment(agent) ? switchProduction(agent, versionId) : agent;
  });

  /** 比例灰度 / 影子运行：候选版本开始接流量，线上指向不变。 */
  const startExperiment = (agentId: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return;
    const ops = opsOf(agent);
    updateAgent(agentId, current => {
      const candidate = getCandidate(current);
      if (!candidate || !candidate.configured || !candidate.debugged || !isEvaluated(candidate) || getExperiment(current)) return current;
      const status = ops.strategy === 'shadow' ? '影子运行' as const : '灰度中' as const;
      const at = nowStamp();
      return { ...updateVersion(current, candidate.id, version => ({ ...version, status, traffic: status === '灰度中' ? ops.canaryPercent : undefined, experimentAt: at })), stagingVersion: candidate.id, lastReleaseAt: at };
    });
  };

  /** 放量：10 → 30 → 50 → 100；到 100% 时线上指向切换到灰度版本。 */
  const rampUp = (agentId: string) => {
    const before = state.agents.find(item => item.id === agentId)?.versions.find(version => version.status === '灰度中');
    updateAgent(agentId, agent => {
      const gray = agent.versions.find(version => version.status === '灰度中');
      if (!gray) return agent;
      const next = rampSteps.find(step => step > (gray.traffic ?? 0)) ?? 100;
      if (next >= 100) {
        const promoted = switchProduction(agent, gray.id);
        return updateVersion(promoted, gray.id, version => ({ ...version, traffic: undefined }));
      }
      return updateVersion(agent, gray.id, version => ({ ...version, traffic: next }));
    });
    if (before && (rampSteps.find(step => step > (before.traffic ?? 0)) ?? 100) >= 100) settleInterventions(agentId, before.id);
  };

  const shadowToCanary = (agentId: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return;
    const percent = opsOf(agent).canaryPercent;
    updateAgent(agentId, current => {
      const shadow = current.versions.find(version => version.status === '影子运行');
      return shadow ? updateVersion(current, shadow.id, version => ({ ...version, status: '灰度中', traffic: percent })) : current;
    });
  };

  /** 灰度中回退：实验流量全部切回线上版本，灰度版本退回「待发布」，需要重新审批。 */
  const stopExperiment = (agentId: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    const experiment = agent ? getExperiment(agent) : null;
    if (!agent || !experiment) return;
    updateAgent(agentId, current => ({ ...updateVersion(current, experiment.id, version => ({ ...version, status: '待发布', traffic: undefined })), lastReleaseAt: nowStamp(), monitored: false }));
    updateOps(agentId, ops => ops.approvedVersion === experiment.id ? { ...ops, approvedVersion: null } : ops);
  };

  /** 影子运行 / 灰度中的版本直接全量：线上指向切过去。 */
  const promoteExperiment = (agentId: string) => {
    const before = state.agents.find(item => item.id === agentId);
    const target = before ? getExperiment(before) : null;
    updateAgent(agentId, agent => {
      const experiment = getExperiment(agent);
      if (!experiment) return agent;
      return updateVersion(switchProduction(agent, experiment.id), experiment.id, version => ({ ...version, traffic: undefined }));
    });
    if (target) settleInterventions(agentId, target.id);
  };

  return { markMonitored, publishCandidate, rollbackTo, startExperiment, rampUp, shadowToCanary, stopExperiment, promoteExperiment };
}
