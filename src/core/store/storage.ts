import type { DemoState } from '../../types/domain';

/** 数据结构变化时必须同步提升版本号，旧存档会被直接丢弃，避免读到不兼容的数据导致白屏。 */
const SCHEMA = 9;
const KEY = `agent-platform-demo-v${SCHEMA}`;
const LEGACY_KEYS = ['agent-platform-demo-v1', 'agent-platform-demo-v2', 'agent-platform-demo-v3', 'agent-platform-demo-v4', 'agent-platform-demo-v5', 'agent-platform-demo-v6', 'agent-platform-demo-v7', 'agent-platform-demo-v8'];

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

function isValidState(value: unknown): value is DemoState {
  if (!isObject(value) || value.schema !== SCHEMA || !Array.isArray(value.agents) || !isObject(value.ops) || !isObject(value.knowledge)
    || !isObject(value.assets) || !(['tools', 'models', 'prompts', 'evalsets', 'databases'] as const).every(kind => Array.isArray((value.assets as Record<string, unknown>)[kind]))) return false;
  return value.agents.every(agent => isObject(agent)
    && typeof agent.id === 'string' && typeof agent.name === 'string'
    && Array.isArray(agent.versions) && agent.versions.length > 0
    && agent.versions.every(version => isObject(version) && typeof version.id === 'string' && isObject(version.config) && Array.isArray((version.config as Record<string, unknown>).steps) && isObject((version.config as Record<string, unknown>).memory) && isObject((version.config as Record<string, unknown>).dialog) && Array.isArray(version.evaluatedDatasets))
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
