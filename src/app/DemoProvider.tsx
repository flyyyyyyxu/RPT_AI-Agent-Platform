import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialDemoState } from '../data/mock';
import type { Agent, AgentConfig, DemoState } from '../types/domain';
import { clearDemo, readDemo, writeDemo } from './storage';

interface DemoContextValue {
  state: DemoState;
  setTeam: (team: string) => void;
  createAgent: (input: { name: string; description: string; template: string; config: AgentConfig }) => Agent;
  updateConfig: (agentId: string, config: AgentConfig) => void;
  markConfigured: (agentId: string) => void;
  markDebugged: (agentId: string, question: string) => void;
  markEvaluated: (agentId: string) => void;
  markMonitored: (agentId: string) => void;
  publishAgent: (agentId: string, version: string) => void;
  rollbackAgent: (agentId: string, version: string) => void;
  reset: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => readDemo() ?? structuredClone(initialDemoState));
  useEffect(() => writeDemo(state), [state]);
  const setTeam = (team: string) => setState(previous => ({ ...previous, team }));
  const createAgent: DemoContextValue['createAgent'] = ({ name, description, config }) => {
    const id = `agent-${Date.now()}`;
    const agent: Agent = { id, name, owner: '李一宁', team: '企业服务', level: '原型', mode: description || '在线 · 多轮', costThisMonth: 0, productionVersion: 'v0', metrics: ['回答采纳率', 'P95 延迟'], versions: [{ id: 'v1', status: '草稿', updatedAt: '2026-09-28 16:13', note: '初始配置' }, { id: 'v0', status: '线上', updatedAt: '2026-09-28 16:13', note: '尚未发布' }] };
    setState(previous => ({ ...previous, agents: [...previous.agents, agent], runtimes: { ...previous.runtimes, [id]: { config, configured: true, debugged: false, evaluated: false, published: false, monitored: false, environments: { development: 'v1', staging: 'v0', production: 'v0' }, lastDebugQuestion: '' } } }));
    return agent;
  };
  const updateRuntime = (agentId: string, updater: (runtime: DemoState['runtimes'][string]) => DemoState['runtimes'][string]) => setState(previous => ({ ...previous, runtimes: { ...previous.runtimes, [agentId]: updater(previous.runtimes[agentId]) } }));
  const updateConfig = (agentId: string, config: AgentConfig) => updateRuntime(agentId, runtime => ({ ...runtime, config }));
  const markConfigured = (agentId: string) => updateRuntime(agentId, runtime => ({ ...runtime, configured: true }));
  const markDebugged = (agentId: string, question: string) => updateRuntime(agentId, runtime => ({ ...runtime, debugged: true, lastDebugQuestion: question }));
  const markEvaluated = (agentId: string) => updateRuntime(agentId, runtime => ({ ...runtime, evaluated: true }));
  const markMonitored = (agentId: string) => updateRuntime(agentId, runtime => ({ ...runtime, monitored: true }));
  const pointProduction = (agentId: string, version: string, published: boolean) => setState(previous => ({
    ...previous,
    agents: previous.agents.map(agent => agent.id !== agentId ? agent : { ...agent, productionVersion: version, versions: agent.versions.map(item => ({ ...item, status: item.id === version ? '线上' : item.status === '线上' ? '草稿' : item.status })) }),
    runtimes: { ...previous.runtimes, [agentId]: { ...previous.runtimes[agentId], published, environments: { ...previous.runtimes[agentId].environments, production: version, staging: version } } },
  }));
  const publishAgent = (agentId: string, version: string) => pointProduction(agentId, version, true);
  const rollbackAgent = (agentId: string, version: string) => pointProduction(agentId, version, true);
  const reset = () => { clearDemo(); setState(structuredClone(initialDemoState)); };
  return <DemoContext.Provider value={{ state, setTeam, createAgent, updateConfig, markConfigured, markDebugged, markEvaluated, markMonitored, publishAgent, rollbackAgent, reset }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider is missing');
  return context;
}
