/**
 * 统一取数：页面只通过这里读 mock，演示剧本（pa / pb / pc）在这里替换数据，页面和组件不变。
 */
import {
  abProfiles, approverFor, badCaseProfiles, baseOf, batchPresets, gateProfiles, knowledgeBases, pbDatasets, pbEvalTrace, pbGate, pbOldClause,
  pbPolicyKb, pcAftersaleKb, pendingEntries, debugProfiles, datasetProfiles, scenarioOverrides, traceProfiles, upstreamChanges,
} from '../../data';
import { addMinutes, demoNow } from '../rules/clock';
import type { AbProfile, Agent, AgentOps, DebugPreset, AgentVersion, AlertDef, AssetRecord, AssetState, BadCase, DemoState, EvalDataset, EvalsetContent, GateProfile, KnowledgeBase, KnowledgeEntry, ToolContent, TraceRecord } from '../../types/domain';

const scenario = (agent: Agent) => agent.profile === 'pa' || agent.profile === 'pb' || agent.profile === 'pc' ? scenarioOverrides[agent.profile] : null;

/** B 剧本：v8 是否仍在 Prompt 示例里引用旧条款。 */
const pbState = (version: AgentVersion | null) => {
  if (!version || !/2026-10/.test(version.config.knowledge)) return 'legacy' as const;
  return version.config.prompt.includes(pbOldClause) ? 'unfixed' as const : 'fixed' as const;
};

export const debugPresets = (agent: Agent) => debugProfiles[baseOf(agent.profile)];

/**
 * 本轮问题的调试预设：用 bad case 原话调试。fixed = 调优对象对应的配置已经改过（由调用方判断）：
 * 改过时按期望输出回答（有预置回归样本时用它的新回答），没改时复现当时的输出和异常步骤（演示数据）。
 */
export function badcasePreset(agent: Agent, badcase: BadCase, fixed: boolean): DebugPreset {
  const trace = badcaseTrace(agent, badcase);
  const answer = fixed ? badcase.evalCase?.newAnswer ?? `预期回答：${badcase.expected}` : badcase.evalCase?.oldAnswer ?? badcase.output;
  const fmt = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
  /* 修好之后：出错的那一步按正常耗时执行、不再报错；生成一步的输出换成新回答，避免步骤和回答对不上 */
  const steps = (trace?.steps ?? []).filter(step => step.kind !== '输入' && step.kind !== '输出').map(step => {
    const ms = fixed && step.error ? Math.min(step.ms, 500) : step.ms;
    if (!fixed) return { step: `${step.kind} · ${step.name}`, duration: fmt(ms), summary: step.error ? `仍复现：${step.error}` : step.detail, detail: step.detail };
    if (step.error) return { step: `${step.kind} · ${step.name}`, duration: fmt(ms), summary: '已按修改后的配置执行，未再出现异常', detail: `修改前：${step.error}` };
    if (step.kind === '生成') return { step: `${step.kind} · ${step.name}`, duration: fmt(ms), summary: '按修改后的配置生成回答', detail: `输出：${answer}` };
    return { step: `${step.kind} · ${step.name}`, duration: fmt(ms), summary: step.detail, detail: step.detail };
  });
  const total = (trace?.steps ?? []).reduce((sum, step) => sum + (fixed && step.error ? Math.min(step.ms, 500) : step.ms), 0);
  return { question: badcase.input, answer, totalDuration: `${(total / 1000).toFixed(2)}s`, steps };
}

export function gateFor(agent: Agent, version: AgentVersion | null): GateProfile {
  if (agent.profile === 'pb') { const s = pbState(version); if (s !== 'legacy') return pbGate[s]; }
  return gateProfiles[baseOf(agent.profile)];
}

/**
 * 评测集：B 剧本按修正前后切换；加入回归集（或纳入本轮优化）的 bad case 汇成「bad case 回归集」。
 * 传入 assets 时叠加资产中心的修改：预置评测集追加新版本的样本，并加上为该 Agent 新建的评测集。
 */
