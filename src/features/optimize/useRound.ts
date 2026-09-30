/**
 * 本轮优化的写操作：纳入本轮（生成优化目标，bad case 同时写入归因并加入回归集）、bad case 标注、加入回归集、忽略。
 * 每次变更都写入操作记录（治理 · 最近操作）。
 */
import { useDemo } from '../../core/store/DemoProvider';
import { nowStamp } from '../../core/rules/clock';
import { getCandidate } from '../../core/rules/versions';
import type { GoalSeed } from '../../core/rules/optimization';
import type { Agent, ApprovalRecord, BadCase, BadCaseLabel, OptimizationGoal, ProblemStage } from '../../types/domain';

export interface RoundEntry { seed: GoalSeed; badcase?: { item: BadCase; stage: ProblemStage; expected?: string } }

const blank = (item: BadCase): BadCaseLabel => ({ stage: item.labeled ?? null, inEvalSet: false });

export function useRound(agent: Agent) {
  const { updateOps } = useDemo();
  const who = agent.owner;

  /** 纳入本轮：挂到当前候选版本；没有候选版本时等下一个新建的候选版本 */
  const include = (entries: RoundEntry[]) => {
    if (!entries.length) return;
    const candidate = getCandidate(agent);
    const at = nowStamp();
    updateOps(agent.id, current => {
      let goals = current.goals;
      let badcases = current.badcases;
      const logs: ApprovalRecord[] = [];
      for (const entry of entries) {
        // 编号取已有最大值 + 1：移出本轮后不会和已有目标重号
        const next = Math.max(0, ...goals.map(goal => Number(goal.id.replace(/\D/g, '')) || 0)) + 1;
        const goal: OptimizationGoal = { ...entry.seed, id: `og-${String(next).padStart(3, '0')}`, createdAt: at, createdBy: who, version: candidate?.id ?? null };
        goals = [...goals, goal];
        if (entry.badcase) {
          const { item, stage, expected } = entry.badcase;
          const previous = badcases[item.id] ?? blank(item);
          badcases = { ...badcases, [item.id]: { ...previous, stage, inEvalSet: true, expected: expected ?? previous.expected } };
        }
        logs.push({ time: at, who, action: `纳入本轮优化 ${goal.id}（${goal.source} ${goal.sourceId} · 调优对象 ${goal.targets.join('、') || '待定位'}${candidate ? ` · 挂到 ${candidate.id}` : ' · 等待新建候选版本'}${entry.badcase ? ' · 已加入 bad case 回归集' : ''}）` });
      }
      return { ...current, goals, badcases, approvals: [...logs.reverse(), ...current.approvals] };
    });
  };

  const setLabel = (item: BadCase, patch: Partial<BadCaseLabel>, action?: string) => updateOps(agent.id, current => ({
    ...current,
    badcases: { ...current.badcases, [item.id]: { ...(current.badcases[item.id] ?? blank(item)), ...patch } },
    approvals: action ? [{ time: nowStamp(), who, action }, ...current.approvals] : current.approvals,
  }));

  const addToRegression = (items: { item: BadCase; expected?: string }[]) => {
    if (!items.length) return;
    const at = nowStamp();
    updateOps(agent.id, current => {
      const badcases = { ...current.badcases };
      items.forEach(({ item, expected }) => { const previous = badcases[item.id] ?? blank(item); badcases[item.id] = { ...previous, inEvalSet: true, expected: expected ?? previous.expected }; });
      return { ...current, badcases, approvals: [{ time: at, who, action: `加入 bad case 回归集：${items.map(entry => entry.item.id).join('、')}` }, ...current.approvals] };
    });
  };

  const ignore = (items: BadCase[], reason: string) => {
    if (!items.length) return;
    const at = nowStamp();
    updateOps(agent.id, current => {
      const badcases = { ...current.badcases };
      // 忽略的问题不再参与回归：同时移出 bad case 回归集
      const removed = items.filter(item => badcases[item.id]?.inEvalSet);
      items.forEach(item => { badcases[item.id] = { ...(badcases[item.id] ?? blank(item)), inEvalSet: false, ignored: { reason, at, by: who } }; });
      return { ...current, badcases, approvals: [{ time: at, who, action: `忽略 bad case ${items.map(item => item.id).join('、')}（${reason}）${removed.length ? `，并移出 bad case 回归集：${removed.map(item => item.id).join('、')}` : ''}` }, ...current.approvals] };
    });
  };

  const restore = (item: BadCase) => setLabel(item, { ignored: undefined }, `撤销忽略 bad case ${item.id}`);
  const removeFromRegression = (item: BadCase) => setLabel(item, { inEvalSet: false }, `移出 bad case 回归集：${item.id}`);
  /** 期望输出：失焦时保存（不写操作记录） */
  const saveExpected = (item: BadCase, expected: string) => setLabel(item, { expected });

  return { include, setLabel, addToRegression, ignore, restore, removeFromRegression, saveExpected };
}
