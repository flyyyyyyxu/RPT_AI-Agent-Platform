/** 剧本 A 社区穿搭灵感 Agent · 快：新建 v13 → 调试 → 评测 → 灰度 10% → 延迟超门槛告警 → 回退 → Trace 定位。所有数字均为演示数据。 */
import type { AbProfile, Agent, AlertDef, TraceRecord } from '../../types/domain';
import { outfitConfig, snap } from '../base/configs';
import { okGuard } from '../base/trace';
import { baseAgent } from './seed';

/** 本周迭代的目标配置：新增「图文笔记检索」步骤（笔记检索 v4），「代我修改」直接写入这份配置。 */
export const paV13Config = snap(outfitConfig, {
  model: 'Qwen3-235B · 公司托管',
  tools: ['笔记检索 v3', '笔记检索 v4', '用户画像查询 v1'],
  steps: [outfitConfig.steps[0], outfitConfig.steps[1], { id: 'step-2b', name: '图文笔记检索', type: '工具调用', description: '笔记检索 v4：按图片向量补充召回同款' }, outfitConfig.steps[2], outfitConfig.steps[3]],
});
const paAb: AbProfile = {
  experimentId: 'EXP-20260929-outfit-v13', days: 1, sample: '灰度 10%，按用户分桶 · 共 12.6 万次曝光',
  metrics: [
    { label: '采纳率', oldValue: 42.8, newValue: 44.9, unit: '%', ci: [1.2, 3.0], higherIsBetter: true, decimals: 1 },
    { label: '点击率', oldValue: 18.6, newValue: 19.3, unit: '%', ci: [0.2, 1.2], higherIsBetter: true, decimals: 1 },
    { label: 'P95 延迟', oldValue: 820, newValue: 1200, unit: 'ms', ci: [340, 420], higherIsBetter: false, decimals: 0, threshold: 1000 },
  ],
  conclusion: '采纳率 +2.1pp 显著提升，但 P95 延迟 +380ms，超过 1,000ms 上线门槛并触发告警。先回退止损，再定位延迟来源。',
};
const paTraces: TraceRecord[] = [
  { id: 'tr_9f3c21', time: '', afterRelease: 36, summary: '周末约会穿什么？偏法式', version: 'v13', status: '异常', env: '生产',
    note: '对照 v12 同类请求 tr_9f3b88：没有「图文笔记检索」这一步，总耗时 0.82s。多出来的 380ms 全部来自 v13 新增步骤。',
    steps: [
      { kind: '输入', name: '接收请求', ms: 6, depth: 0, detail: 'scene=date, style=french · bucket=13 → v13（会话粘性）' },
      { kind: '工具调用', name: '用户画像查询 v1', ms: 58, depth: 1, detail: '偏好：法式、低饱和配色' },
      { kind: '检索', name: '风格知识检索', ms: 80, depth: 1, detail: '召回 5 条风格规则', evidence: [{ entry: '法式约会 · 规则 #F-112', version: '穿搭风格库 2026-09' }] },
      { kind: '工具调用', name: '笔记检索 v3', ms: 262, depth: 1, detail: '召回 42 篇，过滤后 9 篇' },
      { kind: '工具调用', name: '图文笔记检索 v4', ms: 380, depth: 1, detail: '图片向量召回 120 篇 → 重排 12 篇', isNew: true, error: 'v13 新增步骤，串行执行，单步 380ms，把 P95 推高到 1.2s' },
      { kind: '生成', name: 'Qwen3-235B 生成灵感卡片', ms: 392, depth: 1, detail: '3 张卡片 · 640 tokens' },
      { kind: '护栏检查', name: '网关护栏', ms: 18, depth: 1, detail: okGuard },
      { kind: '输出', name: '返回结果', ms: 4, depth: 0, detail: '总耗时 1.20s，超过 1s 门槛' },
    ] },
  { id: 'tr_9f3b88', time: '2026-09-29 11:40', summary: '周末约会穿什么？偏法式（v12）', version: 'v12', status: '成功', env: '生产',
    steps: [
      { kind: '输入', name: '接收请求', ms: 6, depth: 0, detail: 'bucket=72 → v12' },
      { kind: '工具调用', name: '用户画像查询 v1', ms: 60, depth: 1, detail: '偏好：法式、低饱和配色' },
      { kind: '检索', name: '风格知识检索', ms: 82, depth: 1, detail: '召回 5 条风格规则', evidence: [{ entry: '法式约会 · 规则 #F-112', version: '穿搭风格库 2026-09' }] },
      { kind: '工具调用', name: '笔记检索 v3', ms: 270, depth: 1, detail: '召回 40 篇，过滤后 9 篇' },
      { kind: '生成', name: 'Qwen3-32B 生成灵感卡片', ms: 382, depth: 1, detail: '3 张卡片 · 598 tokens' },
      { kind: '护栏检查', name: '网关护栏', ms: 16, depth: 1, detail: okGuard },
      { kind: '输出', name: '返回结果', ms: 4, depth: 0, detail: '总耗时 0.82s' },
    ] },
];
const paAlerts: AlertDef[] = [
  { id: 'AL-0929-2231', title: 'P95 延迟超过门槛', detail: 'v13 分桶 P95 1,200ms，门槛 ≤ 1,000ms，已持续 10 分钟', time: '', afterRelease: 37, version: 'v13', notify: '陈思远、社区内容值班组 · 电话 + 群消息', resolvedNote: '回退后 v13 分桶流量归零，P95 回到 830ms' },
];

/** 剧本 A 初始数据：线上 v12，还没有候选版本；v13 由用户在构建页新建。 */
export function seedA(): Agent {
  const agent = baseAgent('a');
  return { ...agent, profile: 'pa', monitored: true, stagingVersion: 'v12', lastReleaseAt: '2026-09-20 16:13',
    versions: agent.versions.filter(item => item.id !== 'v13') };
}

export const overridesA = { ab: paAb, traces: paTraces, alerts: paAlerts };
