/** 演示剧本：开始（换成剧本初始数据）、暂停 / 继续（自由浏览时暂停）、切换步骤、收起 / 展开浮层、退出（可恢复原始数据）。 */
import { mockAgents, playbookKb, playbookSeed } from '../../../data';
import type { PlaybookId } from '../../../types/domain';
import type { StoreKit } from '../kit';

export function playbookActions({ setState }: StoreKit) {
  const startPlaybook = (id: PlaybookId) => setState(previous => {
    const seed = playbookSeed(id);
    const ops = { ...previous.ops }; delete ops[seed.id];
    const knowledge = { ...previous.knowledge }; const kbId = playbookKb[id]; if (kbId) delete knowledge[kbId];
    return { ...previous, agents: previous.agents.map(agent => agent.id === seed.id ? seed : agent), ops, knowledge, kbDraft: null, playbook: { id, step: 0, collapsed: false } };
  });

  /** 从 Agent 目录进入：剧本暂停，进度保留；「继续剧本」或「开始剧本」时恢复 */
  const pausePlaybook = () => setState(previous => previous.playbook && !previous.playbook.paused ? { ...previous, playbook: { ...previous.playbook, paused: true } } : previous);
  const resumePlaybook = () => setState(previous => previous.playbook ? { ...previous, playbook: { ...previous.playbook, paused: false, collapsed: false } } : previous);

  const setPlaybookStep = (step: number) => setState(previous => previous.playbook ? { ...previous, playbook: { ...previous.playbook, step } } : previous);

  const setPlaybookCollapsed = (collapsed: boolean) => setState(previous => previous.playbook ? { ...previous, playbook: { ...previous.playbook, collapsed } } : previous);

  /** restore=true 时把剧本 Agent 恢复成原始演示数据 */
  const exitPlaybook = (restore = false) => setState(previous => {
    if (!previous.playbook || !restore) return { ...previous, playbook: null };
    const id = previous.playbook.id;
    const original = structuredClone(mockAgents.find(agent => agent.id === id));
    const ops = { ...previous.ops }; delete ops[id];
    const knowledge = { ...previous.knowledge }; const kbId = playbookKb[id]; if (kbId) delete knowledge[kbId];
    return { ...previous, playbook: null, agents: original ? previous.agents.map(agent => agent.id === id ? original : agent) : previous.agents, ops, knowledge, kbDraft: null };
  });

  return { startPlaybook, pausePlaybook, resumePlaybook, setPlaybookStep, setPlaybookCollapsed, exitPlaybook };
}
