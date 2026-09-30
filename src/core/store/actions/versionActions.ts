/** 构建与评测：新建 Agent、保存配置、新建草稿、调试、评测、依赖升级、代改配置。 */
import type { Agent, AgentConfig, ProfileId } from '../../../types/domain';
import { demoNow, nowStamp } from '../../rules/clock';
import { getCandidate, isEditable, nextVersionId } from '../../rules/versions';
import { updateVersion, type StoreKit } from '../kit';

const same = (a: AgentConfig, b: AgentConfig) => JSON.stringify(a) === JSON.stringify(b);

export interface CreateAgentInput { name: string; mode: string; profile: ProfileId; config: AgentConfig; team: string }

export function versionActions({ state, setState, updateAgent }: StoreKit) {
  /** 新建候选版本时，把还没挂上版本的优化目标挂上去（本轮优化目标） */
  const attachGoals = (agentId: string, versionId: string) => setState(previous => {
    const ops = previous.ops[agentId];
    if (!ops?.goals?.some(goal => goal.version === null)) return previous;
    return { ...previous, ops: { ...previous.ops, [agentId]: { ...ops, goals: ops.goals.map(goal => goal.version === null ? { ...goal, version: versionId } : goal) } } };
  });

  const createAgent = ({ name, mode, profile, config, team }: CreateAgentInput): Agent => {
    const agent: Agent = {
      id: `agent-${Date.now()}`, name, owner: '李一宁', team, level: '原型', mode, costThisMonth: 0,
      productionVersion: null, stagingVersion: null, profile, monitorProfile: 'fresh', headline: [], monitored: false, lastReleaseAt: null, lastDebugQuestion: '',
      versions: [{ id: 'v1', status: '草稿', updatedAt: nowStamp(), note: '初始配置', config, everOnline: false, configured: false, debugged: false, evaluatedDatasets: [] }],
    };
    setState(previous => ({ ...previous, agents: [...previous.agents, agent] }));
    return agent;
  };

  /**
   * 保存为候选版本：把工作草稿写入版本快照。
   * 配置一旦变化，评测结果失效、「待发布」退回「草稿」；调试结果只有在调试的正是这份草稿时才保留。
   */
  const saveConfig = (agentId: string, versionId: string, config: AgentConfig) => updateAgent(agentId, agent => updateVersion(agent, versionId, version => {
    if (!isEditable(version)) return version;
    const { draft: _draft, ...rest } = version;
    if (same(version.config, config)) return { ...rest, configured: true };
    const debugged = Boolean(version.draft && version.draft.debugged && same(version.draft.config, config));
    return { ...rest, config: structuredClone(config), configured: true, debugged, evaluatedDatasets: [], evaluatedBadcases: undefined, status: '草稿', updatedAt: nowStamp() };
  }));

  /**
   * 自动保存工作草稿：不改变版本快照、不推进演示时钟。
   * base 与版本更新时间不一致说明版本已被页面外修改（依赖升级、代改），旧表单的草稿直接丢弃。
   */
  const saveDraft = (agentId: string, versionId: string, config: AgentConfig, base: string) => updateAgent(agentId, agent => updateVersion(agent, versionId, version => {
    if (!isEditable(version) || version.updatedAt !== base) return version;
    if (same(version.config, config)) { if (!version.draft) return version; const { draft: _draft, ...rest } = version; return rest; }
    if (version.draft && same(version.draft.config, config)) return version;
    return { ...version, draft: { config: structuredClone(config), savedAt: demoNow(), debugged: false, base } };
  }));

  const createDraft = (agentId: string, fromVersionId: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return fromVersionId;
    const existing = getCandidate(agent);
    if (existing) return existing.id;
    const source = agent.versions.find(version => version.id === fromVersionId) ?? agent.versions[0];
    const id = nextVersionId(agent);
    updateAgent(agentId, current => ({ ...current, versions: [{ id, status: '草稿', updatedAt: nowStamp(), note: `基于 ${source.id} 修改`, config: structuredClone(source.config), everOnline: false, configured: false, debugged: false, evaluatedDatasets: [] }, ...current.versions] }));
    attachGoals(agentId, id);
    return id;
  };

  /**
   * 调试：调试的是当前工作副本（有草稿就是草稿，否则是已保存的配置），无需先保存。
   * 调试期间配置又被改动时（工作副本已不是被调试的那份）不记为已调试。
   */
  const markDebugged = (agentId: string, versionId: string, question: string, config?: AgentConfig) => updateAgent(agentId, agent => {
    const next = { ...agent, lastDebugQuestion: question };
    return updateVersion(next, versionId, version => {
      if (!isEditable(version)) return version;
      const working = version.draft?.config ?? version.config;
      if (config && !same(working, config)) return version;
      return version.draft ? { ...version, draft: { ...version.draft, debugged: true } } : { ...version, debugged: true };
    });
  });

  /** badcaseIds：在 bad case 回归集上评测时，集里当时有哪些 bad case（之后新加入的需要重新评测） */
  const markEvaluated = (agentId: string, versionId: string, datasetId: string, badcaseIds?: string[]) => updateAgent(agentId, agent => updateVersion(agent, versionId, version => {
    if (!isEditable(version) || !version.configured || !version.debugged) return version;
    const datasets = version.evaluatedDatasets.includes(datasetId) ? version.evaluatedDatasets : [...version.evaluatedDatasets, datasetId];
    return badcaseIds ? { ...version, evaluatedDatasets: datasets, evaluatedBadcases: badcaseIds } : { ...version, evaluatedDatasets: datasets };
  }));

  /** 依赖升级：基于某个快照创建候选版本并替换为最新依赖（已保存，仍需调试和评测）。 */
  const createUpgradedDraft = (agentId: string, fromVersionId: string, patch: Partial<AgentConfig>, note: string) => {
    const agent = state.agents.find(item => item.id === agentId);
    if (!agent) return fromVersionId;
    const existing = getCandidate(agent);
    if (existing) return existing.id;
    const source = agent.versions.find(version => version.id === fromVersionId) ?? agent.versions[0];
    const id = nextVersionId(agent);
    updateAgent(agentId, current => ({ ...current, versions: [{ id, status: '草稿', updatedAt: nowStamp(), note, config: { ...structuredClone(source.config), ...patch }, everOnline: false, configured: true, debugged: false, evaluatedDatasets: [] }, ...current.versions] }));
    attachGoals(agentId, id);
    return id;
  };

  /** 直接写入修改后的配置（剧本「代我修改」）：等同于保存，调试和评测需要重新运行。 */
  const applyFix = (agentId: string, versionId: string, config: AgentConfig) => updateAgent(agentId, agent => updateVersion(agent, versionId, version => {
    if (!isEditable(version)) return version;
    const { draft: _draft, ...rest } = version;
    return { ...rest, config: structuredClone(config), status: '草稿', configured: true, debugged: false, evaluatedDatasets: [], evaluatedBadcases: undefined, updatedAt: nowStamp() };
  }));

  return { createAgent, saveConfig, saveDraft, createDraft, markDebugged, markEvaluated, createUpgradedDraft, applyFix };
}
