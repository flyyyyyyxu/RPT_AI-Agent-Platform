/** 各组操作共用的状态工具：读当前状态、按 Agent / 版本更新、切换线上指向。 */
import type { Dispatch, SetStateAction } from 'react';
import type { Agent, AgentVersion, DemoState } from '../../types/domain';
import { nowStamp } from '../rules/clock';

export interface StoreKit {
  state: DemoState;
  setState: Dispatch<SetStateAction<DemoState>>;
  updateAgent: (agentId: string, updater: (agent: Agent) => Agent) => void;
}

export function createKit(state: DemoState, setState: Dispatch<SetStateAction<DemoState>>): StoreKit {
  const updateAgent = (agentId: string, updater: (agent: Agent) => Agent) =>
    setState(previous => ({ ...previous, agents: previous.agents.map(agent => agent.id === agentId ? updater(agent) : agent) }));
  return { state, setState, updateAgent };
}

export const updateVersion = (agent: Agent, versionId: string, updater: (version: AgentVersion) => AgentVersion): Agent =>
  ({ ...agent, versions: agent.versions.map(version => version.id === versionId ? updater(version) : version) });

/** 线上指向切到目标版本：目标变「线上」，原线上版本变「历史」。发布、放量到 100%、回退都走这里。 */
export const switchProduction = (agent: Agent, targetId: string): Agent => ({
  ...agent,
  productionVersion: targetId,
  monitored: false,
  lastReleaseAt: nowStamp(),
  versions: agent.versions.map(version => {
    if (version.id === targetId) return { ...version, status: '线上', everOnline: true };
    if (version.id === agent.productionVersion) return { ...version, status: '历史' };
    return version;
  }),
});
