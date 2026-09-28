import type { DemoState } from '../types/domain';

/** 数据结构变化时必须同步提升版本号，旧存档会被直接丢弃，避免读到不兼容的数据导致白屏。 */
const SCHEMA = 2;
const KEY = `agent-platform-demo-v${SCHEMA}`;
const LEGACY_KEYS = ['agent-platform-demo-v1'];

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

function isValidState(value: unknown): value is DemoState {
  if (!isObject(value) || value.schema !== SCHEMA || typeof value.team !== 'string' || !Array.isArray(value.agents)) return false;
  return value.agents.every(agent => isObject(agent)
    && typeof agent.id === 'string' && typeof agent.name === 'string'
    && Array.isArray(agent.versions) && agent.versions.length > 0
    && agent.versions.every(version => isObject(version) && typeof version.id === 'string' && isObject(version.config) && Array.isArray((version.config as Record<string, unknown>).steps) && Array.isArray(version.evaluatedDatasets))
    && (agent.productionVersion === null || agent.versions.some(version => isObject(version) && version.id === agent.productionVersion)));
}

export function readDemo(): DemoState | null {
  try {
    LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidState(parsed) ? parsed : null;
  } catch { return null; }
}

export function writeDemo(state: DemoState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Storage is optional. */ }
}

export function clearDemo() {
  try { localStorage.removeItem(KEY); } catch { /* Storage is optional. */ }
}
