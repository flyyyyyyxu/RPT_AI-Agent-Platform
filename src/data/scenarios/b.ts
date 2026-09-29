/** 剧本 B 生态守护 · 准：政策库 10 月版 → 隔离评测被门槛拦下 → Trace 找到旧条款 → 修正 → 影子 AB → 审批发布。所有数字均为演示数据。 */
import type { AbProfile, Agent, KnowledgeBase, TraceRecord } from '../../types/domain';
import { guardConfig, snap, version } from '../base/configs';
import { datasetProfiles, gateProfiles } from '../base/evaluation';
import { baseAgent } from './seed';

export const pbOldClause = '社区规范 4.3';
export const pbNewClause = '社区规范 4.5';
const pbPrompt = `${guardConfig.prompt}\n\n示例：\n「加 V 看完整教程」→ {"category":"违规-站外引流","policy_ref":"${pbOldClause}"}\n「私信领取减肥药」→ {"category":"违规-虚假医疗宣传","policy_ref":"社区规范 3.2.1"}`;
export const pbPolicyKb: KnowledgeBase = { id: 'policy', name: '政策库', owner: '内容安全 · 周可', description: '社区规范与审核政策条款',
  versions: [
    { id: '2026-10 版', publishedAt: '2026-09-28 18:00', usedBy: [], note: '站外引流条款由 4.3 调整为 4.5，新增谐音、二维码导流情形；10 月 1 日生效' },
    { id: '2026-09 版', publishedAt: '2026-09-01 00:00', usedBy: ['生态守护 v7'], note: '修订站外引流判定条款 4.3' },
    { id: '2026-08 版', publishedAt: '2026-08-01 00:00', usedBy: ['生态守护 v6'] },
  ],
  entries: [
    { title: '社区规范 3.2.1 虚假医疗宣传', versions: ['2026-10 版', '2026-09 版', '2026-08 版'], from: '2025-06-01 00:00', to: null },
    { title: '社区规范 4.5 站外引流（10 月版，含谐音、二维码导流）', versions: ['2026-10 版'], from: '2026-10-01 00:00', to: null },
    { title: '社区规范 4.3 站外引流（9 月版）', versions: ['2026-10 版', '2026-09 版'], from: '2026-09-01 00:00', to: '2026-09-30 23:59' },
    { title: '社区规范 4.3 站外引流（8 月版）', versions: ['2026-08 版'], from: '2025-12-01 00:00', to: '2026-08-31 23:59' },
    { title: '社区规范 1.4 真实消费评价', versions: ['2026-10 版', '2026-09 版', '2026-08 版'], from: '2025-06-01 00:00', to: null },
  ] };
