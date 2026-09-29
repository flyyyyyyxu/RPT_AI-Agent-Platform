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

/** 记忆：会话内保留最近几轮（0 = 不记忆），长期偏好跨会话保存（脱敏标签） */
export interface AgentMemory { turns: number; preferences: boolean }

export interface AgentConfig {
  prompt: string;
  model: string;
  /** 备用模型：主模型超时或出错时切换（触发条件在设置页「降级策略」）；'不启用' 表示没有备用模型 */
  fallbackModel: string;
  knowledge: string;
  tools: string[];
  memory: AgentMemory;
  outputFormat: string;
  steps: WorkflowStep[];
}

/** 构建页的工作草稿：自动保存，不改变版本快照；「保存为候选版本」时写入 config。 */
export interface ConfigDraft {
  config: AgentConfig;
  savedAt: string;
  /** 这份草稿是否已经调试过（草稿再改动就失效） */
  debugged: boolean;
  /** 草稿基于的版本更新时间：版本被页面外修改（依赖升级、代改）后，旧草稿作废 */
  base: string;
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
  /** 未写入快照的工作草稿（只有草稿 / 待发布版本会有） */
  draft?: ConfigDraft;
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
  /** 业务核心指标：线上信号（近 7 日），一个看业务结果、一个看质量或风险；离线评测指标放在评测门槛里 */
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
  /** 接入方式：登记过的调用方 */
  callers: CallerRecord[];
  /** 线上干预：由 bad case 生成的临时止血措施 */
  interventions: Intervention[];
}

/** 调用方登记：谁在调用这个 Agent、按线上指向还是锁定某个版本调用 */
export interface CallerRecord { id: string; service: string; scene: string; owner: string; qps: number; /** null = 跟随线上指向 */ pin: string | null; api: '在线 API' | '批量 API'; since: string }

export type InterventionKind = '标准答案' | '拦截规则';
/**
 * 线上干预：必须关联 bad case；有效期最长 7 天；
 * 修复版本回归通过（回归集覆盖该 bad case）并成为线上版本后自动失效；每次变更写审计记录。
 */
export interface Intervention {
  id: string; badcaseId: string; kind: InterventionKind;
  trigger: string; content: string;
  createdAt: string; createdBy: string; expiresAt: string;
  /** 创建时的线上版本：干预针对它的问题 */
  appliesTo: string;
  /** 结束记录：手动撤销，或修复版本回归通过并上线后由平台自动失效 */
  ended?: { at: string; by: string; reason: string; auto: boolean };
}

/* ------------------------------------------------------------------ */
/* 资产中心：工具、模型、Prompt 模板、评测集都是版本化记录                 */
/* 规则：已发布的版本可能被 Agent 版本快照锁定，只能「发布新版本」；       */
/*      没被引用的版本可以原地修改；被引用时只能改基本信息（负责人、描述等）。 */
/* ------------------------------------------------------------------ */

export type AssetKind = 'tools' | 'models' | 'prompts' | 'evalsets';
/** 工具、模型的新版本要经过平台审核；评测集、Prompt 模板保存即发布 */
export type AssetVersionStatus = '已发布' | '审核中';
export interface AssetParam { name: string; type: string; required: string; desc: string }
export interface ToolContent { endpoint: string; protocol: 'HTTP' | '内部 RPC'; instruction: string; auth: string; timeout: string; qps: string; access: '只读' | '写操作'; dataLevel: string; callers: string; params: AssetParam[]; sample: string }
export interface ModelContent { capabilities: string[]; context: string; priceIn: string; priceOut: string; p95: string; dataLevel: string; qps: string }
export interface PromptVariable { name: string; desc: string; source: string }
export interface PromptContent { kind: string; scene: string; structure: string; body: string; variables: PromptVariable[] }
/** 评测集版本内容：基础样本之外追加的样本（预置评测集的原始样本来自 datasetsFor） */
export interface EvalsetContent { dimensions: string[]; scoring: string[]; addedCases: EvalCase[] }
export interface AssetVersion<C> { id: string; status: AssetVersionStatus; at: string; by: string; note: string; content: C }
export interface AssetRecord<C> {
  /** 工具用名称、模型用「名称 · 接入方式」、评测集用「agentId:datasetId」作为 key，和 Agent 配置里的引用写法一致 */
  key: string; name: string; team: string; owner: string; description: string; visibility: string;
  /** 新版本在前 */
  versions: AssetVersion<C>[];
  /** 页面上新建的资产 */
  created?: boolean;
  /** Prompt 模板：沉淀自哪些 Agent（模板被套用后复制进 Agent 快照，不做实时引用） */
  usedBy?: string[];
  /** 模型：接入方式（公司托管 / 公司网关 / 团队微调） */
  channel?: string;
  /** 评测集：归属 Agent 与评测集 id */
  agentId?: string; datasetId?: string;
}
export interface AssetState {
  tools: AssetRecord<ToolContent>[];
  models: AssetRecord<ModelContent>[];
  prompts: AssetRecord<PromptContent>[];
  /** 只存被修改过或新建的评测集；预置评测集按 datasetsFor 实时生成 */
  evalsets: AssetRecord<EvalsetContent>[];
}

export interface DemoState {
  schema: 7;
  agents: Agent[];
  ops: Record<string, AgentOps>;
  /** 已发布的知识库新版本（覆盖 mock），以及页面上新建的知识库 */
  knowledge: Record<string, KnowledgeBase>;
  /** 资产中心的工具、模型、Prompt 模板、评测集 */
  assets: AssetState;
  kbDraft: KbDraft | null;
  /**
   * collapsed：演示步骤浮层被用户收起成胶囊，换页、刷新后保持
   * paused：从 Agent 目录进入某个 Agent 时进入自由浏览，剧本暂停（浮层、锁定都不生效），点「继续剧本」恢复
   */
  playbook: { id: PlaybookId; step: number; collapsed: boolean; paused?: boolean } | null;
}
