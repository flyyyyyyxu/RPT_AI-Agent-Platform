export type VersionStatus = '线上' | '灰度中' | '待发布' | '草稿';
export type AgentLevel = '原型' | '生产';

export interface AgentVersion {
  id: string;
  status: VersionStatus;
  updatedAt: string;
  note: string;
  knowledge?: string;
  traffic?: number;
}

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
  tool: string;
  outputFormat: string;
  steps: WorkflowStep[];
}

export interface DebugStepResult {
  step: string;
  duration: string;
  summary: string;
  detail: string;
}

export interface DebugResult {
  answer: string;
  totalDuration: string;
  steps: DebugStepResult[];
}

export interface AgentRuntime {
  config: AgentConfig;
  configured: boolean;
  debugged: boolean;
  evaluated: boolean;
  published: boolean;
  monitored: boolean;
  environments: { development: string; staging: string; production: string };
  lastDebugQuestion: string;
}

export interface Agent {
  id: string;
  name: string;
  owner: string;
  team: string;
  level: AgentLevel;
  mode: string;
  costThisMonth: number;
  productionVersion: string;
  versions: AgentVersion[];
  metrics: string[];
}

export interface DemoState {
  agents: Agent[];
  team: string;
  runtimes: Record<string, AgentRuntime>;
}
