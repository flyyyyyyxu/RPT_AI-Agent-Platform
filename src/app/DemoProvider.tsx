import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialDemoState } from '../data/mock';
import type { Agent, AgentConfig, AgentVersion, DemoState, ProfileId } from '../types/domain';
import { clearDemo, readDemo, writeDemo } from './storage';
import { canRollbackTo, getCandidate, isEditable, isEvaluated, nextVersionId, nowStamp } from './versions';

interface CreateAgentInput { name: string; mode: string; profile: ProfileId; config: AgentConfig; team: string }

interface DemoContextValue {
  state: DemoState;
  setTeam: (team: string) => void;
  createAgent: (input: CreateAgentInput) => Agent;
  saveConfig: (agentId: string, versionId: string, config: AgentConfig) => void;
  createDraft: (agentId: string, fromVersionId: string) => string;
  markDebugged: (agentId: string, versionId: string, question: string) => void;
  markEvaluated: (agentId: string, versionId: string, datasetId: string) => void;
  markMonitored: (agentId: string) => void;
  publishCandidate: (agentId: string) => void;
  rollbackTo: (agentId: string, versionId: string) => void;
  reset: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const fresh = () => structuredClone(initialDemoState);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => readDemo() ?? fresh());
  useEffect(() => writeDemo(state), [state]);

  const updateAgent = (agentId: string, updater: (agent: Agent) => Agent) =>
    setState(previous => ({ ...previous, agents: previous.agents.map(agent => agent.id === agentId ? updater(agent) : agent) }));
  const updateVersion = (agent: Agent, versionId: string, updater: (version: AgentVersion) => AgentVersion): Agent =>
    ({ ...agent, versions: agent.versions.map(version => version.id === versionId ? updater(version) : version) });

  const setTeam = (team: string) => setState(previous => ({ ...previous, team }));

  const createAgent: DemoContextValue['createAgent'] = ({ name, mode, profile, config, team }) => {
    const agent: Agent = {
      id: `agent-${Date.now()}`, name, owner: '李一宁', team, level: '原型', mode, costThisMonth: 0,
      productionVersion: null, stagingVersion: null, profile, monitorProfile: 'fresh', headline: [], monitored: false, lastReleaseAt: null, lastDebugQuestion: '',
      versions: [{ id: 'v1', status: '草稿', updatedAt: nowStamp(), note: '初始配置', config, everOnline: false, configured: false, debugged: false, evaluatedDatasets: [] }],
    };
    setState(previous => ({ ...previous, agents: [...previous.agents, agent] }));
    return agent;
  };

  const saveConfig: DemoContextValue['saveConfig'] = (agentId, versionId, config) => updateAgent(agentId, agent => updateVersion(agent, versionId, version => {
    if (!isEditable(version)) return version;
    const changed = JSON.stringify(version.config) !== JSON.stringify(config);
    // 配置一旦变化：调试和评测结果都失效，「待发布」退回「草稿」
    return changed
      ? { ...version, config: structuredClone(config), configured: true, debugged: false, evaluatedDatasets: [], status: '草稿', updatedAt: nowStamp() }
      : { ...version, configured: true };
  }));

  const createDraft: DemoContextValue['createDraft'] = (agentId, fromVersionId) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return fromVersionId;
    const existing = getCandidate(agent);
    if (existing) return existing.id;
    const source = agent.versions.find(version => version.id === fromVersionId) ?? agent.versions[0];
    const id = nextVersionId(agent);
    updateAgent(agentId, current => ({ ...current, versions: [{ id, status: '草稿', updatedAt: nowStamp(), note: `基于 ${source.id} 修改`, config: structuredClone(source.config), everOnline: false, configured: false, debugged: false, evaluatedDatasets: [] }, ...current.versions] }));
    return id;
  };

  const markDebugged: DemoContextValue['markDebugged'] = (agentId, versionId, question) => updateAgent(agentId, agent => {
    const next = { ...agent, lastDebugQuestion: question };
    return updateVersion(next, versionId, version => isEditable(version) && version.configured ? { ...version, debugged: true } : version);
  });

  const markEvaluated: DemoContextValue['markEvaluated'] = (agentId, versionId, datasetId) => updateAgent(agentId, agent => updateVersion(agent, versionId, version =>
    isEditable(version) && version.configured && version.debugged && !version.evaluatedDatasets.includes(datasetId)
      ? { ...version, evaluatedDatasets: [...version.evaluatedDatasets, datasetId] } : version));

  const markMonitored = (agentId: string) => updateAgent(agentId, agent => agent.monitored ? agent : { ...agent, monitored: true });

  const switchProduction = (agent: Agent, targetId: string): Agent => ({
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

  const publishCandidate = (agentId: string) => updateAgent(agentId, agent => {
    const candidate = getCandidate(agent);
    if (!candidate || !candidate.configured || !candidate.debugged || !isEvaluated(candidate)) return agent;
    return { ...switchProduction(agent, candidate.id), stagingVersion: candidate.id };
  });

  const rollbackTo = (agentId: string, versionId: string) => updateAgent(agentId, agent => {
    const target = agent.versions.find(version => version.id === versionId);
    return target && canRollbackTo(agent, target) ? switchProduction(agent, versionId) : agent;
  });

  const reset = () => { clearDemo(); setState(fresh()); };

  return <DemoContext.Provider value={{ state, setTeam, createAgent, saveConfig, createDraft, markDebugged, markEvaluated, markMonitored, publishCandidate, rollbackTo, reset }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider is missing');
  return context;
}
