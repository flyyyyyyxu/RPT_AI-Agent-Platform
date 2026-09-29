/**
 * 资产中心取数：版本状态、被谁引用（决定能不能原地修改）、评测集的有效记录。
 * 引用关系都从 Agent 版本快照里实时算，不另存一份。
 */
import { evalsetDefaults } from '../../data';
import type { Agent, AgentOps, AgentVersion, AssetRecord, DemoState, EvalDataset, EvalsetContent, ModelContent, ToolContent } from '../../types/domain';

export const latestPublished = <C>(record: AssetRecord<C>) => record.versions.find(version => version.status === '已发布') ?? null;
export const pendingVersion = <C>(record: AssetRecord<C>) => record.versions.find(version => version.status === '审核中') ?? null;
/** v4 → v5；模型的版本号是权重日期，新版本由用户填写 */
export const nextAssetVersion = (id: string) => { const match = /^v(\d+)$/.exec(id); return match ? `v${Number(match[1]) + 1}` : ''; };

export interface AssetRef { agent: Agent; version: AgentVersion; pinned: string }

/** 工具：Agent 版本快照里写的是「工具名 vX」 */
export function toolRefs(state: DemoState, name: string): AssetRef[] {
  const pattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (v\\d+)$`);
  return state.agents.flatMap(agent => agent.versions.flatMap(version => version.config.tools.flatMap(item => { const match = pattern.exec(item); return match ? [{ agent, version, pinned: match[1] }] : []; })));
}

/** 模型：Agent 版本快照里写的是「名称 · 接入方式」，锁定的是当时的最新权重 */
export function modelRefs(state: DemoState, key: string, current: string): AssetRef[] {
  return state.agents.flatMap(agent => agent.versions.filter(version => version.config.model === key).map(version => ({ agent, version, pinned: current })));
}

/** 评测集：哪些 Agent 版本用它跑过评测（评测记录要能追溯，所以跑过的版本不能原地改样本） */
export function evalsetUsage(state: DemoState, agentId: string, datasetId: string) {
  const agent = state.agents.find(item => item.id === agentId);
  return agent ? agent.versions.filter(version => version.evaluatedDatasets.includes(datasetId)).map(version => ({ agent, version })) : [];
}

export const refText = (refs: { agent: Agent; version: AgentVersion }[]) => {
  const byAgent = new Map<string, string[]>();
  refs.forEach(ref => byAgent.set(ref.agent.name, [...(byAgent.get(ref.agent.name) ?? []), ref.version.id]));
  return [...byAgent].map(([name, ids]) => `${name} ${ids.join('、')}`).join('；');
};

export const evalsetKey = (agentId: string, datasetId: string) => `${agentId}:${datasetId}`;

/** 预置评测集还没被修改过时，按它的原始样本生成 v1 记录 */
export function effectiveEvalset(state: DemoState, agent: Agent, dataset: EvalDataset): AssetRecord<EvalsetContent> {
  const key = evalsetKey(agent.id, dataset.id);
  const stored = state.assets.evalsets.find(item => item.key === key);
  if (stored) return stored;
  const defaults = evalsetDefaults[dataset.id] ?? evalsetDefaults.base;
  return { key, agentId: agent.id, datasetId: dataset.id, name: dataset.name, description: dataset.description, team: agent.team, owner: dataset.id === 'badcase' ? defaults.owner : agent.owner, visibility: '本团队',
    versions: [{ id: 'v1', status: '已发布', at: defaults.at, by: dataset.id === 'badcase' ? 'bad case 工作台' : agent.owner, note: dataset.id === 'badcase' ? '由 bad case 工作台加入的样本自动生成' : '初始版本', content: { dimensions: defaults.dimensions, scoring: defaults.scoring, addedCases: [] } }] };
}

/** 资产中心 · 评测集列表：每个 Agent 当前可用的评测集（含新建的） */
export function evalsetRows(state: DemoState, datasetsOf: (agent: Agent) => EvalDataset[]) {
  return state.agents.flatMap(agent => datasetsOf(agent).map(dataset => ({ agent, dataset, record: effectiveEvalset(state, agent, dataset) })));
}

export type OpsOf = (agent: Agent) => AgentOps;

/* ------------------------------------------------------------------ */
/* 构建页的可选项：都来自资产中心，只列「已发布」的版本                    */
/* ------------------------------------------------------------------ */

/** 资产对某个团队是否可见：全公司 / 需审批 对所有团队可见；团队名或「本团队」只对对应团队可见 */
const visibleTo = (visibility: string, owningTeam: string, team: string) => visibility === '全公司' || visibility === '需审批' || visibility === team || (visibility === '本团队' && owningTeam === team);

export interface ToolChoice { record: AssetRecord<ToolContent>; versions: string[]; latest: string | null; pending: string | null }
/** 工具：对该团队可见的工具，加上配置里已经在用的（哪怕后来收回了可见范围）；hidden 为仅对其他团队开放的数量 */
export function toolChoices(state: DemoState, team: string, inUse: string[]) {
  const usedNames = new Set(inUse.map(item => item.replace(/ v\d+$/, '')));
  const rows: ToolChoice[] = [];
  let hidden = 0;
  for (const record of state.assets.tools) {
    const published = record.versions.filter(version => version.status === '已发布').map(version => version.id);
    if (!published.length && !usedNames.has(record.name)) continue;
    if (!visibleTo(record.visibility, record.team, team) && !usedNames.has(record.name)) { hidden += 1; continue; }
    rows.push({ record, versions: published, latest: published[0] ?? null, pending: pendingVersion(record)?.id ?? null });
  }
  return { rows, hidden };
}

export interface ModelChoice { key: string; record: AssetRecord<ModelContent> | null; weights: string | null }
/** 模型：资产中心里有已发布权重的模型；配置里在用、但资产中心已找不到的也保留，避免下拉框丢值 */
export function modelChoices(state: DemoState, inUse: string[]): ModelChoice[] {
  const rows: ModelChoice[] = state.assets.models.flatMap(record => { const latest = latestPublished(record); return latest ? [{ key: record.key, record, weights: latest.id }] : []; });
  inUse.filter(key => key !== '不启用' && !rows.some(row => row.key === key)).forEach(key => rows.push({ key, record: null, weights: null }));
  return rows;
}

/** Prompt 模板：最新已发布版本 */
export function promptChoices(state: DemoState) {
  return state.assets.prompts.flatMap(record => { const latest = latestPublished(record); return latest ? [{ record, version: latest }] : []; });
}
