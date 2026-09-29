/** Trace 与 bad case。 */
import type { BadCase, BaseProfileId, TraceRecord } from '../../types/domain';

/* ⑧ Trace（OpenTelemetry 标准的 span 结构，界面展示用） */
export const okGuard = '格式 ✓ · 引用 ✓ · 承诺类话术 ✓ · 内容安全 ✓';
export const traceProfiles: Record<BaseProfileId, TraceRecord[]> = {
  general: [
    { id: 'tr_9f2a01', time: '2026-09-28 16:13', summary: '我已经转正，今年有几天年假？', version: 'v3', status: '成功', steps: [
      { kind: '输入', name: '接收问题', ms: 12, depth: 0, detail: '用户问题 + 最近 2 轮会话上下文' },
      { kind: '检索', name: '检索有效制度', ms: 436, depth: 1, detail: '召回 3 条，采用 1 条', evidence: [{ entry: '《员工休假管理制度》3.2 年假天数', version: '制度库 2026-09 版' }] },
      { kind: '工具调用', name: '员工身份查询 v2', ms: 182, depth: 1, detail: 'status=regular, region=上海' },
      { kind: '生成', name: 'DeepSeek-V3 生成回答', ms: 504, depth: 1, detail: '输出 96 字 · 1,284 tokens' },
      { kind: '护栏检查', name: '网关护栏', ms: 38, depth: 1, detail: okGuard },
      { kind: '输出', name: '返回结果', ms: 8, depth: 0, detail: '结构化回答：结论、依据、下一步' },
    ] },
    { id: 'tr_9f2947', time: '2026-09-28 16:02', summary: '2024 年的加班调休规则还适用吗？', version: 'v3', status: '异常', steps: [
      { kind: '输入', name: '接收问题', ms: 10, depth: 0, detail: '单轮问题' },
      { kind: '检索', name: '检索有效制度', ms: 512, depth: 1, detail: '召回 2 条，采用 1 条', evidence: [{ entry: '《加班与调休管理办法》2.3（2024 版）', version: '制度库 2026-09 版', expired: true }], error: '命中已失效条款（2026-06-30 失效）' },
      { kind: '生成', name: 'DeepSeek-V3 生成回答', ms: 688, depth: 1, detail: '初稿：「适用，加班可按 1:1 调休」' },
      { kind: '护栏检查', name: '网关护栏', ms: 44, depth: 1, detail: '引用校验未通过：依据已失效', error: '引用校验拦截，回答改写为「该规则已失效，请查看现行办法」' },
      { kind: '输出', name: '返回结果', ms: 9, depth: 0, detail: '返回改写后的回答' },
    ] },
  ],
  a: [
    { id: 'tr_9f2a01', time: '2026-09-28 16:13', summary: '周末约会穿什么？偏法式', version: 'v13', status: '成功', steps: [
      { kind: '输入', name: '接收请求', ms: 6, depth: 0, detail: 'scene=date, style=french · 分桶 bucket=13（v13 灰度）' },
      { kind: '工具调用', name: '用户画像查询 v1', ms: 64, depth: 1, detail: '偏好：法式、低饱和配色' },
      { kind: '检索', name: '风格知识检索', ms: 88, depth: 1, detail: '召回 5 条风格规则', evidence: [{ entry: '法式约会 · 规则 #F-112', version: '穿搭风格库 2026-09' }] },
      { kind: '工具调用', name: '笔记检索 v3', ms: 284, depth: 1, detail: '召回 42 篇，过滤后 9 篇' },
      { kind: '生成', name: 'Qwen3-235B 生成灵感卡片', ms: 402, depth: 1, detail: '3 张卡片 · 612 tokens' },
      { kind: '护栏检查', name: '网关护栏', ms: 21, depth: 1, detail: okGuard },
      { kind: '输出', name: '返回结果', ms: 5, depth: 0, detail: 'JSON：cards[3] + note_ids[3]' },
    ] },
    { id: 'tr_9f2947', time: '2026-09-28 16:02', summary: '秋季通勤，小个子怎么穿显高？', version: 'v13', status: '异常', steps: [
      { kind: '输入', name: '接收请求', ms: 5, depth: 0, detail: 'scene=commute, body=petite · bucket=13（v13 灰度）' },
      { kind: '工具调用', name: '用户画像查询 v1', ms: 71, depth: 1, detail: '偏好：通勤、简约' },
      { kind: '工具调用', name: '笔记检索 v3', ms: 1206, depth: 1, detail: '首次调用超时 1s，重试 1 次成功', error: '下游超时后重试，拉高 P95' },
      { kind: '检索', name: '风格知识检索', ms: 92, depth: 1, detail: '召回 4 条', evidence: [{ entry: '小个子显高 · 规则 #P-031', version: '穿搭风格库 2026-09' }] },
      { kind: '生成', name: 'Qwen3-235B 生成灵感卡片', ms: 418, depth: 1, detail: '3 张卡片 · 402 tokens' },
      { kind: '护栏检查', name: '网关护栏', ms: 20, depth: 1, detail: okGuard },
      { kind: '输出', name: '返回结果', ms: 5, depth: 0, detail: '总耗时 1.82s，超过 P95 门槛' },
    ] },
  ],
  b: [
    { id: 'tr_9f2a01', time: '2026-09-28 16:13', summary: '笔记：「私信我领取减肥药，一周瘦 10 斤」', version: 'v7', status: '成功', steps: [
      { kind: '输入', name: '读取批次内容', ms: 14, depth: 0, detail: '批次 B-0928-16 · 第 1,204 条' },
      { kind: '检索', name: '召回政策条款', ms: 612, depth: 1, detail: '召回 5 条，命中 1 条', evidence: [{ entry: '社区规范 3.2.1 虚假医疗宣传', version: '政策库 2026-09 版' }] },
      { kind: '工具调用', name: '账号历史查询 v2', ms: 248, depth: 1, detail: 'violations_30d=2' },
      { kind: '生成', name: 'DeepSeek-V3 判定类别', ms: 1620, depth: 1, detail: '违规-虚假医疗宣传 · 置信度 0.96' },
      { kind: '护栏检查', name: '网关护栏', ms: 12, depth: 1, detail: '格式 ✓ · 引用 ✓（条款编号存在）' },
      { kind: '输出', name: '写回审核结果', ms: 18, depth: 0, detail: 'JSON 写入审核队列' },
    ] },
    { id: 'tr_9f2947', time: '2026-09-28 16:02', summary: '评论：「这家店衣服质量一般，退货很慢」', version: 'v7', status: '异常', steps: [
      { kind: '输入', name: '读取批次内容', ms: 12, depth: 0, detail: '批次 B-0928-16 · 第 1,388 条' },
      { kind: '检索', name: '召回政策条款', ms: 590, depth: 1, detail: '召回 3 条，采用 1 条', evidence: [{ entry: '社区规范 5.1 恶意差评', version: '政策库 2026-09 版' }, { entry: '社区规范 1.4 真实消费评价', version: '政策库 2026-09 版' }] },
      { kind: '工具调用', name: '账号历史查询 v2', ms: 231, depth: 1, detail: 'violations_30d=0' },
      { kind: '生成', name: 'DeepSeek-V3 判定类别', ms: 1480, depth: 1, detail: '违规-恶意差评 · 置信度 0.62', error: '置信度低于 0.7 仍直接判违规（v7 未设人工复核阈值）' },
      { kind: '护栏检查', name: '网关护栏', ms: 11, depth: 1, detail: '格式 ✓ · 引用 ✓' },
      { kind: '输出', name: '写回审核结果', ms: 16, depth: 0, detail: '后续被用户申诉改判为「不违规」' },
    ] },
  ],
  c: [
    { id: 'tr_9f2a01', time: '2026-09-28 16:13', summary: '我的快递三天没更新了怎么办？', version: 'v21', status: '成功', steps: [
      { kind: '输入', name: '接收消息', ms: 9, depth: 0, detail: '会话第 3 轮 · 会话粘性命中 v21' },
      { kind: '工具调用', name: '订单查询 v4', ms: 238, depth: 1, detail: 'SO2609281043 · 已发货' },
      { kind: '工具调用', name: '物流查询 v2', ms: 300, depth: 1, detail: 'stalled_hours=76' },
      { kind: '检索', name: '检索售后知识', ms: 462, depth: 1, detail: '命中 1 条', evidence: [{ entry: '《售后政策》2.4 物流催件', version: '售后知识 v34' }] },
      { kind: '生成', name: 'DeepSeek-V3 生成回答', ms: 796, depth: 1, detail: '输出 118 字 · 2,418 tokens' },
      { kind: '护栏检查', name: '网关护栏', ms: 34, depth: 1, detail: okGuard },
      { kind: '输出', name: '返回结果', ms: 7, depth: 0, detail: '结论、依据、操作入口' },
    ] },
    { id: 'tr_9f2947', time: '2026-09-28 16:02', summary: '双 11 买的降价了能退差价吗？', version: 'v21', status: '异常', steps: [
      { kind: '输入', name: '接收消息', ms: 8, depth: 0, detail: '会话第 1 轮' },
      { kind: '工具调用', name: '订单查询 v4', ms: 251, depth: 1, detail: '下单 2025-11-11' },
      { kind: '检索', name: '检索售后知识', ms: 488, depth: 1, detail: '召回 2 条，采用 1 条', evidence: [{ entry: '《大促价保规则》2025 版 1.2', version: '售后知识 v34', expired: true }], error: '命中已失效条款（2026-09-01 失效）' },
      { kind: '生成', name: 'DeepSeek-V3 生成回答', ms: 812, depth: 1, detail: '回答「支持 15 天价保」' },
      { kind: '护栏检查', name: '网关护栏', ms: 36, depth: 1, detail: '格式 ✓ · 承诺类话术 ✓ · 引用校验未识别失效', error: '引用校验规则未覆盖该条款的失效时间' },
      { kind: '输出', name: '返回结果', ms: 7, depth: 0, detail: '用户随后发起反馈' },
    ] },
  ],
  blank: [],
};

