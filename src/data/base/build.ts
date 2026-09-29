/** 构建：模型选项、调试预设（按 profile），以及依赖锁定用到的版本信息。 */
import type { BaseProfileId, DebugPreset } from '../../types/domain';

export const modelOptions = ['DeepSeek-V3 · 公司托管', 'Qwen3-235B · 公司托管', 'Qwen3-32B · 公司托管', 'Claude Sonnet · 公司网关'];

/* 调试预设：输入问题 → 预设回答和中间步骤，不调用真实模型 */
export const debugProfiles: Record<BaseProfileId, DebugPreset[]> = {
  general: [
    { question: '我已经转正，今年有几天年假？', totalDuration: '1.24s', answer: '可以休 5 天。根据《员工休假管理制度》第 3.2 条，转正员工每年享有 5 天带薪年假；入职不满一年的，按当年剩余自然日折算。可在 OA「休假申请」中查看可用天数。', steps: [
      { step: '识别员工问题', duration: '118ms', summary: '主题：年假；条件：转正员工', detail: '识别到用户询问年假资格与天数。' },
      { step: '检索有效制度', duration: '436ms', summary: '召回 3 条，采用 1 条', detail: '《员工休假管理制度》3.2 条，生效日期 2026-01-01。' },
      { step: '核验员工身份', duration: '182ms', summary: '员工类型：正式员工', detail: '员工身份查询 v2 → status=regular, region=上海' },
      { step: '生成带引用回答', duration: '504ms', summary: '输出 96 字，引用 1 条', detail: '回答包含结论、制度依据和下一步操作。' },
    ] },
    { question: '上海出差住宿标准是多少？', totalDuration: '1.08s', answer: '每晚不超过 600 元。依据《差旅管理制度》第 4.1 条，华东一线城市住宿标准为 600 元/晚，超标部分需部门负责人审批。报销时在 OA「差旅报销」上传发票。', steps: [
      { step: '识别员工问题', duration: '96ms', summary: '主题：差旅住宿；地区：上海', detail: '识别到出差城市为上海，属于华东一线城市。' },
      { step: '检索有效制度', duration: '402ms', summary: '召回 4 条，采用 1 条', detail: '《差旅管理制度》4.1 条，生效日期 2026-03-01。' },
      { step: '核验员工身份', duration: '164ms', summary: '职级：P6', detail: '员工身份查询 v2 → level=P6，适用普通员工标准。' },
      { step: '生成带引用回答', duration: '418ms', summary: '输出 82 字，引用 1 条', detail: '回答包含标准、审批要求和报销入口。' },
    ] },
    { question: '请两天病假需要什么材料？', totalDuration: '1.16s', answer: '需要医疗机构出具的病假证明。依据《员工休假管理制度》第 5.1 条，连续病假 2 天及以上需上传证明，在 OA「休假申请」中选择病假并附件提交。', steps: [
      { step: '识别员工问题', duration: '102ms', summary: '主题：病假；时长：2 天', detail: '识别到病假时长达到提交证明的门槛。' },
      { step: '检索有效制度', duration: '451ms', summary: '召回 2 条，采用 1 条', detail: '《员工休假管理制度》5.1 条。' },
      { step: '核验员工身份', duration: '150ms', summary: '员工类型：正式员工', detail: '员工身份查询 v2 → status=regular' },
      { step: '生成带引用回答', duration: '457ms', summary: '输出 74 字，引用 1 条', detail: '回答包含所需材料与提交入口。' },
    ] },
  ],
  a: [
    { question: '周末约会穿什么？偏法式', totalDuration: '0.82s', answer: '① 奶白针织开衫 + 碎花半裙 + 玛丽珍鞋；② 条纹上衣 + 高腰直筒裤 + 贝雷帽；③ 黑色吊带裙 + 牛仔外套。推荐笔记：n_58213、n_60771、n_59902。', steps: [
      { step: '解析场景与偏好', duration: '96ms', summary: '场景：约会；风格：法式', detail: 'scene=date, style=french, season=autumn' },
      { step: '检索同款笔记', duration: '284ms', summary: '召回 42 篇笔记', detail: '笔记检索 v3 → top_k=42，平均相关度 0.81' },
      { step: '过滤与去重', duration: '38ms', summary: '保留 9 篇', detail: '去掉同一作者重复 12 篇、低互动 21 篇。' },
      { step: '生成灵感卡片', duration: '402ms', summary: '3 张卡片，引用 3 篇笔记', detail: '输出 JSON：cards[3]，note_ids[3]。' },
    ] },
    { question: '秋季通勤，小个子怎么穿显高？', totalDuration: '0.79s', answer: '① 短款西装 + 高腰阔腿裤 + 尖头鞋；② 同色系针织套装 + 乐福鞋；③ 短风衣 + 九分烟管裤。推荐笔记：n_61120、n_60233、n_58877。', steps: [
      { step: '解析场景与偏好', duration: '88ms', summary: '场景：通勤；身材：小个子', detail: 'scene=commute, body=petite, season=autumn' },
      { step: '检索同款笔记', duration: '271ms', summary: '召回 36 篇笔记', detail: '笔记检索 v3 → top_k=36' },
      { step: '过滤与去重', duration: '35ms', summary: '保留 8 篇', detail: '去掉重复作者与低质量笔记。' },
      { step: '生成灵感卡片', duration: '396ms', summary: '3 张卡片，引用 3 篇笔记', detail: '输出 JSON：cards[3]，note_ids[3]。' },
    ] },
  ],
  b: [
    { question: '笔记：「私信我领取减肥药，一周瘦 10 斤」', totalDuration: '2.64s', answer: '{"category":"违规-虚假医疗宣传","reason":"宣称药品具有快速减重功效并引导私信交易","policy_ref":"社区规范 3.2.1","confidence":0.96}', steps: [
      { step: '召回政策条款', duration: '612ms', summary: '召回 5 条，命中 1 条', detail: '社区规范 3.2.1：禁止发布夸大医疗功效的内容。' },
      { step: '读取账号历史', duration: '248ms', summary: '近 30 天违规 2 次', detail: '账号历史查询 v2 → violations_30d=2' },
      { step: '判定类别', duration: '1.62s', summary: '违规，置信度 0.96', detail: 'category=违规-虚假医疗宣传' },
      { step: '格式校验', duration: '12ms', summary: 'JSON 字段完整', detail: '字段 category / reason / policy_ref / confidence 均存在。' },
    ] },
    { question: '评论：「这家店衣服质量一般，退货很慢」', totalDuration: '2.31s', answer: '{"category":"不违规","reason":"属于真实消费体验的负面评价，不含辱骂或引流","policy_ref":"社区规范 1.4","confidence":0.91}', steps: [
      { step: '召回政策条款', duration: '588ms', summary: '召回 3 条，命中 1 条', detail: '社区规范 1.4：允许真实、客观的消费评价。' },
      { step: '读取账号历史', duration: '231ms', summary: '近 30 天无违规', detail: '账号历史查询 v2 → violations_30d=0' },
      { step: '判定类别', duration: '1.48s', summary: '不违规，置信度 0.91', detail: 'category=不违规' },
      { step: '格式校验', duration: '11ms', summary: 'JSON 字段完整', detail: '校验通过。' },
    ] },
  ],
  c: [
    { question: '我的快递三天没更新了怎么办？', totalDuration: '1.92s', answer: '订单 SO2609281043 的物流最后更新于 09-25 在杭州转运中心。依据《售后政策》2.4 条，超过 72 小时未更新可申请催件；已为你生成催件工单入口：订单详情 → 联系快递。若 48 小时后仍无更新，可申请补发或退款，具体金额由人工客服确认。', steps: [
      { step: '识别售后意图', duration: '124ms', summary: '意图：物流异常', detail: 'intent=logistics_delay' },
      { step: '查询订单与物流', duration: '538ms', summary: '最后更新 09-25 杭州转运中心', detail: '订单查询 v4 + 物流查询 v2 → stalled_hours=76' },
      { step: '检索售后知识', duration: '462ms', summary: '命中《售后政策》2.4 条', detail: '售后知识 v34，生效日期 2026-09-01。' },
      { step: '生成回答', duration: '796ms', summary: '输出 118 字，未承诺金额', detail: '包含结论、依据、操作入口；退款金额交由人工确认。' },
    ] },
    { question: '衣服洗了一次开线了还能退吗？', totalDuration: '1.84s', answer: '可以申请质量问题售后。依据《售后政策》3.1 条，签收 30 天内出现开线等质量问题，可申请退货或换货，运费由商家承担。请在订单详情上传开线照片，是否全额退款由人工客服审核后确认。', steps: [
      { step: '识别售后意图', duration: '118ms', summary: '意图：质量问题退货', detail: 'intent=quality_return' },
      { step: '查询订单与物流', duration: '492ms', summary: '签收 12 天', detail: '订单查询 v4 → signed_days=12' },
      { step: '检索售后知识', duration: '441ms', summary: '命中《售后政策》3.1 条', detail: '售后知识 v34。' },
      { step: '生成回答', duration: '789ms', summary: '输出 104 字，未承诺金额', detail: '包含上传凭证入口与人工审核说明。' },
    ] },
  ],
  blank: [
    { question: '你好，请介绍一下你能做什么', totalDuration: '0.64s', answer: '你好，我会根据你输入的内容生成回答。当前还没有接入知识库和工具，建议在构建页补充 Prompt、知识库和执行步骤。', steps: [
      { step: '生成回答', duration: '640ms', summary: '输出 58 字', detail: '空白模板，只有一次模型调用。' },
    ] },
  ],
};

/* ① 依赖锁定：版本快照里记录的具体依赖版本，以及上游当前最新版本 */
export const modelLocks: Record<string, string> = {
  'DeepSeek-V3 · 公司托管': 'deepseek-v3 · 权重 2026-08-30',
  'Qwen3-235B · 公司托管': 'qwen3-235b-a22b · 权重 2026-09-10',
  'Qwen3-32B · 公司托管': 'qwen3-32b · 权重 2026-07-18',
  'Claude Sonnet · 公司网关': 'claude-sonnet · 网关路由 2026-09',
};
/** 上游已有更新的依赖：key 为快照中锁定的版本。null 表示已是最新。 */
export const upstreamChanges: Record<string, { latest: string; at: string; note: string } | null> = {
  '笔记检索 v3': { latest: '笔记检索 v4', at: '2026-09-26 18:05', note: '召回改为图文混合向量，返回字段新增 cover_score' },
};
