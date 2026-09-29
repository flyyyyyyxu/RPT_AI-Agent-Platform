/** 默认运营配置：把门槛、审批、设置组合成每个 Agent 的初始 AgentOps。 */
import type { AgentOps, BaseProfileId, ProfileId } from '../../types/domain';
import { gateProfiles } from './evaluation';
import { approvalsFor } from './release';
import { settingsFor } from './settings';

export const baseOf = (profile: ProfileId): BaseProfileId => profile === 'pa' ? 'a' : profile === 'pb' ? 'b' : profile === 'pc' ? 'c' : profile;

export function defaultOps(profile: ProfileId): AgentOps {
  const base = baseOf(profile);
  const gate = gateProfiles[base];
  const approval = approvalsFor[profile];
  return {
    thresholds: Object.fromEntries(gate.rules.map(rule => [rule.id, rule.threshold])),
    forceBlock: true,
    strategy: approval.strategy,
    canaryPercent: 10,
    sticky: true,
    approvalPending: approval.pending,
    approvedVersion: approval.approved,
    approvals: structuredClone(approval.approvals),
    settings: structuredClone(settingsFor[base]),
    badcases: {},
  };
}
