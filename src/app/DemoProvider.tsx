import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultOps, initialDemoState, rampSteps } from '../data/mock';
import type { Agent, AgentConfig, AgentOps, AgentVersion, DemoState, ProfileId, ViewMode } from '../types/domain';
import { clearDemo, readDemo, writeDemo } from './storage';
import { canRollbackTo, getCandidate, getExperiment, isEditable, isEvaluated, nextVersionId, nowStamp } from './versions';

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
  /* 生产骨架 */
  setViewMode: (mode: ViewMode) => void;
  opsOf: (agent: Agent) => AgentOps;
  updateOps: (agentId: string, updater: (ops: AgentOps) => AgentOps) => void;
  startExperiment: (agentId: string) => void;
  rampUp: (agentId: string) => void;
  shadowToCanary: (agentId: string) => void;
  stopExperiment: (agentId: string) => void;
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

  /* ---------------- 生产骨架 ---------------- */
  const setViewMode = (viewMode: ViewMode) => setState(previous => ({ ...previous, viewMode }));
  const profileOf = (agentId: string) => state.agents.find(agent => agent.id === agentId)?.profile ?? 'general';
  const opsOf = (agent: Agent) => state.ops[agent.id] ?? defaultOps(agent.profile);
  const updateOps: DemoContextValue['updateOps'] = (agentId, updater) => setState(previous => {
    const agent = previous.agents.find(item => item.id === agentId);
    const current = previous.ops[agentId] ?? defaultOps(agent?.profile ?? profileOf(agentId));
    return { ...previous, ops: { ...previous.ops, [agentId]: updater(current) } };
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
      return { ...updateVersion(current, candidate.id, version => ({ ...version, status, traffic: status === '灰度中' ? ops.canaryPercent : undefined })), stagingVersion: candidate.id, lastReleaseAt: nowStamp() };
    });
  };

  /** 放量：10 → 30 → 50 → 100；到 100% 时线上指向切换到灰度版本。 */
  const rampUp = (agentId: string) => updateAgent(agentId, agent => {
    const gray = agent.versions.find(version => version.status === '灰度中');
    if (!gray) return agent;
    const next = rampSteps.find(step => step > (gray.traffic ?? 0)) ?? 100;
    if (next >= 100) {
      const promoted = switchProduction(agent, gray.id);
      return updateVersion(promoted, gray.id, version => ({ ...version, traffic: undefined }));
    }
    return updateVersion(agent, gray.id, version => ({ ...version, traffic: next }));
  });

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

  return <DemoContext.Provider value={{ state, setTeam, createAgent, saveConfig, createDraft, markDebugged, markEvaluated, markMonitored, publishCandidate, rollbackTo, reset, setViewMode, opsOf, updateOps, startExperiment, rampUp, shadowToCanary, stopExperiment }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider is missing');
  return context;
}
