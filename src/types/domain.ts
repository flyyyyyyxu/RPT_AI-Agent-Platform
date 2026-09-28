export type VersionStatus = '线上' | '灰度中' | '待发布' | '草稿' | '历史';
export type AgentLevel = '原型' | '生产';
export type ProfileId = 'general' | 'a' | 'b' | 'c' | 'blank';
export type MonitorProfileId = ProfileId | 'fresh';

export type WorkflowStepType = '模型调用' | '检索' | '工具调用' | '代码节点';

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  description: string;
}

export interface AgentConfig {
  prompt: string;
  model: string;
  knowledge: string;
  tools: string[];
  outputFormat: string;
  steps: WorkflowStep[];
}

/** 版本 = 不可修改的快照。只有「草稿」可以编辑；线上、灰度、历史版本只读。 */
export interface AgentVersion {
  id: string;
  status: VersionStatus;
  updatedAt: string;
  note: string;
  config: AgentConfig;
  /** 是否曾经作为生产版本上线过：只有这类版本可以作为回退目标 */
  everOnline: boolean;
  traffic?: number;
  /** 以下三项只对候选版本（草稿 / 待发布）有意义 */
  configured: boolean;
  debugged: boolean;
  evaluatedDatasets: string[];
}

export interface HeadlineMetric { label: string; value: string }

export interface Agent {
  id: string;
  name: string;
  owner: string;
  team: string;
  level: AgentLevel;
  mode: string;
  costThisMonth: number;
  /** 线上指向；null 表示从未发布 */
  productionVersion: string | null;
  stagingVersion: string | null;
  versions: AgentVersion[];
  profile: ProfileId;
  monitorProfile: MonitorProfileId;
  headline: HeadlineMetric[];
  /** 最近一次发布 / 回退后是否已查看监控 */
  monitored: boolean;
  lastReleaseAt: string | null;
  lastDebugQuestion: string;
}

export interface DebugStepResult {
  step: string;
  duration: string;
  summary: string;
  detail: string;
}

export interface DebugPreset {
  question: string;
  answer: string;
  totalDuration: string;
  steps: DebugStepResult[];
}

export interface EvalCase {
  name: string;
  input: string;
  expected: string;
  oldScore: number;
  newScore: number;
  oldAnswer: string;
  newAnswer: string;
}

export interface EvalDataset {
  id: string;
  name: string;
  description: string;
  cases: EvalCase[];
}

export type MonitorMetricKey = 'calls' | 'p95' | 'errorRate' | 'tokens';
export interface MonitorPoint { label: string; calls: number; p95: number; errorRate: number; tokens: number }

export interface MonitorProfile {
  period: string;
  compareLabel: string;
  /** 与上一周期相比的变化；null 表示刚发布、没有可比周期 */
  changes: Record<MonitorMetricKey, { direction: 'up' | 'down'; value: string }> | null;
  series: MonitorPoint[];
  logs: { time: string; trace: string; status: '成功' | '失败'; latency: string; tokens: string }[];
}

export interface AgentProfile {
  debug: DebugPreset[];
  datasets: EvalDataset[];
}

export interface DemoState {
  schema: 2;
  agents: Agent[];
  team: string;
}
