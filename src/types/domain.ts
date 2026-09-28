export type VersionStatus = '线上' | '灰度中' | '影子运行' | '待发布' | '草稿' | '历史';
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

/* ------------------------------------------------------------------ */
/* 生产骨架（① – ⑩）                                                    */
/* ------------------------------------------------------------------ */

export type ViewMode = 'basic' | 'skeleton';
export type ReleaseStrategy = 'direct' | 'canary' | 'shadow';
export type ExecMode = '在线' | '批量' | '会话';
export type ProblemStage = 'Prompt' | '知识' | '模型' | '工具' | '策略';

export interface GateRule { id: string; metric: string; op: '>=' | '<='; unit: string; threshold: number; value: number; note: string }
export interface RedlineSample { name: string; input: string; passed: boolean }
export interface GateProfile { rules: GateRule[]; redlines: RedlineSample[] }

export interface AbMetric { label: string; oldValue: number; newValue: number; unit: string; ci: [number, number]; higherIsBetter: boolean; decimals: number }
export interface AbProfile { experimentId: string; days: number; sample: string; metrics: AbMetric[]; conclusion: string }

export interface TraceStep {
  kind: '输入' | '检索' | '工具调用' | '生成' | '护栏检查' | '输出';
  name: string; ms: number; detail: string; depth: 0 | 1;
  evidence?: { entry: string; version: string; expired?: boolean }[];
  error?: string;
}
export interface TraceRecord { id: string; time: string; summary: string; version: string; status: '成功' | '异常'; steps: TraceStep[] }
export interface BadCase { id: string; source: '用户反馈' | '申诉' | '抽检'; time: string; summary: string; detail: string; traceId: string; version: string }

export interface ApprovalRecord { time: string; who: string; action: string }

export interface AgentSettings {
  execMode: ExecMode; qps: number; dailyQuota: number; degrade: string; handoffThreshold: number; alerts: boolean;
  guardrails: { format: boolean; citation: boolean; promise: boolean; safety: boolean };
  monthlyBudget: number; budgetAlert: number; overBudget: string;
}

/** 每个 Agent 的生产骨架演示状态；缺省时按 profile 生成默认值。 */
export interface AgentOps {
  thresholds: Record<string, number>;
  forceBlock: boolean;
  strategy: ReleaseStrategy;
  canaryPercent: number;
  sticky: boolean;
  approvalPending: string | null;
  approvedVersion: string | null;
  approvals: ApprovalRecord[];
  settings: AgentSettings;
  badcases: Record<string, { stage: ProblemStage | null; inEvalSet: boolean }>;
}

export interface DemoState {
  schema: 3;
  agents: Agent[];
  team: string;
  viewMode: ViewMode;
  ops: Record<string, AgentOps>;
}
