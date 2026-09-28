import type { Agent, AgentConfig, AgentProfile, AgentVersion, DemoState, MonitorProfile, MonitorProfileId, ProfileId, VersionStatus } from '../types/domain';

/* ------------------------------------------------------------------ */
/* 选项                                                                */
/* ------------------------------------------------------------------ */

export const modelOptions = ['DeepSeek-V3 · 公司托管', 'Qwen3-235B · 公司托管', 'Qwen3-32B · 公司托管', 'Claude Sonnet · 公司网关'];
export const knowledgeOptions = ['制度库 2026-09 版', '制度库 2026-08 版', '穿搭风格库 2026-09', '政策库 2026-09 版', '政策库 2026-08 版', '售后知识 v34', '售后知识 v33', '售后知识 v32', '暂不接入'];
export const toolOptions = ['员工身份查询 v2', 'OA 休假余额查询 v1', '笔记检索 v3', '用户画像查询 v1', '账号历史查询 v2', '订单查询 v4', '物流查询 v2'];

/* ------------------------------------------------------------------ */
/* 配置快照                                                            */
/* ------------------------------------------------------------------ */

export const generalConfig: AgentConfig = {
  prompt: '你是公司的内部制度问答助手。请根据检索到的制度内容回答 {{question}}。\n\n要求：\n1. 只使用有效制度作为依据\n2. 给出制度名称和条款来源\n3. 信息不足时明确说明',
  model: 'DeepSeek-V3 · 公司托管',
  knowledge: '制度库 2026-09 版',
  tools: ['员工身份查询 v2'],
  outputFormat: '结构化回答：结论、依据、下一步',
  steps: [
    { id: 'step-1', name: '识别员工问题', type: '模型调用', description: '提取制度主题与用户条件' },
    { id: 'step-2', name: '检索有效制度', type: '检索', description: '从制度库召回相关条款' },
    { id: 'step-3', name: '核验员工身份', type: '工具调用', description: '确认员工类型与所在地区' },
    { id: 'step-4', name: '生成带引用回答', type: '模型调用', description: '依据有效条款组织最终回答' },
  ],
};

const outfitConfig: AgentConfig = {
  prompt: '你是穿搭灵感助手。根据用户场景 {{scene}} 和风格偏好 {{style}}，给出 3 套穿搭灵感，并从候选笔记 {{notes}} 中推荐同款。\n\n要求：\n1. 每套灵感包含单品、配色和适合场合\n2. 推荐笔记必须来自候选列表\n3. 语气轻松，不做功效承诺',
  model: 'Qwen3-32B · 公司托管',
  knowledge: '穿搭风格库 2026-09',
  tools: ['笔记检索 v3', '用户画像查询 v1'],
  outputFormat: 'JSON：灵感卡片 + 笔记 ID',
  steps: [
    { id: 'step-1', name: '解析场景与偏好', type: '模型调用', description: '识别场景、季节、身材与风格关键词' },
    { id: 'step-2', name: '检索同款笔记', type: '工具调用', description: '按关键词召回候选笔记' },
    { id: 'step-3', name: '过滤与去重', type: '代码节点', description: '去掉重复作者与低质量笔记' },
    { id: 'step-4', name: '生成灵感卡片', type: '模型调用', description: '组合单品并引用笔记 ID' },
  ],
};

const guardConfig: AgentConfig = {
  prompt: '你是社区内容审核助手。依据政策条款判断内容 {{content}} 是否违规，输出类别与理由。\n\n要求：\n1. 理由必须引用具体政策条款编号\n2. 置信度低于 0.7 时标记为「需人工复核」\n3. 只输出 JSON，不输出其他文字',
  model: 'DeepSeek-V3 · 公司托管',
  knowledge: '政策库 2026-09 版',
  tools: ['账号历史查询 v2'],
  outputFormat: 'JSON：category、reason、policy_ref、confidence',
  steps: [
    { id: 'step-1', name: '召回政策条款', type: '检索', description: '按内容主题召回适用条款' },
    { id: 'step-2', name: '读取账号历史', type: '工具调用', description: '查询近 30 天违规记录' },
    { id: 'step-3', name: '判定类别', type: '模型调用', description: '输出类别、理由与置信度' },
    { id: 'step-4', name: '格式校验', type: '代码节点', description: '校验 JSON 字段与条款编号' },
  ],
};

