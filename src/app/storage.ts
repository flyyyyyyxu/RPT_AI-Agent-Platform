import type { DemoState } from '../types/domain';

const KEY = 'agent-platform-demo-v1';

export function readDemo(): DemoState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('agents' in parsed) || !Array.isArray(parsed.agents) || !('team' in parsed) || typeof parsed.team !== 'string') return null;
    return parsed as DemoState;
  } catch { return null; }
}

export function writeDemo(state: DemoState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Storage is optional. */ }
}

export function clearDemo() {
  try { localStorage.removeItem(KEY); } catch { /* Storage is optional. */ }
}
