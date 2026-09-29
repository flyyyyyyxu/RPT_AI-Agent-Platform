/** 每个 Agent 的运营配置：门槛 / 策略 / 审批 / 设置。 */
import { defaultOps } from '../../../data';
import type { Agent, AgentOps } from '../../../types/domain';
import type { StoreKit } from '../kit';

export function opsActions({ state, setState }: StoreKit) {
  const profileOf = (agentId: string) => state.agents.find(agent => agent.id === agentId)?.profile ?? 'general';
  /** 还没改过的 Agent 按 profile 生成默认值。 */
  const opsOf = (agent: Agent) => state.ops[agent.id] ?? defaultOps(agent.profile);
  const updateOps = (agentId: string, updater: (ops: AgentOps) => AgentOps) => setState(previous => {
    const agent = previous.agents.find(item => item.id === agentId);
    const current = previous.ops[agentId] ?? defaultOps(agent?.profile ?? profileOf(agentId));
    return { ...previous, ops: { ...previous.ops, [agentId]: updater(current) } };
  });
  return { opsOf, updateOps };
}
