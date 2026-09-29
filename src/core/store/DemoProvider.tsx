/**
 * 演示状态：保存在内存和浏览器存储里。操作按领域分组放在 actions/ 下，这里只负责组装。
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialDemoState } from '../../data';
import type { DemoState } from '../../types/domain';
import { syncClock } from '../rules/clock';
import { knowledgeActions } from './actions/knowledgeActions';
import { opsActions } from './actions/opsActions';
import { playbookActions } from './actions/playbookActions';
import { releaseActions } from './actions/releaseActions';
import { versionActions } from './actions/versionActions';
import { createKit } from './kit';
import { clearDemo, readDemo, writeDemo } from './storage';

export type { CreateAgentInput } from './actions/versionActions';

const fresh = () => structuredClone(initialDemoState);

function useDemoStore() {
  const [state, setState] = useState<DemoState>(() => { const initial = readDemo() ?? fresh(); syncClock(initial); return initial; });
  useEffect(() => writeDemo(state), [state]);
  const kit = createKit(state, setState);
  const ops = opsActions(kit);
  const reset = () => { clearDemo(); const next = fresh(); syncClock(next); setState(next); };
  return { state, reset, ...ops, ...versionActions(kit), ...releaseActions(kit, ops), ...knowledgeActions(kit), ...playbookActions(kit) };
}

type DemoContextValue = ReturnType<typeof useDemoStore>;
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value={useDemoStore()}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider is missing');
  return context;
}