/* ⑥ bad case：来源 + 关联 Trace */
export const badCaseProfiles: Record<BaseProfileId, BadCase[]> = {
  general: [
    { id: 'bc-1021', source: '用户反馈', time: '2026-09-28 16:05', summary: '回答引用了已失效的加班调休规则', detail: '员工点踩并备注「这个规则早就改了」。', traceId: 'tr_9f2947', version: 'v3' },
    { id: 'bc-1017', source: '抽检', time: '2026-09-27 11:20', summary: '病假材料回答未给出 OA 入口', detail: '周抽检 50 条中 3 条缺少操作入口。', traceId: 'tr_9f2a01', version: 'v3' },
    { id: 'bc-1009', source: '申诉', time: '2026-09-26 09:48', summary: '差旅住宿标准未区分职级', detail: '员工申诉：P8 标准与回答不符。', traceId: 'tr_9f2a01', version: 'v3' },
  ],
  a: [
    { id: 'bc-2310', source: '抽检', time: '2026-09-28 15:40', summary: '灵感卡片出现「显瘦 10 斤」表述', detail: '功效承诺类表述，需护栏或 Prompt 约束。', traceId: 'tr_9f2a01', version: 'v13' },
    { id: 'bc-2302', source: '用户反馈', time: '2026-09-28 10:12', summary: '推荐的同款笔记已下架', detail: '用户点击后提示「笔记不存在」。', traceId: 'tr_9f2947', version: 'v13' },
    { id: 'bc-2288', source: '申诉', time: '2026-09-27 17:30', summary: '原创作者申诉：搬运笔记被推荐', detail: '去重步骤未识别搬运内容。', traceId: 'tr_9f2947', version: 'v12' },
  ],
  b: [
    { id: 'bc-3107', source: '申诉', time: '2026-09-28 16:30', summary: '真实差评被判「恶意差评」，申诉改判', detail: '改判结果已回流，需分析低置信度处理策略。', traceId: 'tr_9f2947', version: 'v7' },
    { id: 'bc-3101', source: '抽检', time: '2026-09-28 11:05', summary: '隐晦引流「主页有惊喜」漏判', detail: '抽检 500 条发现 4 条同类漏判。', traceId: 'tr_9f2a01', version: 'v7' },
    { id: 'bc-3094', source: '用户反馈', time: '2026-09-27 20:18', summary: '医学科普内容被误判虚假医疗', detail: '作者反馈：三甲医生科普被限流。', traceId: 'tr_9f2a01', version: 'v7' },
  ],
  c: [
    { id: 'bc-4415', source: '用户反馈', time: '2026-09-28 16:04', summary: '价保期回答为 15 天（已失效规则）', detail: '用户追问后转人工，人工确认为 30 天。', traceId: 'tr_9f2947', version: 'v21' },
    { id: 'bc-4409', source: '抽检', time: '2026-09-28 10:40', summary: '晚发货补偿话术接近承诺金额', detail: '「一般会补偿 10 元左右」未被拦截。', traceId: 'tr_9f2a01', version: 'v21' },
    { id: 'bc-4398', source: '申诉', time: '2026-09-27 15:22', summary: '用户投诉转人工等待过长', detail: '低置信度转人工触发过晚，已循环 4 轮。', traceId: 'tr_9f2a01', version: 'v21' },
  ],
  blank: [],
};
export const problemStages = ['Prompt', '知识', '模型', '工具', '策略'] as const;
