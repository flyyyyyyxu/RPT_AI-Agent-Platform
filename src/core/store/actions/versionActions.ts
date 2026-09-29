/** 构建与评测：新建 Agent、保存配置、新建草稿、调试、评测、依赖升级、代改配置。 */
import type { Agent, AgentConfig, ProfileId } from '../../../types/domain';
import { nowStamp } from '../../rules/clock';
import { getCandidate, isEditable, nextVersionId } from '../../rules/versions';
import { updateVersion, type StoreKit } from '../kit';

export interface CreateAgentInput { name: string; mode: string; profile: ProfileId; config: AgentConfig; team: string }

export function versionActions({ state, setState, updateAgent }: StoreKit) {
  const createAgent = ({ name, mode, profile, config, team }: CreateAgentInput): Agent => {
    const agent: Agent = {
      id: `agent-${Date.now()}`, name, owner: '李一宁', team, level: '原型', mode, costThisMonth: 0,
      productionVersion: null, stagingVersion: null, profile, monitorProfile: 'fresh', headline: [], monitored: false, lastReleaseAt: null, lastDebugQuestion: '',
      versions: [{ id: 'v1', status: '草稿', updatedAt: nowStamp(), note: '初始配置', config, everOnline: false, configured: false, debugged: false, evaluatedDatasets: [] }],
    };
    setState(previous => ({ ...previous, agents: [...previous.agents, agent] }));
    return agent;
  };

  const saveConfig = (agentId: string, versionId: string, config: AgentConfig) => updateAgent(agentId, agent => updateVersion(agent, versionId, version => {
    if (!isEditable(version)) return version;
    const changed = JSON.stringify(version.config) !== JSON.stringify(config);
    // 配置一旦变化：调试和评测结果都失效，「待发布」退回「草稿」
    return changed
      ? { ...version, config: structuredClone(config), configured: true, debugged: false, evaluatedDatasets: [], status: '草稿', updatedAt: nowStamp() }
      : { ...version, configured: true };
  }));

  const createDraft = (agentId: string, fromVersionId: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return fromVersionId;
    const existing = getCandidate(agent);
    if (existing) return existing.id;
    const source = agent.versions.find(version => version.id === fromVersionId) ?? agent.versions[0];
    const id = nextVersionId(agent);
    updateAgent(agentId, current => ({ ...current, versions: [{ id, status: '草稿', updatedAt: nowStamp(), note: `基于 ${source.id} 修改`, config: structuredClone(source.config), everOnline: false, configured: false, debugged: false, evaluatedDatasets: [] }, ...current.versions] }));
    return id;
  };

  const markDebugged = (agentId: string, versionId: string, question: string) => updateAgent(agentId, agent => {
    const next = { ...agent, lastDebugQuestion: question };
    return updateVersion(next, versionId, version => isEditable(version) && version.configured ? { ...version, debugged: true } : version);
  });

  const markEvaluated = (agentId: string, versionId: string, datasetId: string) => updateAgent(agentId, agent => updateVersion(agent, versionId, version =>
    isEditable(version) && version.configured && version.debugged && !version.evaluatedDatasets.includes(datasetId)
      ? { ...version, evaluatedDatasets: [...version.evaluatedDatasets, datasetId] } : version));

  /** 依赖升级：基于某个快照创建候选版本并替换为最新依赖（已保存，仍需调试和评测）。 */
  const createUpgradedDraft = (agentId: string, fromVersionId: string, patch: Partial<AgentConfig>, note: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return fromVersionId;
    const existing = getCandidate(agent);
    if (existing) return existing.id;
    const source = agent.versions.find(version => version.id === fromVersionId) ?? agent.versions[0];
    const id = nextVersionId(agent);
    updateAgent(agentId, current => ({ ...current, versions: [{ id, status: '草稿', updatedAt: nowStamp(), note, config: { ...structuredClone(source.config), ...patch }, everOnline: false, configured: true, debugged: false, evaluatedDatasets: [] }, ...current.versions] }));
    return id;
  };

  /** 直接写入修改后的配置（剧本「代我修改」）：等同于保存，调试和评测需要重新运行。 */
  const applyFix = (agentId: string, versionId: string, config: AgentConfig) => updateAgent(agentId, agent => updateVersion(agent, versionId, version =>
    isEditable(version) ? { ...version, config: structuredClone(config), status: '草稿', configured: true, debugged: false, evaluatedDatasets: [], updatedAt: nowStamp() } : version));

  return { createAgent, saveConfig, createDraft, markDebugged, markEvaluated, createUpgradedDraft, applyFix };
}
