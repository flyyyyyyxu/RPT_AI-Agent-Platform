export type VersionStatus = '线上' | '灰度中' | '影子运行' | '待发布' | '草稿' | '历史';
export type AgentLevel = '原型' | '生产';
export type BaseProfileId = 'general' | 'a' | 'b' | 'c' | 'blank';
/** 演示剧本专用的数据配置：页面不变，只换这套数据。 */
export type ScenarioProfileId = 'pa' | 'pb' | 'pc';
export type ProfileId = BaseProfileId | ScenarioProfileId;
export type MonitorProfileId = BaseProfileId | 'fresh';
export type PlaybookId = 'a' | 'b' | 'c';

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
  /** 开始比例灰度 / 影子运行的时间：上线后才产生的告警、Trace 按它计时 */
  experimentAt?: string;
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

/* ------------------------------------------------------------------ */
/* 生产能力：门槛、发布、实验、Trace、护栏、成本等                         */
/* ------------------------------------------------------------------ */

export type ReleaseStrategy = 'direct' | 'canary' | 'shadow';
export type ExecMode = '在线' | '批量' | '会话';
export type ProblemStage = 'Prompt' | '知识' | '模型' | '工具' | '策略';

export interface GateRule { id: string; metric: string; op: '>=' | '<='; unit: string; threshold: number; value: number; note: string }
export interface RedlineSample { name: string; input: string; passed: boolean }
export interface GateProfile { rules: GateRule[]; redlines: RedlineSample[] }

export interface AbMetric { label: string; oldValue: number; newValue: number; unit: string; ci: [number, number]; higherIsBetter: boolean; decimals: number; /** 上线门槛：新版本越过时标红 */ threshold?: number }
export interface AbProfile { experimentId: string; days: number; sample: string; metrics: AbMetric[]; conclusion: string }

export interface TraceStep {
  kind: '输入' | '检索' | '工具调用' | '生成' | '护栏检查' | '输出';
  name: string; ms: number; detail: string; depth: 0 | 1;
  evidence?: { entry: string; version: string; expired?: boolean }[];
  error?: string;
  /** 该版本新增的步骤 */
  isNew?: boolean;
}
/** afterRelease：这条记录在该版本开始灰度后第几分钟产生；版本还没上线时不显示，time 按实际灰度时间计算 */
export interface TraceRecord { id: string; time: string; summary: string; version: string; status: '成功' | '异常'; steps: TraceStep[]; env?: '生产' | '隔离评测'; note?: string; afterRelease?: number }
export interface BadCase { id: string; source: '用户反馈' | '申诉' | '抽检'; time: string; summary: string; detail: string; traceId: string; version: string; /** 加入评测集后生成的样本 */ evalCase?: EvalCase }

/** afterRelease：告警在该版本开始灰度后第几分钟触发；版本还没上线时不显示 */
export interface AlertDef { id: string; title: string; detail: string; time: string; version: string; notify: string; resolvedNote: string; afterRelease?: number }

export interface KnowledgeEntry { title: string; versions: string[]; from: string; to: string | null }
export interface KnowledgeVersion { id: string; publishedAt: string; usedBy: string[]; note?: string }
export interface KnowledgeBase { id: string; name: string; owner: string; description: string; versions: KnowledgeVersion[]; entries: KnowledgeEntry[] }
export interface PendingEntry { title: string; from: string; to: string | null; submittedBy: string }
export interface KbDraft { kbId: string; fromVersion: string; nextVersion: string; entries: { title: string; from: string; to: string | null; isNew?: boolean }[] }

export interface ApprovalRecord { time: string; who: string; action: string }

export interface AgentSettings {
  execMode: ExecMode; qps: number; dailyQuota: number; degrade: string; handoffThreshold: number; alerts: boolean;
  guardrails: { format: boolean; citation: boolean; promise: boolean; safety: boolean };
  monthlyBudget: number; budgetAlert: number; overBudget: string;
}

/** 每个 Agent 的运营配置演示状态；缺省时按 profile 生成默认值。 */
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
  schema: 5;
  agents: Agent[];
  ops: Record<string, AgentOps>;
  /** 已发布的知识库新版本（覆盖 mock） */
  knowledge: Record<string, KnowledgeBase>;
  kbDraft: KbDraft | null;
  /** collapsed：演示步骤浮层被用户收起成胶囊，换页、刷新后保持 */
  playbook: { id: PlaybookId; step: number; collapsed: boolean } | null;
}