const pbGateBase = gateProfiles.b;
export const pbGate = {
  unfixed: { rules: pbGateBase.rules.map(rule => rule.id === 'recallLead' ? { ...rule, value: 91.8, note: '谐音、二维码导流被判不违规' } : rule),
    redlines: [
      { name: '谐音导流「➕薇❤ 领资料」必判违规', input: '➕薇❤ 领全套资料，懂的来', passed: false },
      { name: '二维码导流必判违规', input: '（图片含个人微信二维码）扫码进群领福利', passed: false },
      ...pbGateBase.redlines,
    ] },
  fixed: { rules: pbGateBase.rules.map(rule => rule.id === 'recallLead' ? { ...rule, value: 96.4, note: '10 月版新增情形全部召回' } : rule),
    redlines: [
      { name: '谐音导流「➕薇❤ 领资料」必判违规', input: '➕薇❤ 领全套资料，懂的来', passed: true },
      { name: '二维码导流必判违规', input: '（图片含个人微信二维码）扫码进群领福利', passed: true },
      ...pbGateBase.redlines,
    ] },
};
const pbCase = (fixed: boolean) => [
  { name: '谐音导流', input: '➕薇❤ 领全套资料，懂的来', expected: '违规-站外引流，引用 4.5', oldScore: 40, newScore: fixed ? 97 : 35,
    oldAnswer: '{"category":"不违规","policy_ref":"社区规范 4.3"}', newAnswer: fixed ? '{"category":"违规-站外引流","policy_ref":"社区规范 4.5","confidence":0.93}' : '{"category":"不违规","policy_ref":"社区规范 4.3","confidence":0.71}' },
  { name: '二维码导流', input: '（图片含个人微信二维码）扫码进群领福利', expected: '违规-站外引流，引用 4.5', oldScore: 38, newScore: fixed ? 96 : 30,
    oldAnswer: '{"category":"不违规","policy_ref":"社区规范 4.3"}', newAnswer: fixed ? '{"category":"违规-站外引流","policy_ref":"社区规范 4.5","confidence":0.95}' : '{"category":"不违规","policy_ref":"社区规范 4.3","confidence":0.66}' },
  { name: '虚假医疗', input: '私信我领取减肥药，一周瘦 10 斤', expected: '判定违规并引用 3.2.1', oldScore: 98, newScore: 98,
    oldAnswer: '{"category":"违规-虚假医疗宣传","policy_ref":"社区规范 3.2.1"}', newAnswer: '{"category":"违规-虚假医疗宣传","policy_ref":"社区规范 3.2.1"}' },
];
export const pbDatasets = (fixed: boolean) => [{ id: 'base', name: '红线样本集（10 月版）', description: '含 10 月版新增的谐音、二维码导流情形', cases: pbCase(fixed) }, datasetProfiles.b[1]];
export const pbEvalTrace = (fixed: boolean): TraceRecord => ({ id: fixed ? 'ev_v8_1004' : 'ev_v8_0931', time: fixed ? '2026-09-29 11:32' : '2026-09-29 11:08', env: '隔离评测', version: 'v8', status: fixed ? '成功' : '异常',
  summary: '红线样本：「➕薇❤ 领全套资料，懂的来」',
  note: fixed ? '修正后：Prompt 示例改为引用 4.5，谐音导流判为违规。' : '检索召回了正确的 10 月版条款 4.5，但 Prompt 示例把条款写死为 4.3（9 月版），模型沿用旧条款判断。',
  steps: [
    { kind: '输入', name: '读取评测样本', ms: 10, depth: 0, detail: '隔离环境 · 红线样本集（10 月版）第 1 条' },
    { kind: '检索', name: '召回政策条款', ms: 540, depth: 1, detail: '召回 3 条', evidence: [{ entry: '社区规范 4.5 站外引流（含谐音、二维码导流）', version: '政策库 2026-10 版' }, ...(fixed ? [] : [{ entry: '社区规范 4.3 站外引流（Prompt 示例引用）', version: '政策库 2026-09 版', expired: true }])] },
    { kind: '工具调用', name: '账号历史查询 v2', ms: 214, depth: 1, detail: 'violations_30d=1' },
    fixed
      ? { kind: '生成', name: 'DeepSeek-V3 判定类别', ms: 1490, depth: 1, detail: '违规-站外引流 · 社区规范 4.5 · 置信度 0.93' }
      : { kind: '生成', name: 'DeepSeek-V3 判定类别', ms: 1512, depth: 1, detail: '对照 Prompt 示例中的 4.3 → 4.3 不含谐音导流 → 判「不违规」', error: '引用了已被替换的旧条款 4.3，红线样本漏判' },
    { kind: '护栏检查', name: '网关护栏', ms: 11, depth: 1, detail: fixed ? '格式 ✓ · 引用 ✓（4.5 在 10 月版中有效）' : '格式 ✓ · 引用 ✓（4.3 编号仍存在，未拦截）' },
    { kind: '输出', name: '写回评测结果', ms: 9, depth: 0, detail: fixed ? '与标注一致 ✓' : '与标注不一致：应判违规-站外引流' },
  ] });
const pbAb: AbProfile = {
  experimentId: 'SHADOW-20260929-guard-v8', days: 1, sample: '影子运行 12.4 万条内容，对照标注平台抽检 3,000 条',
  metrics: [
    { label: '与抽检标注一致率', oldValue: 96.1, newValue: 97.8, unit: '%', ci: [1.1, 2.3], higherIsBetter: true, decimals: 1 },
    { label: '红线类别召回率', oldValue: 98.9, newValue: 100, unit: '%', ci: [0.6, 1.6], higherIsBetter: true, decimals: 1 },
    { label: '误判率', oldValue: 1.8, newValue: 1.5, unit: '%', ci: [-0.5, -0.1], higherIsBetter: false, decimals: 1 },
    { label: '平均耗时', oldValue: 2.61, newValue: 2.66, unit: 's', ci: [-0.02, 0.12], higherIsBetter: false, decimals: 2 },
  ],
  conclusion: '与抽检标注一致率提升 1.7pp，红线类别全部召回，误判率下降；耗时差异不显著。满足全量发布条件。',
};

/** 剧本 B 初始数据：线上 v7 锁定政策库 2026-09 版，Prompt 示例里写死了旧条款 4.3。 */
export function seedB(): Agent {
  const agent = baseAgent('b');
  return { ...agent, profile: 'pb', productionVersion: 'v7', stagingVersion: 'v7', monitored: true, lastReleaseAt: '2026-09-10 09:30',
    versions: [
      version('v7', '线上', '2026-09-10 09:30', '当前政策适配（政策库 9 月版）', snap(guardConfig, { prompt: pbPrompt })),
      version('v6', '历史', '2026-08-26 15:20', '8 月政策版本', snap(guardConfig, { prompt: pbPrompt, knowledge: '政策库 2026-08 版' })),
    ] };
}

export const overridesB = { ab: pbAb };
