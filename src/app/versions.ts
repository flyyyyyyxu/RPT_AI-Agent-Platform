import type { Agent, AgentVersion, DemoState } from '../types/domain';
import { DEMO_NOW } from '../data/mock';

/** 候选版本：唯一可编辑、可评测、可发布的版本（草稿或待发布）。 */
export const getCandidate = (agent: Agent) => agent.versions.find(version => version.status === '草稿' || version.status === '待发布') ?? null;
/** 进行中的实验：比例灰度或影子运行的版本（同一时间最多一个）。 */
export const getExperiment = (agent: Agent) => agent.versions.find(version => version.status === '灰度中' || version.status === '影子运行') ?? null;
export const getProduction = (agent: Agent) => agent.versions.find(version => version.id === agent.productionVersion) ?? null;
export const getVersion = (agent: Agent, id: string | null | undefined) => agent.versions.find(version => version.id === id) ?? null;
export const isEditable = (version: AgentVersion) => version.status === '草稿' || version.status === '待发布';
export const isEvaluated = (version: AgentVersion) => version.evaluatedDatasets.length > 0;

/** 页面默认聚焦的版本：有候选版本时看候选，否则看线上。 */
export const focusVersion = (agent: Agent) => getCandidate(agent) ?? getProduction(agent) ?? agent.versions[0];

/** 回退目标：曾经上线过、且不是当前线上指向的版本。草稿、灰度、待发布都不能「回退」过去。 */
export const canRollbackTo = (agent: Agent, version: AgentVersion) => version.everOnline && version.id !== agent.productionVersion;

export const nextVersionId = (agent: Agent) => `v${Math.max(0, ...agent.versions.map(version => Number(version.id.slice(1)) || 0)) + 1}`;

/** 上一个曾上线的版本（用于调用日志里较早的请求）。 */
export const previousOnline = (agent: Agent) => agent.versions.find(version => version.everOnline && version.id !== agent.productionVersion) ?? null;

export type StepState = '已完成' | '进行中' | '可查看' | '未开始';

/**
 * 生命周期状态：构建、评测、发布按「本次迭代」（候选版本）计算；
 * 监控和 Trace 看的是线上版本，只要有线上版本就可以查看，不受候选版本影响。
 */
export function lifecycleState(agent: Agent): Record<string, StepState> {
  const candidate = getCandidate(agent);
  const online = Boolean(agent.productionVersion);
  const experiment = getExperiment(agent);
  const done = (value: boolean): StepState => value ? '已完成' : '未开始';
  return {
    build: candidate ? done(candidate.configured && candidate.debugged) : done(online),
    evaluation: candidate ? done(isEvaluated(candidate)) : done(online),
    release: experiment ? '进行中' : candidate ? '未开始' : done(online),
    monitor: !online ? '未开始' : agent.monitored ? '已完成' : '可查看',
    trace: online ? '可查看' : '未开始',
  };
}

/* ---------------- 演示时钟 ----------------
 * 所有操作时间都用演示时钟，和 mock 数据处在同一天：从 DEMO_NOW 开始，每次操作前进 1 分钟。
 * 读取存档时对齐到存档里最晚的操作时间，保证时间不倒流。 */
const STAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
const parseStamp = (stamp: string) => { const m = STAMP.exec(stamp); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN; };
const formatStamp = (ms: number) => { const d = new Date(ms); const pad = (v: number) => String(v).padStart(2, '0'); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
let clock = parseStamp(DEMO_NOW);

/** 当前演示时间（不前进）。知识条目的生效 / 失效状态按它计算。 */
export const demoNow = () => formatStamp(clock);
/** 记录一次操作的时间：演示时钟前进 1 分钟。 */
export function nowStamp() { clock += 60_000; return formatStamp(clock); }
/** 读取存档或重置时对齐时钟：只看操作类时间（发布、审批、版本更新），不看知识条目的未来生效时间。 */
export function syncClock(state: DemoState) {
  const stamps = [
    ...state.agents.flatMap(agent => [agent.lastReleaseAt ?? '', ...agent.versions.map(version => version.updatedAt)]),
    ...Object.values(state.ops).flatMap(ops => ops.approvals.map(item => item.time)),
    ...Object.values(state.knowledge).flatMap(kb => kb.versions.map(version => version.publishedAt)),
  ].map(parseStamp).filter(value => !Number.isNaN(value));
  clock = Math.max(parseStamp(DEMO_NOW), ...stamps);
}
