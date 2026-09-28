import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialDemoState } from '../data/mock';
import type { DemoState } from '../types/domain';
import { clearDemo, readDemo, writeDemo } from './storage';

interface DemoContextValue {
  state: DemoState;
  setTeam: (team: string) => void;
  reset: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => readDemo() ?? structuredClone(initialDemoState));
  useEffect(() => writeDemo(state), [state]);
  const setTeam = (team: string) => setState(previous => ({ ...previous, team }));
  const reset = () => { clearDemo(); setState(structuredClone(initialDemoState)); };
  return <DemoContext.Provider value={{ state, setTeam, reset }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('DemoProvider is missing');
  return context;
}