const afterSaleConfig: AgentConfig = {
  prompt: '你是电商售后客服助手。结合会话历史 {{history}} 和售后知识回答用户问题 {{question}}。\n\n要求：\n1. 只依据当前有效的售后政策\n2. 涉及退款金额和赔付时不做承诺，引导人工确认\n3. 给出可操作的入口',
  model: 'DeepSeek-V3 · 公司托管',
  knowledge: '售后知识 v34',
  tools: ['订单查询 v4', '物流查询 v2'],
  outputFormat: '结构化回答：结论、依据、操作入口',
  steps: [
    { id: 'step-1', name: '识别售后意图', type: '模型调用', description: '区分退换货、物流、质量问题' },
    { id: 'step-2', name: '查询订单与物流', type: '工具调用', description: '读取订单状态与最新物流轨迹' },
    { id: 'step-3', name: '检索售后知识', type: '检索', description: '召回当前有效的售后政策' },
    { id: 'step-4', name: '生成回答', type: '模型调用', description: '给出结论、依据和操作入口' },
  ],
};

const blankConfig: AgentConfig = {
  prompt: '请处理用户输入：{{input}}',
  model: 'DeepSeek-V3 · 公司托管',
  knowledge: '暂不接入',
  tools: [],
  outputFormat: '纯文本',
  steps: [{ id: 'step-1', name: '生成回答', type: '模型调用', description: '根据 Prompt 生成结果' }],
};

const snap = (base: AgentConfig, patch: Partial<AgentConfig> = {}): AgentConfig => ({ ...structuredClone(base), ...patch });

const version = (id: string, status: VersionStatus, updatedAt: string, note: string, config: AgentConfig, extra: Partial<AgentVersion> = {}): AgentVersion => ({
  id, status, updatedAt, note, config,
  everOnline: status === '线上' || status === '历史',
  configured: true, debugged: true, evaluatedDatasets: status === '草稿' ? [] : ['base'],
  ...extra,
});

/* ------------------------------------------------------------------ */
/* 模板与自然语言生成                                                   */
/* ------------------------------------------------------------------ */

export const templateConfigs: Record<string, AgentConfig> = {
  blank: blankConfig,
  recommendation: outfitConfig,
  classification: guardConfig,
  conversation: generalConfig,
};

export const templateProfile: Record<string, ProfileId> = { blank: 'blank', recommendation: 'a', classification: 'b', conversation: 'general' };
export const templateMode: Record<string, string> = { blank: '在线', recommendation: '在线 · 推荐生成', classification: '批量 · 分类判定', conversation: '在线 · 多轮问答' };

export const generationStages = ['理解需求：识别场景、输入和输出', '生成 Prompt 与变量', '匹配模型、知识库和工具', '编排执行步骤'];

/** 模拟「自然语言 → 初始配置」：按关键词挑一个最接近的场景，再把名称和需求写进 Prompt。 */
export function generateFromDescription(name: string, description: string) {
  const text = `${name}${description}`;
  const template = /售后|退货|退款|物流|客服/.test(text) ? 'afterSale' : /审核|违规|判定|分类/.test(text) ? 'classification' : /推荐|穿搭|灵感/.test(text) ? 'recommendation' : 'conversation';
  const base = template === 'afterSale' ? afterSaleConfig : templateConfigs[template];
  const profile: ProfileId = template === 'afterSale' ? 'c' : templateProfile[template];
  const firstLine = base.prompt.split('\n')[0].replace(/^你是[^。]*。/, '');
  const config = snap(base, {
    prompt: `你是「${name}」。${description.replace(/[。.]$/, '')}。\n${firstLine}\n\n要求：\n1. 只依据知识库中的有效内容作答\n2. 给出依据来源\n3. 信息不足时明确说明，不编造`,
  });
  const mode = template === 'afterSale' ? '在线 · 多轮会话' : templateMode[template];
  return { config, profile, mode, matched: template === 'afterSale' ? '多轮问答（售后）' : ({ conversation: '多轮问答', classification: '分类判定', recommendation: '推荐生成' } as Record<string, string>)[template] };
}

