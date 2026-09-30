/** 剧本 C 电商售后答疑 Agent · 稳：用户投诉 → Trace 命中过期知识 → 标注「知识」→ 更新知识版本 → 回归 → 按会话灰度。所有数字均为演示数据。 */
import type { AbProfile, Agent, BadCase, KnowledgeBase, TraceRecord } from '../../types/domain';
import { badCaseProfiles, traceProfiles } from '../base/trace';
import { baseAgent } from './seed';

export const pcAftersaleKb: KnowledgeBase = { id: 'aftersale', name: '售后知识', owner: '客户服务 · 王宁', description: '售后政策、退货规则、大促规则',
  versions: [
    { id: 'v34', publishedAt: '2026-09-01 00:00', usedBy: ['电商售后答疑 Agent v21'], note: '调整大促价保期' },
    { id: 'v33', publishedAt: '2026-08-15 00:00', usedBy: ['电商售后答疑 Agent v20'] },
  ],
  entries: [
    { title: '《退货政策》2.1 七天无理由退货', versions: ['v34', 'v33'], from: '2025-03-01 00:00', to: null },
    { title: '《售后政策》2.4 物流催件', versions: ['v34', 'v33'], from: '2026-05-01 00:00', to: null },
    { title: '《售后政策》3.1 质量问题退换', versions: ['v34', 'v33'], from: '2026-05-01 00:00', to: null },
    { title: '《大促价保规则》2026 版 1.2（价保 30 天）', versions: ['v34'], from: '2026-09-01 00:00', to: null },
  ] };
export const pcOldEntry = '《退货政策》2.1 七天无理由退货';
export const pcOldEntryExpiry = '2026-08-31 23:59';
const pcTraces: TraceRecord[] = [
  { id: 'tr_9f2b17', time: '2026-09-29 09:26', summary: '签收 10 天了还能无理由退货吗？', version: 'v21', status: '异常', env: '生产',
    note: '检索命中的「七天无理由退货」条目没有设置失效时间：2026-09-01 起已被十五天新规替代，但仍在 v34 中生效。',
    steps: [
      { kind: '输入', name: '接收消息', ms: 8, depth: 0, detail: '会话第 2 轮 · 会话粘性命中 v21' },
      { kind: '工具调用', name: '订单查询 v4', ms: 236, depth: 1, detail: 'SO2609190877 · 签收 10 天' },
      { kind: '检索', name: '检索售后知识', ms: 471, depth: 1, detail: '召回 2 条，采用 1 条', evidence: [{ entry: pcOldEntry, version: '售后知识 v34', expired: true }], error: '命中过期知识：条目缺少失效时间（应于 2026-08-31 失效）' },
      { kind: '生成', name: 'DeepSeek-V3 生成回答', ms: 804, depth: 1, detail: '回答「已超过 7 天无理由退货时限」' },
      { kind: '护栏检查', name: '网关护栏', ms: 33, depth: 1, detail: '格式 ✓ · 承诺类话术 ✓ · 引用校验 ✓', error: '引用校验按失效时间判断，条目没填失效时间，无法识别' },
      { kind: '输出', name: '返回结果', ms: 7, depth: 0, detail: '用户随后点踩并投诉' },
    ] },
  traceProfiles.c[0],
];
/** 剧本 C：投诉 bc-4431 是影响最大的一类（同类 23 条、出在线上 v21）；其余沿用基础数据，价保类问题 bc-4415 不在剧本里出现 */
const pcBadcases: BadCase[] = [
  { id: 'bc-4431', source: '用户反馈', time: '2026-09-29 09:31', version: 'v21', traceId: 'tr_9f2b17', similar: 23,
    summary: '用户投诉：回答的是旧的退货规则', detail: '「客服说只能 7 天无理由，官网写的是 15 天」— 用户点踩并提交投诉，同类投诉 23 条。',
    input: '签收 10 天了还能无理由退货吗？', output: '您的订单已签收 10 天，超过 7 天无理由退货时限，无法申请。',
    step: { kind: '检索', issue: '命中过期知识：条目缺少失效时间（应于 2026-08-31 失效）' },
    suggest: { stage: '知识', evidence: '检索命中「七天无理由退货」（售后知识 v34）：9 月 1 日起已被十五天新规替代，但条目没有设置失效时间，仍在生效。' },
    expected: '按 2026-09 新规：15 天内可无理由退货',
    evalCase: { name: '退货时限（来自 bc-4431）', input: '签收 10 天了还能无理由退货吗？', expected: '按 2026-09 新规：15 天内可无理由退货', oldScore: 35, newScore: 95,
      oldAnswer: '您的订单已签收 10 天，超过 7 天无理由退货时限，无法申请。', newAnswer: '依据《退货政策》2.1（2026-09-01 起生效），签收 15 天内可申请无理由退货，您的订单仍在时限内。' } },
  ...badCaseProfiles.c.filter(item => item.id !== 'bc-4415'),
];
const pcAb: AbProfile = {
  experimentId: 'EXP-20260929-aftersale-v22', days: 1, sample: '按会话 ID 分桶 10%，共 1.2 万次会话',
  metrics: [
    { label: '转人工率', oldValue: 12.1, newValue: 9.6, unit: '%', ci: [-3.4, -1.6], higherIsBetter: false, decimals: 1 },
    { label: '解决率', oldValue: 78.4, newValue: 80.6, unit: '%', ci: [0.9, 3.5], higherIsBetter: true, decimals: 1 },
    { label: '过期知识命中数', oldValue: 7, newValue: 0, unit: '条', ci: [-9, -5], higherIsBetter: false, decimals: 0 },
    { label: '满意度', oldValue: 4.52, newValue: 4.58, unit: '分', ci: [-0.01, 0.13], higherIsBetter: true, decimals: 2 },
  ],
  conclusion: '转人工率下降 2.5pp、解决率提升，过期知识命中清零；满意度差异暂不显著。可以按会话继续放量。',
};

/** 剧本 C 初始数据：线上 v21 锁定售后知识 v34，旧退货条目没有失效时间。 */
export function seedC(): Agent {
  const agent = baseAgent('c');
  return { ...agent, profile: 'pc', monitored: true };
}

export const overridesC = { ab: pcAb, traces: pcTraces, badcases: pcBadcases };