export function datasetsFor(agent: Agent, version: AgentVersion | null, ops: AgentOps, assets?: AssetState): EvalDataset[] {
  let datasets = datasetProfiles[baseOf(agent.profile)];
  if (agent.profile === 'pb') { const s = pbState(version); if (s !== 'legacy') datasets = pbDatasets(s === 'fixed'); }
  // 没有预置回归样本的 bad case，按问题摘要生成一条（演示数据）
  const added = badcasesFor(agent).filter(item => ops.badcases[item.id]?.inEvalSet).map(item => {
    const expected = ops.badcases[item.id]?.expected?.trim() || item.expected;
    return item.evalCase ? { ...item.evalCase, expected } : {
      name: `${item.summary}（来自 ${item.id}）`, input: item.input, expected,
      oldScore: 40, newScore: 90, oldAnswer: item.output, newAnswer: '修复后的回答符合期望输出（演示数据）',
    };
  });
  const all = added.length ? [{ id: 'badcase', name: 'bad case 回归集', description: '由 bad case 工作台加入的样本', cases: added }, ...datasets] : datasets;
  if (!assets) return all;
  const latest = (record: AssetRecord<EvalsetContent>) => record.versions.find(item => item.status === '已发布');
  const merged = all.map(dataset => {
    const record = assets.evalsets.find(item => item.key === `${agent.id}:${dataset.id}`);
    const published = record && latest(record);
    return record && published ? { ...dataset, name: record.name, description: record.description, cases: [...dataset.cases, ...published.content.addedCases] } : dataset;
  });
  const created = assets.evalsets.filter(item => item.created && item.agentId === agent.id).flatMap(record => { const published = latest(record); return published && record.datasetId ? [{ id: record.datasetId, name: record.name, description: record.description, cases: published.content.addedCases }] : []; });
  return [...merged, ...created];
}

export const batchFor = (agent: Agent) => batchPresets[baseOf(agent.profile)];
export const abFor = (agent: Agent): AbProfile => scenario(agent)?.ab ?? abProfiles[baseOf(agent.profile)] ?? abProfiles.general;
export const approverOf = (agent: Agent) => approverFor[baseOf(agent.profile)];
/** 上线后才产生的记录：按版本实际开始灰度的时间计时；版本还没灰度过时不出现。 */
function afterRelease<T extends { version: string; time: string; afterRelease?: number }>(agent: Agent, items: T[]): T[] {
  return items.flatMap(item => {
    if (item.afterRelease === undefined) return [item];
    const at = agent.versions.find(version => version.id === item.version)?.experimentAt;
    return at ? [{ ...item, time: addMinutes(at, item.afterRelease) }] : [];
  });
}

export const alertsFor = (agent: Agent): AlertDef[] => afterRelease(agent, scenario(agent)?.alerts ?? []);

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
  // 没有演示数据的 Agent（如空白模板新建）返回空列表，页面显示空状态，不借用其它 Agent 的记录
  return afterRelease(agent, scenario(agent)?.traces ?? traceProfiles[baseOf(agent.profile)]);
}

/** bad case 只来自真正服务过流量的版本：草稿 / 待发布版本还没有线上请求 */
export function badcasesFor(agent: Agent): BadCase[] {
  // 版本开始灰度的时间晚于这条 bad case（例如剧本里现场新建并灰度的版本）：那时它还没服务过用户，不会有这条反馈
  const served = (item: BadCase) => { const version = agent.versions.find(entry => entry.id === item.version); return Boolean(version && (version.everOnline || version.status === '灰度中' || version.status === '影子运行' || version.status === '线上') && (!version.experimentAt || version.experimentAt <= item.time)); };
  return (scenario(agent)?.badcases ?? badCaseProfiles[baseOf(agent.profile)]).filter(served);
}

/**
 * bad case 关联的 Trace：生产 Trace 列表里有就用它；没有时按这类 Agent 的标准链路生成，把出问题的那一步标出来（演示数据）。
 */