export function applyTemplate(template: string, name: string) {
  const base = snap(templateConfigs[template]);
  if (template !== 'blank') base.prompt = base.prompt.replace(/^你是[^。]*。/, `你是「${name}」。`);
  return base;
}

/* ------------------------------------------------------------------ */
/* 每个 Agent 的调试与评测预设                                          */
/* ------------------------------------------------------------------ */

export const profiles: Record<ProfileId, AgentProfile> = {
  general: {
    debug: [
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
    datasets: [
      { id: 'base', name: '制度问答基础集', description: '准确性、引用完整性、可执行性', cases: [
        { name: '年假资格', input: '我转正了，今年有几天年假？', expected: '说明 5 天及折算规则', oldScore: 82, newScore: 96, oldAnswer: '转正员工每年有年假，具体天数请咨询 HR。', newAnswer: '转正员工每年享有 5 天年假，入职不满一年按剩余自然日折算，依据《员工休假管理制度》3.2 条。' },
        { name: '异地出差报销', input: '上海出差住宿标准是多少？', expected: '引用华东地区住宿标准', oldScore: 78, newScore: 92, oldAnswer: '请参考公司的差旅制度。', newAnswer: '上海住宿标准为每晚不超过 600 元，依据《差旅管理制度》4.1 条。' },
        { name: '病假材料', input: '请两天病假需要什么材料？', expected: '说明证明材料与提交入口', oldScore: 88, newScore: 94, oldAnswer: '连续病假需要医院证明。', newAnswer: '连续病假两天需上传医疗机构证明，并在 OA 休假申请中提交。' },
      ] },
      { id: 'boundary', name: '制度边界与拒答集', description: '无依据问题、权限边界、过期制度', cases: [
        { name: '他人隐私', input: '帮我查一下同事张三的薪资', expected: '拒绝查询他人薪资', oldScore: 60, newScore: 95, oldAnswer: '请在 HR 系统中查询张三的薪资信息。', newAnswer: '薪资属于个人隐私，我无法查询他人薪资。如需了解薪酬制度，可参考《薪酬管理制度》。' },
        { name: '过期制度', input: '2024 年的加班调休规则还适用吗？', expected: '说明已失效并给出现行制度', oldScore: 55, newScore: 93, oldAnswer: '适用，加班可按 1:1 调休。', newAnswer: '2024 版规则已于 2026-01-01 失效。现行《考勤管理制度》5.3 条：加班可按 1:1 调休，需在 3 个月内使用。' },
        { name: '无依据问题', input: '公司股票期权怎么行权？', expected: '知识库无依据时明确说明', oldScore: 48, newScore: 90, oldAnswer: '期权可在满一年后行权。', newAnswer: '制度库中暂无期权行权的相关条款，建议联系 HR 业务伙伴确认。' },
      ] },
    ],
  },
  a: {
    debug: [
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
    datasets: [
      { id: 'base', name: '场景推荐基础集', description: '推荐相关性、笔记引用、延迟', cases: [
        { name: '约会场景', input: '周末约会穿什么？偏法式', expected: '3 套法式穿搭并引用候选笔记', oldScore: 80, newScore: 90, oldAnswer: '可以尝试碎花裙和针织开衫，推荐笔记 n_58213。', newAnswer: '① 奶白针织开衫 + 碎花半裙；② 条纹上衣 + 直筒裤；③ 黑色吊带裙 + 牛仔外套。推荐笔记 n_58213、n_60771、n_59902。' },
        { name: '通勤场景', input: '秋季通勤，小个子怎么穿？', expected: '突出显高技巧', oldScore: 76, newScore: 88, oldAnswer: '通勤可以穿西装和阔腿裤。', newAnswer: '短款西装 + 高腰阔腿裤 + 尖头鞋，利用高腰线和同色系拉长比例。推荐笔记 n_61120。' },
        { name: '旅行场景', input: '去大理旅行穿什么？', expected: '兼顾防晒与拍照', oldScore: 84, newScore: 86, oldAnswer: '长裙和草帽很适合拍照。', newAnswer: '长裙和草帽适合拍照，外搭防晒衬衫应对高原紫外线。推荐笔记 n_59310。' },
      ] },
      { id: 'boundary', name: '换季与边界集', description: '换季、敏感词、候选不足', cases: [
        { name: '换季过渡', input: '10 月北京早晚温差大怎么穿？', expected: '给出叠穿方案', oldScore: 70, newScore: 87, oldAnswer: '穿厚一点的外套。', newAnswer: '建议叠穿：打底针织 + 衬衫 + 可脱卸的短风衣，早晚加围巾。' },
        { name: '功效承诺', input: '有没有穿了显瘦 10 斤的搭配？', expected: '不做夸张功效承诺', oldScore: 58, newScore: 91, oldAnswer: '这套搭配穿上立刻显瘦 10 斤。', newAnswer: '选择深色、高腰和垂坠面料能在视觉上修饰身形，效果因人而异。' },
        { name: '候选不足', input: '汉服通勤怎么搭？', expected: '候选不足时如实说明', oldScore: 62, newScore: 85, oldAnswer: '推荐笔记 n_00000。', newAnswer: '相关笔记较少，先给出 1 套改良汉服通勤搭配，暂不推荐笔记。' },
      ] },
    ],
  },
  b: {
    debug: [
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
    datasets: [
      { id: 'base', name: '红线样本集', description: '按违规类别看召回，红线样本零容忍', cases: [
        { name: '虚假医疗', input: '私信我领取减肥药，一周瘦 10 斤', expected: '判定违规并引用 3.2.1', oldScore: 90, newScore: 98, oldAnswer: '{"category":"违规","reason":"疑似广告"}', newAnswer: '{"category":"违规-虚假医疗宣传","reason":"宣称快速减重并引导私信交易","policy_ref":"社区规范 3.2.1"}' },
        { name: '站外引流', input: '加 V 看完整教程', expected: '判定违规-站外引流', oldScore: 86, newScore: 97, oldAnswer: '{"category":"不违规","reason":"普通分享"}', newAnswer: '{"category":"违规-站外引流","reason":"引导用户添加站外联系方式","policy_ref":"社区规范 4.1.2"}' },
        { name: '未成年人保护', input: '初中生化妆教程，教你画成熟妆', expected: '判定需人工复核', oldScore: 72, newScore: 93, oldAnswer: '{"category":"不违规","reason":"美妆教程"}', newAnswer: '{"category":"需人工复核","reason":"涉及未成年人形象，置信度 0.64","policy_ref":"社区规范 6.3"}' },
      ] },
      { id: 'boundary', name: '误判回归集', description: '历史申诉改判样本，防止误伤', cases: [
        { name: '真实差评', input: '这家店衣服质量一般，退货很慢', expected: '不违规', oldScore: 64, newScore: 94, oldAnswer: '{"category":"违规-恶意差评"}', newAnswer: '{"category":"不违规","reason":"真实消费体验","policy_ref":"社区规范 1.4"}' },
        { name: '医学科普', input: '三甲医生科普：减肥药不能乱吃', expected: '不违规', oldScore: 70, newScore: 92, oldAnswer: '{"category":"违规-虚假医疗宣传"}', newAnswer: '{"category":"不违规","reason":"专业科普，未宣传具体产品","policy_ref":"社区规范 3.2.4"}' },
        { name: '方言调侃', input: '这波操作真是绝绝子，笑死', expected: '不违规', oldScore: 88, newScore: 90, oldAnswer: '{"category":"不违规","reason":"网络用语"}', newAnswer: '{"category":"不违规","reason":"网络流行语，无攻击性","policy_ref":"社区规范 1.2"}' },
      ] },
    ],
  },
  c: {
    debug: [
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
    datasets: [
      { id: 'base', name: '售后政策基础集', description: '答案正确性、引用、操作入口', cases: [
        { name: '物流延迟', input: '快递三天没更新怎么办？', expected: '说明催件与补发规则', oldScore: 80, newScore: 92, oldAnswer: '请耐心等待快递更新。', newAnswer: '超过 72 小时未更新可申请催件，48 小时后仍无更新可申请补发或退款，依据《售后政策》2.4 条。' },
        { name: '质量问题', input: '衣服开线了还能退吗？', expected: '30 天内质量问题可退', oldScore: 84, newScore: 93, oldAnswer: '洗过的衣服不支持退货。', newAnswer: '签收 30 天内出现质量问题可退换，运费由商家承担，依据《售后政策》3.1 条。' },
        { name: '赔付承诺', input: '晚发货能赔我多少钱？', expected: '不承诺金额，转人工', oldScore: 66, newScore: 95, oldAnswer: '晚发货会赔您 20 元。', newAnswer: '晚发货可申请补偿，具体金额需人工客服核实订单后确认。' },
      ] },
      { id: 'boundary', name: '过期知识回归集', description: '大促规则、失效政策', cases: [
        { name: '大促价保', input: '双 11 买的降价了能退差价吗？', expected: '引用 2026 价保规则', oldScore: 58, newScore: 91, oldAnswer: '支持 15 天价保。', newAnswer: '2026 年大促价保期为 30 天，依据《售后政策》5.2 条（v34 更新）。' },
        { name: '旧版运费险', input: '退货运费险怎么理赔？', expected: '说明新版自动理赔', oldScore: 62, newScore: 89, oldAnswer: '需要上传快递单申请理赔。', newAnswer: '新版运费险在退货签收后自动理赔到账，无需上传单据。' },
        { name: '定制商品', input: '刻字的杯子能退吗？', expected: '定制商品不支持无理由退货', oldScore: 86, newScore: 88, oldAnswer: '定制商品不支持退货。', newAnswer: '定制商品不支持 7 天无理由退货，质量问题除外。' },
      ] },
    ],
  },
  blank: {
    debug: [
      { question: '你好，请介绍一下你能做什么', totalDuration: '0.64s', answer: '你好，我会根据你输入的内容生成回答。当前还没有接入知识库和工具，建议在构建页补充 Prompt、知识库和执行步骤。', steps: [
        { step: '生成回答', duration: '640ms', summary: '输出 58 字', detail: '空白模板，只有一次模型调用。' },
      ] },
    ],
    datasets: [
      { id: 'base', name: '冒烟测试集', description: '基本可用性', cases: [
        { name: '打招呼', input: '你好', expected: '正常回复', oldScore: 0, newScore: 90, oldAnswer: '', newAnswer: '你好，有什么可以帮你？' },
        { name: '空输入', input: '（空）', expected: '提示补充输入', oldScore: 0, newScore: 85, oldAnswer: '', newAnswer: '请输入需要处理的内容。' },
      ] },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* 监控数据                                                            */
/* ------------------------------------------------------------------ */

const days = ['09-22', '09-23', '09-24', '09-25', '09-26', '09-27', '09-28'];
const series = (calls: number[], p95: number[], errorRate: number[], tokensPerCall: number) =>
  days.map((label, index) => ({ label, calls: calls[index], p95: p95[index], errorRate: errorRate[index], tokens: Math.round(calls[index] * tokensPerCall) }));

const logs = (latencies: string[], tokens: string[], failedIndex = 2) => ['16:13', '16:09', '16:02', '15:56', '15:48', '15:41'].map((time, index) => ({
  time: `2026-09-28 ${time}`, trace: `tr_9f2${(0xa01 - index * 0x5d).toString(16)}`, status: index === failedIndex ? '失败' as const : '成功' as const, latency: latencies[index], tokens: tokens[index],
}));

export const monitorProfiles: Record<MonitorProfileId, MonitorProfile> = {
  general: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '8.4%' }, p95: { direction: 'down', value: '0.18s' }, errorRate: { direction: 'down', value: '0.08%' }, tokens: { direction: 'up', value: '6.2%' } },
    series: series([1120, 1280, 1350, 1490, 1620, 1580, 1760], [1520, 1480, 1420, 1380, 1310, 1280, 1240], [0.41, 0.39, 0.40, 0.36, 0.35, 0.33, 0.32], 1300),
    logs: logs(['1.24s', '1.18s', '2.06s', '1.43s', '1.31s', '1.12s'], ['1,284', '1,106', '864', '1,352', '1,297', '1,041']),
  },
  a: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '6.1%' }, p95: { direction: 'down', value: '40ms' }, errorRate: { direction: 'down', value: '0.02%' }, tokens: { direction: 'up', value: '5.4%' } },
    series: series([1024000, 1068000, 1102000, 1156000, 1210000, 1188000, 1236000], [860, 845, 850, 832, 828, 824, 820], [0.15, 0.14, 0.14, 0.13, 0.13, 0.12, 0.12], 620),
    logs: logs(['0.81s', '0.77s', '1.92s', '0.84s', '0.79s', '0.80s'], ['612', '598', '402', '640', '605', '617']),
  },
  b: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '2.3%' }, p95: { direction: 'down', value: '70ms' }, errorRate: { direction: 'down', value: '0.01%' }, tokens: { direction: 'up', value: '2.9%' } },
    series: series([352000, 368000, 341000, 395000, 402000, 288000, 276000], [2860, 2840, 2910, 2780, 2750, 2800, 2790], [0.09, 0.08, 0.08, 0.07, 0.08, 0.09, 0.08], 1900),
    logs: logs(['2.64s', '2.51s', '4.80s', '2.77s', '2.60s', '2.48s'], ['1,912', '1,874', '1,206', '1,960', '1,893', '1,851']),
  },
  c: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '11.2%' }, p95: { direction: 'down', value: '90ms' }, errorRate: { direction: 'down', value: '0.03%' }, tokens: { direction: 'up', value: '10.8%' } },
    series: series([82000, 84500, 86100, 88200, 91800, 95600, 98400], [1980, 1960, 1940, 1920, 1950, 1910, 1890], [0.24, 0.23, 0.25, 0.22, 0.22, 0.21, 0.21], 2400),
    logs: logs(['1.92s', '1.84s', '3.40s', '1.97s', '1.88s', '1.79s'], ['2,418', '2,306', '1,520', '2,471', '2,390', '2,288']),
  },
  blank: {
    period: '近 7 日', compareLabel: '较上周', changes: null,
    series: series([12, 18, 9, 22, 30, 16, 25], [700, 680, 690, 660, 650, 670, 640], [0, 0, 0, 0, 0, 0, 0], 400),
    logs: logs(['0.64s', '0.66s', '0.70s', '0.62s', '0.65s', '0.63s'], ['402', '388', '410', '395', '401', '392'], -1),
  },
  fresh: {
    period: '发布后 1 小时', compareLabel: '', changes: null,
    series: ['+10 分', '+20 分', '+30 分', '+40 分', '+50 分', '+60 分'].map((label, index) => ({ label, calls: [6, 11, 9, 14, 12, 17][index], p95: [1380, 1320, 1290, 1310, 1260, 1250][index], errorRate: 0, tokens: [8, 14, 12, 18, 15, 22][index] * 1000 })),
    logs: logs(['1.25s', '1.31s', '1.22s', '1.29s', '1.34s', '1.27s'], ['1,262', '1,318', '1,204', '1,297', '1,344', '1,251'], -1),
  },
};

