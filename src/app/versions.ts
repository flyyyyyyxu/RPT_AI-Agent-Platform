import type { Agent, AgentVersion } from '../types/domain';

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

export type StepProgress = '已完成' | '当前' | '未开始';

/** 生命周期完成度按「本次迭代」计算：有候选版本时看候选版本走到哪一步；没有候选版本时，线上版本的构建→发布都已完成。 */
export function lifecycleCompletion(agent: Agent): Record<string, boolean> {
  const candidate = getCandidate(agent);
  if (candidate) return { build: candidate.configured && candidate.debugged, evaluation: isEvaluated(candidate), release: false, monitor: false, trace: false };
  const online = Boolean(agent.productionVersion);
  return { build: online, evaluation: online, release: online, monitor: online && agent.monitored, trace: false };
}

export function nowStamp() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
