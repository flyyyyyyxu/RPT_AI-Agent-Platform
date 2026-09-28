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

export interface DemoState { agents: Agent[]; team: string }
