/**
 * 统一取数：页面只通过这里读 mock，演示剧本（pa / pb / pc）在这里替换数据，页面和组件不变。
 */
import {
  abProfiles, approverFor, badCaseProfiles, baseOf, batchPresets, gateProfiles, knowledgeBases, pbDatasets, pbEvalTrace, pbGate, pbOldClause,
  pbPolicyKb, pcAftersaleKb, pendingEntries, profiles, scenarioOverrides, traceProfiles, upstreamChanges,
} from '../data/mock';
import { demoNow } from './versions';
import type { AbProfile, Agent, AgentOps, AgentVersion, AlertDef, BadCase, DemoState, EvalDataset, GateProfile, KnowledgeBase, KnowledgeEntry, TraceRecord } from '../types/domain';

const scenario = (agent: Agent) => agent.profile === 'pa' || agent.profile === 'pb' || agent.profile === 'pc' ? scenarioOverrides[agent.profile] : null;

/** B 剧本：v8 是否仍在 Prompt 示例里引用旧条款。 */
const pbState = (version: AgentVersion | null) => {
  if (!version || !/2026-10/.test(version.config.knowledge)) return 'legacy' as const;
  return version.config.prompt.includes(pbOldClause) ? 'unfixed' as const : 'fixed' as const;
};

export const debugPresets = (agent: Agent) => profiles[baseOf(agent.profile)].debug;

export function gateFor(agent: Agent, version: AgentVersion | null): GateProfile {
  if (agent.profile === 'pb') { const s = pbState(version); if (s !== 'legacy') return pbGate[s]; }
  return gateProfiles[baseOf(agent.profile)];
}

/** 评测集：B 剧本按修正前后切换；加入评测集的 bad case 汇成「bad case 回归集」。 */
export function datasetsFor(agent: Agent, version: AgentVersion | null, ops: AgentOps): EvalDataset[] {
  let datasets = profiles[baseOf(agent.profile)].datasets;
  if (agent.profile === 'pb') { const s = pbState(version); if (s !== 'legacy') datasets = pbDatasets(s === 'fixed'); }
  const added = badcasesFor(agent).filter(item => item.evalCase && ops.badcases[item.id]?.inEvalSet).map(item => item.evalCase!);
  return added.length ? [{ id: 'badcase', name: 'bad case 回归集', description: '由 bad case 工作台加入的样本', cases: added }, ...datasets] : datasets;
}

export const batchFor = (agent: Agent) => batchPresets[baseOf(agent.profile)];
export const abFor = (agent: Agent): AbProfile => scenario(agent)?.ab ?? abProfiles[baseOf(agent.profile)] ?? abProfiles.general;
export const approverOf = (agent: Agent) => approverFor[baseOf(agent.profile)];
export const alertsFor = (agent: Agent): AlertDef[] => scenario(agent)?.alerts ?? [];

export function tracesFor(agent: Agent): TraceRecord[] {
  if (agent.profile === 'pb') {
    /* 隔离评测的 Trace 只在评测跑过之后出现：
       修正前跑过评测 → 出现失败的 ev_v8_0931；修正后（评测结果已清空）只保留这条历史；
       修正后重新评测 → 再出现通过的 ev_v8_1004。 */
    const v8 = agent.versions.find(item => item.id === 'v8');
    const production = traceProfiles.b.map(trace => ({ ...trace, version: 'v7' }));
    const state = pbState(v8 ?? null);
    const evaluated = Boolean(v8?.evaluatedDatasets.length) || agent.productionVersion === 'v8' || v8?.status === '影子运行';
    if (!v8 || state === 'legacy') return production;
    if (state === 'unfixed') return evaluated ? [pbEvalTrace(false), ...production] : production;
    return evaluated ? [pbEvalTrace(true), pbEvalTrace(false), ...production] : [pbEvalTrace(false), ...production];
  }
  const own = scenario(agent)?.traces ?? traceProfiles[baseOf(agent.profile)];
  return own.length ? own : traceProfiles.general;
}

export function badcasesFor(agent: Agent): BadCase[] {
  const own = scenario(agent)?.badcases ?? badCaseProfiles[baseOf(agent.profile)];
  return own.length ? own : badCaseProfiles.general;
}

/* ---------------- 知识库 ---------------- */

/** 当前知识库列表：剧本 Agent 在场时换成剧本版本，已发布的新版本覆盖 mock。 */
export function knowledgeBasesFor(state: DemoState): KnowledgeBase[] {
  const profilesInUse = new Set(state.agents.map(agent => agent.profile));
  return knowledgeBases.map(kb => {
    if (state.knowledge[kb.id]) return state.knowledge[kb.id];
    if (kb.id === 'policy' && profilesInUse.has('pb')) return pbPolicyKb;
    if (kb.id === 'aftersale' && profilesInUse.has('pc')) return pcAftersaleKb;
    return kb;
  });
}
export const pendingFor = (kbId: string) => pendingEntries[kbId] ?? [];

export type EntryStatus = '生效中' | '已失效' | '待生效';
export const entryStatus = (entry: Pick<KnowledgeEntry, 'from' | 'to'>): EntryStatus =>
  entry.to && entry.to < demoNow() ? '已失效' : entry.from > demoNow() ? '待生效' : '生效中';

export const nextKbVersion = (id: string) => { const match = /^v(\d+)$/.exec(id); return match ? `v${Number(match[1]) + 1}` : `${id} 修订`; };

export interface UpstreamChange { latest: string; at: string; note: string }
/** 依赖是否有上游更新：知识按知识库最新版本判断，工具按工具目录判断。 */
export function upstreamFor(name: string, kbs: KnowledgeBase[]): UpstreamChange | null {
  for (const kb of kbs) {
    if (!kb.versions.some(version => `${kb.name} ${version.id}` === name)) continue;
    const latest = kb.versions[0];
    return `${kb.name} ${latest.id}` === name ? null : { latest: `${kb.name} ${latest.id}`, at: latest.publishedAt, note: latest.note ?? '知识库已发布新版本' };
  }
  return upstreamChanges[name] ?? null;
}
