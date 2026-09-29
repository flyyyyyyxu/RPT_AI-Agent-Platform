/** 剧本初始数据的公共部分：从基础 Agent 复制一份再修改。 */
import type { Agent } from '../../types/domain';
import { mockAgents } from '../base/agents';

export const baseAgent = (id: string) => structuredClone(mockAgents.find(agent => agent.id === id) as Agent);
