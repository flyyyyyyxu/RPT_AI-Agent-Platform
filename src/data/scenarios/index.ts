/** 演示剧本数据：只覆盖需要换的部分，其余沿用基础数据。页面通过 core/data-access/scenarioData 读取。 */
import type { AbProfile, Agent, AlertDef, BadCase, PlaybookId, TraceRecord } from '../../types/domain';
import { overridesA, seedA } from './a';

export { paV13Config } from './a';
import { overridesB, seedB } from './b';
import { overridesC, seedC } from './c';

export { pbDatasets, pbEvalTrace, pbGate, pbNewClause, pbOldClause, pbPolicyKb } from './b';
export { pcAftersaleKb, pcOldEntry, pcOldEntryExpiry } from './c';

export const scenarioOverrides: Record<'pa' | 'pb' | 'pc', { ab?: AbProfile; traces?: TraceRecord[]; badcases?: BadCase[]; alerts?: AlertDef[] }> = {
  pa: overridesA,
  pb: overridesB,
  pc: overridesC,
};

/** 开始剧本时，对应 Agent 被替换成这份初始数据。 */
export function playbookSeed(id: PlaybookId): Agent {
  return id === 'a' ? seedA() : id === 'b' ? seedB() : seedC();
}

/** 剧本会用到的剧本版知识库（开始 / 退出剧本时要重置）。 */
export const playbookKb: Record<PlaybookId, string | null> = { a: null, b: 'policy', c: 'aftersale' };