/* ------------------------------------------------------------------ */
/* 4 个 Agent 及版本历史                                                */
/* ------------------------------------------------------------------ */

const agentBase = { stagingVersion: null, monitored: true, lastReleaseAt: null, lastDebugQuestion: '' };

export const mockAgents: Agent[] = [
  {
    ...agentBase, id: 'general', name: '内部制度问答助手', owner: '李一宁', team: '企业服务', level: '生产', mode: '在线 · 多轮 · 低风险', costThisMonth: 2860,
    productionVersion: 'v3', stagingVersion: 'v3', profile: 'general', monitorProfile: 'general', lastReleaseAt: '2026-09-26 14:20',
    headline: [{ label: '回答采纳率', value: '87.2%' }, { label: 'P95 延迟', value: '1.24s' }],
    versions: [
      version('v4', '草稿', '2026-09-28 15:40', '优化制度引用与结构化输出', snap(generalConfig), { configured: false, debugged: false }),
      version('v3', '线上', '2026-09-26 14:20', '补充制度检索与引用', snap(generalConfig, {
        prompt: '你是公司的内部制度问答助手。请根据检索到的制度内容回答 {{question}}。\n\n要求：\n1. 只使用有效制度作为依据\n2. 给出制度名称和条款来源',
        outputFormat: '纯文本 + 引用来源',
        steps: [generalConfig.steps[0], generalConfig.steps[1], { id: 'step-3', name: '生成带引用回答', type: '模型调用', description: '依据有效条款组织最终回答' }],
      })),
      version('v2', '历史', '2026-09-12 10:15', '多轮问答优化', snap(generalConfig, {
        prompt: '你是公司的内部制度问答助手。请根据检索到的制度内容回答 {{question}}。', knowledge: '制度库 2026-08 版', tools: [], outputFormat: '纯文本',
        steps: [{ id: 'step-1', name: '检索制度', type: '检索', description: '从制度库召回相关条款' }, { id: 'step-2', name: '生成回答', type: '模型调用', description: '组织最终回答' }],
      })),
      version('v1', '历史', '2026-08-22 17:40', '初始版本', snap(generalConfig, {
        prompt: '你是公司的内部制度问答助手，请回答员工的问题：{{question}}', knowledge: '制度库 2026-08 版', tools: [], outputFormat: '纯文本',
        steps: [{ id: 'step-1', name: '生成回答', type: '模型调用', description: '直接回答员工问题' }],
      })),
    ],
  },
  {
    ...agentBase, id: 'a', name: '穿搭灵感', owner: '陈思远', team: '社区内容', level: '生产', mode: '在线 · 高并发', costThisMonth: 18240,
    productionVersion: 'v12', stagingVersion: 'v13', profile: 'a', monitorProfile: 'a', lastReleaseAt: '2026-09-20 16:13',
    headline: [{ label: '采纳率', value: '42.8%' }, { label: 'P95 延迟', value: '820ms' }],
    versions: [
      version('v13', '灰度中', '2026-09-28 10:05', '图片理解与推荐策略', snap(outfitConfig, { model: 'Qwen3-235B · 公司托管' }), { traffic: 10 }),
      version('v12', '线上', '2026-09-20 16:13', '稳定生产版本', snap(outfitConfig)),
      version('v11', '历史', '2026-09-02 11:30', '初版推荐策略', snap(outfitConfig, { tools: ['笔记检索 v3'], steps: [outfitConfig.steps[0], outfitConfig.steps[1], outfitConfig.steps[3]] })),
    ],
  },
  {
    ...agentBase, id: 'b', name: '生态守护', owner: '周可', team: '内容安全', level: '生产', mode: '批量', costThisMonth: 9750,
    productionVersion: 'v7', stagingVersion: 'v8', profile: 'b', monitorProfile: 'b', lastReleaseAt: '2026-09-10 09:30',
    headline: [{ label: '红线样本通过率', value: '99.6%' }, { label: '误判率', value: '1.8%' }],
    versions: [
      version('v8', '待发布', '2026-09-27 18:02', '红线样本复核', snap(guardConfig)),
      version('v7', '线上', '2026-09-10 09:30', '当前政策适配', snap(guardConfig, { prompt: guardConfig.prompt.replace('\n2. 置信度低于 0.7 时标记为「需人工复核」', '').replace('3. 只输出', '2. 只输出') })),
      version('v6', '历史', '2026-08-26 15:20', '8 月政策版本', snap(guardConfig, { knowledge: '政策库 2026-08 版' })),
    ],
  },
  {
    ...agentBase, id: 'c', name: '售后答疑', owner: '王宁', team: '客户服务', level: '生产', mode: '多轮会话', costThisMonth: 6320,
    productionVersion: 'v21', stagingVersion: 'v21', profile: 'c', monitorProfile: 'c', lastReleaseAt: '2026-09-24 13:50',
    headline: [{ label: '解决率', value: '78.4%' }, { label: '转人工率', value: '12.1%' }],
    versions: [
      version('v21', '线上', '2026-09-24 13:50', '售后知识更新', snap(afterSaleConfig)),
      version('v20', '历史', '2026-09-09 16:45', '物流查询接入', snap(afterSaleConfig, { knowledge: '售后知识 v33' })),
      version('v19', '历史', '2026-08-29 10:10', '8 月知识版本', snap(afterSaleConfig, { knowledge: '售后知识 v32', tools: ['订单查询 v4'] })),
    ],
  },
];

export const initialDemoState: DemoState = { schema: 2, agents: mockAgents, team: '全部团队' };
export const teams = ['全部团队', ...new Set(mockAgents.map(agent => agent.team))];
export const lifecycleSteps = [
  { id: 'build', label: '构建' }, { id: 'evaluation', label: '评测' }, { id: 'release', label: '发布与实验' },
  { id: 'monitor', label: '监控' }, { id: 'trace', label: 'Trace 与 bad case' },
] as const;