export function badcaseTrace(agent: Agent, badcase: BadCase): TraceRecord | null {
  const existing = tracesFor(agent).find(item => item.id === badcase.traceId);
  if (existing) return existing;
  const skeleton = traceProfiles[baseOf(agent.profile)].find(item => item.status === '成功');
  if (!skeleton) return null;
  const target = skeleton.steps.findIndex(step => step.kind === badcase.step.kind && (!badcase.step.match || step.name.includes(badcase.step.match)));
  const steps = skeleton.steps.map((step, index) => {
    if (index === target) return { ...step, detail: badcase.step.detail ?? step.detail, ms: badcase.step.ms ?? step.ms, evidence: badcase.step.evidence ?? step.evidence, error: badcase.step.issue };
    if (step.kind === '输出') return { ...step, detail: `${badcase.output} · 随后产生${badcase.source}` };
    return step;
  });
  return { id: badcase.traceId, time: addMinutes(badcase.time, -3), summary: badcase.input, version: badcase.version, status: '异常', env: '生产', steps };
}

/* ---------------- 知识库 ---------------- */

/** 当前知识库列表：剧本 Agent 在场时换成剧本版本，已发布的新版本覆盖 mock。 */
export function knowledgeBasesFor(state: DemoState): KnowledgeBase[] {
  const profilesInUse = new Set(state.agents.map(agent => agent.profile));
  const base = knowledgeBases.map(kb => {
    if (state.knowledge[kb.id]) return state.knowledge[kb.id];
    if (kb.id === 'policy' && profilesInUse.has('pb')) return pbPolicyKb;
    if (kb.id === 'aftersale' && profilesInUse.has('pc')) return pcAftersaleKb;
    return kb;
  });
  /* 资产中心新建的知识库 */
  const created = Object.values(state.knowledge).filter(kb => !knowledgeBases.some(item => item.id === kb.id));
  return [...base, ...created];
}
export const pendingFor = (kbId: string) => pendingEntries[kbId] ?? [];

export type EntryStatus = '生效中' | '已失效' | '待生效';
export const entryStatus = (entry: Pick<KnowledgeEntry, 'from' | 'to'>): EntryStatus =>
  entry.to && entry.to < demoNow() ? '已失效' : entry.from > demoNow() ? '待生效' : '生效中';

export const nextKbVersion = (id: string) => { const match = /^v(\d+)$/.exec(id); return match ? `v${Number(match[1]) + 1}` : `${id} 修订`; };

export interface UpstreamChange { latest: string; at: string; note: string }
/** 依赖是否有上游更新：知识按知识库最新版本判断，工具按工具目录判断。 */
/**
 * 依赖的上游更新：知识库看最新发布的知识版本；工具看资产中心里最新「已发布」的版本（审核中的不算）。
 * 传入 tools 时以资产中心为准，否则退回静态数据。
 */
export function upstreamFor(name: string, kbs: KnowledgeBase[], tools?: AssetRecord<ToolContent>[]): UpstreamChange | null {
  for (const kb of kbs) {
    if (!kb.versions.some(version => `${kb.name} ${version.id}` === name)) continue;
    const latest = kb.versions[0];
    return `${kb.name} ${latest.id}` === name ? null : { latest: `${kb.name} ${latest.id}`, at: latest.publishedAt, note: latest.note ?? '知识库已发布新版本' };
  }
  const match = /^(.+) (v\d+)$/.exec(name);
  const tool = match && tools?.find(item => item.name === match[1]);
  if (match && tool) {
    const latest = tool.versions.find(version => version.status === '已发布');
    if (!latest || latest.id === match[2] || versionNumber(latest.id) < versionNumber(match[2])) return null;
    return { latest: `${tool.name} ${latest.id}`, at: latest.at, note: latest.note };
  }
  return upstreamChanges[name] ?? null;
}
const versionNumber = (id: string) => Number(/^v(\d+)$/.exec(id)?.[1] ?? 0);
