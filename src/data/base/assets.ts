/**
 * 资产中心的初始数据：工具、模型、Prompt 模板都是版本化记录（新版本在前）。
 * 评测集的初始数据来自 evaluation.ts 的 datasetProfiles，只有被修改或新建后才写进演示状态。
 * 所有数字均为演示数据。
 */
import type { AssetParam, AssetRecord, AssetState, DatabaseContent, EvalCase, ModelContent, PromptContent, ToolContent } from '../../types/domain';

const p = (name: string, type: string, required: string, desc: string): AssetParam => ({ name, type, required, desc });
const tool = (partial: Partial<ToolContent> & Pick<ToolContent, 'endpoint' | 'instruction' | 'params' | 'sample'>): ToolContent =>
  ({ protocol: 'HTTP', auth: '服务账号', timeout: '800ms', qps: '500', access: '只读', dataLevel: '可处理用户数据', callers: '全公司', ...partial });

export const initialTools: AssetRecord<ToolContent>[] = [
  { key: '员工身份查询', name: '员工身份查询', team: 'HR 系统组', owner: '何静', description: '查询员工职级、入职日期和所属部门', visibility: '全公司', versions: [
    { id: 'v2', status: '已发布', at: '2026-08-12 10:00', by: '何静', note: '新增 level 字段（职级）', content: tool({ endpoint: 'hr.identity.get', instruction: '需要按员工职级、入职年限回答制度问题时调用；只返回当前提问员工本人的信息。', dataLevel: '可处理员工数据', callers: '企业服务', params: [p('employee_id', 'string', '平台注入', '当前提问的员工'), p('→ level', 'string', '—', '职级（v2 新增）')], sample: 'employee_id=E10086 → 200 · 64ms · {"level":"P6","joined":"2023-04-01"}' }) },
    { id: 'v1', status: '已发布', at: '2026-05-20 15:30', by: '何静', note: '初始版本', content: tool({ endpoint: 'hr.identity.get', instruction: '查询当前员工的入职日期和部门。', dataLevel: '可处理员工数据', callers: '企业服务', params: [p('employee_id', 'string', '平台注入', '当前提问的员工')], sample: 'employee_id=E10086 → 200 · 70ms' }) },
  ] },
  { key: 'OA 休假余额查询', name: 'OA 休假余额查询', team: 'OA 平台组', owner: '孙浩', description: '查询员工剩余年假、调休天数', visibility: '全公司', versions: [
    { id: 'v1', status: '已发布', at: '2026-07-02 11:00', by: '孙浩', note: '初始版本', content: tool({ endpoint: 'oa.leave.balance', instruction: '员工询问自己还有几天年假或调休时调用。', dataLevel: '可处理员工数据', callers: '企业服务', params: [p('employee_id', 'string', '平台注入', '当前提问的员工'), p('year', 'number', '否', '年份，默认今年')], sample: 'employee_id=E10086 → 200 · 58ms · {"annual":4.5,"compensatory":1}' }) },
  ] },
  { key: '笔记检索', name: '笔记检索', team: '搜索中台', owner: '林默', description: '按场景和风格检索社区笔记，只返回公开可见的笔记', visibility: '全公司', versions: [
    { id: 'v4', status: '已发布', at: '2026-09-26 18:05', by: '林默', note: '召回改为图文混合向量，返回字段新增 cover_score', content: tool({ endpoint: 'note.search', timeout: '300ms', qps: '3000', instruction: '需要推荐社区里的同款笔记时调用；只返回公开可见的笔记。', callers: '社区内容', params: [p('query', 'string', '是', '场景与风格描述'), p('image_vector', 'float[]', '否', '图片向量（v4 新增）'), p('→ cover_score', 'number', '—', '封面相关度（v4 新增）')], sample: 'query=法式约会 → 200 · 182ms · 召回 42 篇' }) },
    { id: 'v3', status: '已发布', at: '2026-07-10 14:20', by: '林默', note: '按可见性过滤', content: tool({ endpoint: 'note.search', timeout: '300ms', qps: '3000', instruction: '需要推荐社区里的同款笔记时调用；只返回公开可见的笔记。', callers: '社区内容', params: [p('query', 'string', '是', '场景与风格描述')], sample: 'query=法式约会 → 200 · 150ms · 召回 38 篇' }) },
  ] },
  { key: '用户画像查询', name: '用户画像查询', team: '用户增长数据组', owner: '许诺', description: '查询用户的风格偏好标签（脱敏）', visibility: '社区内容', versions: [
    { id: 'v1', status: '已发布', at: '2026-08-30 09:40', by: '许诺', note: '初始版本', content: tool({ endpoint: 'profile.user.get', timeout: '150ms', qps: '3000', instruction: '需要结合用户偏好个性化推荐时调用；只返回脱敏后的偏好标签。', callers: '社区内容', params: [p('user_id', 'string', '平台注入', '当前用户')], sample: 'user_id=U7788 → 200 · 41ms · {"styles":["法式","低饱和"]}' }) },
  ] },
  { key: '账号历史查询', name: '账号历史查询', team: '风控平台', owner: '高远', description: '查询账号历史违规与申诉记录', visibility: '内容安全', versions: [
    { id: 'v2', status: '已发布', at: '2026-08-05 16:00', by: '高远', note: '新增申诉改判记录', content: tool({ endpoint: 'risk.account.history', qps: '1000', instruction: '判定内容是否违规时，需要参考发布者历史违规和申诉情况时调用。', callers: '内容安全', params: [p('account_id', 'string', '是', '发布者账号'), p('→ appeals', 'array', '—', '申诉与改判记录（v2 新增）')], sample: 'account_id=A5566 → 200 · 95ms · 历史违规 1 次' }) },
    { id: 'v1', status: '已发布', at: '2026-06-01 10:00', by: '高远', note: '初始版本', content: tool({ endpoint: 'risk.account.history', qps: '1000', instruction: '查询发布者历史违规记录。', callers: '内容安全', params: [p('account_id', 'string', '是', '发布者账号')], sample: 'account_id=A5566 → 200 · 90ms' }) },
  ] },
  { key: '订单查询', name: '订单查询', team: '交易中台', owner: '周楠', description: '按订单号查询订单状态、商品、实付金额和售后资格', visibility: '全公司', versions: [
    { id: 'v4', status: '已发布', at: '2026-08-20 10:30', by: '周楠', note: '新增 aftersale_eligible 字段', content: tool({ endpoint: 'trade.order.get', instruction: '按订单号查询订单状态、商品、实付金额和售后资格。只读，不会修改订单。', callers: '客户服务', params: [p('order_id', 'string', '是', '订单号'), p('user_id', 'string', '平台注入', '当前会话用户'), p('→ aftersale_eligible', 'bool', '—', '是否可申请售后（v4 新增）')], sample: 'order_id=O20260928001 → 200 · 86ms · {"status":"已签收","aftersale_eligible":true}' }) },
    { id: 'v3', status: '已发布', at: '2026-06-02 11:00', by: '周楠', note: '金额改为以分为单位', content: tool({ endpoint: 'trade.order.get', instruction: '按订单号查询订单状态、商品和实付金额。', callers: '客户服务', params: [p('order_id', 'string', '是', '订单号'), p('user_id', 'string', '平台注入', '当前会话用户')], sample: 'order_id=O20260928001 → 200 · 90ms' }) },
  ] },
  { key: '物流查询', name: '物流查询', team: '物流中台', owner: '马骁', description: '查询包裹物流轨迹与预计送达时间', visibility: '全公司', versions: [
    { id: 'v2', status: '已发布', at: '2026-09-01 09:00', by: '马骁', note: '新增预计送达时间', content: tool({ endpoint: 'logistics.track', instruction: '用户询问快递到哪了、什么时候到时调用。', callers: '客户服务', params: [p('order_id', 'string', '是', '订单号'), p('→ eta', 'string', '—', '预计送达（v2 新增）')], sample: 'order_id=O20260928001 → 200 · 120ms · {"stage":"派送中","eta":"2026-09-30"}' }) },
    { id: 'v1', status: '已发布', at: '2026-07-15 09:00', by: '马骁', note: '初始版本', content: tool({ endpoint: 'logistics.track', instruction: '查询包裹物流轨迹。', callers: '客户服务', params: [p('order_id', 'string', '是', '订单号')], sample: 'order_id=O20260928001 → 200 · 130ms' }) },
  ] },
];

const model = (content: ModelContent) => content;
/** 模型的版本号就是权重版本（外部模型为网关路由版本） */
export const initialModels: AssetRecord<ModelContent>[] = [
  { key: 'DeepSeek-V3 · 公司托管', name: 'DeepSeek-V3', channel: '公司托管', team: '模型平台组', owner: '韩叙', description: '通用文本与推理模型，适合知识问答、分类判定和结构化输出', visibility: '全公司', versions: [
    { id: '2026-08-30', status: '已发布', at: '2026-08-30 20:00', by: '韩叙', note: '推理能力提升，JSON 输出更稳定', content: model({ capabilities: ['文本', '推理'], context: '128K', priceIn: '2', priceOut: '8', p95: '420ms', dataLevel: '可处理用户数据', qps: '3000' }) },
    { id: '2026-06-12', status: '已发布', at: '2026-06-12 20:00', by: '韩叙', note: '初始接入（2026-09-15 起不再允许新版本选用）', content: model({ capabilities: ['文本', '推理'], context: '64K', priceIn: '2', priceOut: '8', p95: '460ms', dataLevel: '可处理用户数据', qps: '2000' }) },
  ] },
  { key: 'Qwen3-235B · 公司托管', name: 'Qwen3-235B', channel: '公司托管', team: '模型平台组', owner: '韩叙', description: '大参数通用模型，生成质量高，适合创意生成和复杂推理', visibility: '全公司', versions: [
    { id: '2026-09-10', status: '已发布', at: '2026-09-10 20:00', by: '韩叙', note: '升级到 A22B 权重', content: model({ capabilities: ['文本', '推理'], context: '128K', priceIn: '4', priceOut: '12', p95: '510ms', dataLevel: '可处理用户数据', qps: '1500' }) },
  ] },
  { key: 'Qwen3-32B · 公司托管', name: 'Qwen3-32B', channel: '公司托管', team: '模型平台组', owner: '韩叙', description: '低延迟、低成本，常用作高并发场景和降级时的备用模型', visibility: '全公司', versions: [
    { id: '2026-07-18', status: '已发布', at: '2026-07-18 20:00', by: '韩叙', note: '初始接入', content: model({ capabilities: ['文本', '低延迟'], context: '32K', priceIn: '1', priceOut: '4', p95: '180ms', dataLevel: '可处理用户数据', qps: '5000' }) },
  ] },
  { key: 'Claude Sonnet · 公司网关', name: 'Claude Sonnet', channel: '公司网关', team: '模型平台组', owner: '韩叙', description: '外部商业模型，经公司网关调用；长上下文能力强，只能处理内部数据', visibility: '需审批', versions: [
    { id: '网关路由 2026-09', status: '已发布', at: '2026-09-05 20:00', by: '韩叙', note: '网关路由更新', content: model({ capabilities: ['文本', '长上下文'], context: '200K', priceIn: '22', priceOut: '108', p95: '650ms', dataLevel: '仅内部数据 · 需审批', qps: '200' }) },
  ] },
];

const prompt = (content: PromptContent) => content;
const v = (name: string, desc: string, source: string) => ({ name, desc, source });
export const initialPrompts: AssetRecord<PromptContent>[] = [
  { key: '带引用的知识问答', name: '带引用的知识问答', team: '平台团队', owner: '平台团队', description: '检索知识后回答，并给出条款来源', visibility: '全公司', usedBy: ['内部制度问答助手', '电商售后答疑 Agent'], versions: [
    { id: 'v3', status: '已发布', at: '2026-09-12 10:00', by: '平台团队', note: '新增「没有依据时明确说明」', content: prompt({ kind: '问答', scene: '知识检索 + 多轮问答', structure: '角色 → 只依据有效知识 → 给出条款来源 → 无依据时明确说明', body: '你是{{role}}。请只依据下面检索到的知识回答 {{question}}。\n{{context}}\n\n要求：\n1. 只使用在生效期内的条款\n2. 给出条款来源\n3. 没有依据时明确说明，不要猜测', variables: [v('role', 'Agent 角色', '套用时填写'), v('question', '用户问题', '用户输入'), v('context', '检索到的知识', '平台注入')] }) },
    { id: 'v2', status: '已发布', at: '2026-08-01 10:00', by: '平台团队', note: '统一引用格式', content: prompt({ kind: '问答', scene: '知识检索 + 多轮问答', structure: '角色 → 只依据有效知识 → 给出条款来源', body: '你是{{role}}。请依据下面的知识回答 {{question}}，并给出条款来源。\n{{context}}', variables: [v('role', 'Agent 角色', '套用时填写'), v('question', '用户问题', '用户输入'), v('context', '检索到的知识', '平台注入')] }) },
  ] },
  { key: '多轮客服对话（含转人工）', name: '多轮客服对话（含转人工）', team: '客户服务', owner: '王宁', description: '结合会话历史答复，敏感承诺转人工', visibility: '全公司', usedBy: ['电商售后答疑 Agent'], versions: [
    { id: 'v2', status: '已发布', at: '2026-09-03 14:00', by: '王宁', note: '补充承诺类话术的处理', content: prompt({ kind: '对话', scene: '会话 + 敏感承诺拦截', structure: '角色 → 会话历史 → 依据知识答复 → 赔付与时效不承诺、引导转人工', body: '你是{{brand}}的售后客服。结合会话历史 {{history}} 和知识 {{context}} 回答 {{question}}。\n涉及赔付金额、时效承诺时，不要承诺，改为引导转人工。', variables: [v('brand', '品牌名', '套用时填写'), v('history', '会话历史', '平台注入'), v('context', '检索到的知识', '平台注入'), v('question', '用户问题', '用户输入')] }) },
  ] },
  { key: '结构化分类判定', name: '结构化分类判定', team: '内容安全', owner: '周可', description: '按政策条款判定并输出类别、理由、依据', visibility: '全公司', usedBy: ['生态守护 Agent'], versions: [
    { id: 'v2', status: '已发布', at: '2026-08-20 10:00', by: '周可', note: '低置信度标记人工复核', content: prompt({ kind: '分类', scene: '批量判定 + 人工复核', structure: '角色 → 依据政策条款 → 输出类别 / 理由 / 依据 JSON → 低置信度标记复核', body: '你是社区内容审核助手。依据政策条款 {{policy}} 判断内容 {{content}} 是否违规。\n只输出 JSON：{"category":…, "reason":…, "clause":…, "confidence":…}\n置信度低于 {{threshold}} 时 category 填「需人工复核」。', variables: [v('policy', '政策条款', '平台注入'), v('content', '待判定内容', '用户输入'), v('threshold', '复核阈值', '套用时填写')] }) },
  ] },
  { key: '场景推荐生成', name: '场景推荐生成', team: '社区内容', owner: '陈思远', description: '按场景和风格生成方案并引用候选内容', visibility: '全公司', usedBy: ['社区穿搭灵感 Agent'], versions: [
    { id: 'v1', status: '已发布', at: '2026-09-02 11:00', by: '陈思远', note: '初始版本', content: prompt({ kind: '生成', scene: '在线推荐 + 引用内容', structure: '角色 → 场景与偏好变量 → 生成 N 套方案 → 引用候选内容 → 不做功效承诺', body: '根据用户场景 {{scene}} 和风格偏好 {{style}}，给出 {{n}} 套方案，并从候选内容 {{notes}} 中推荐。\n不做夸张功效承诺。', variables: [v('scene', '用户场景', '用户输入'), v('style', '风格偏好', '平台注入'), v('n', '方案数量', '套用时填写'), v('notes', '候选内容', '平台注入')] }) },
  ] },
  { key: 'Query 改写与意图识别', name: 'Query 改写与意图识别', team: '搜索中台', owner: '林默', description: '检索前把口语问题改写成检索词，并识别意图', visibility: '全公司', usedBy: ['社区穿搭灵感 Agent', '电商售后答疑 Agent'], versions: [
    { id: 'v2', status: '已发布', at: '2026-08-28 16:00', by: '林默', note: '结合会话历史补全指代', content: prompt({ kind: '改写', scene: '检索前改写口语问题', structure: '结合会话历史补全指代 → 输出检索词和意图标签', body: '结合会话历史 {{history}}，把用户问题 {{query}} 改写成适合检索的关键词，并判断意图。\n只输出 JSON：{"keywords":[…], "intent":…}', variables: [v('history', '会话历史', '平台注入'), v('query', '用户问题', '用户输入')] }) },
  ] },
  { key: 'JSON 字段抽取', name: 'JSON 字段抽取', team: '平台团队', owner: '平台团队', description: '从非结构化文本中按字段表抽取信息', visibility: '全公司', usedBy: [], versions: [
    { id: 'v1', status: '已发布', at: '2026-09-18 10:00', by: '平台团队', note: '初始版本', content: prompt({ kind: '抽取', scene: '工单、申诉材料结构化', structure: '字段表 → 逐字段抽取 → 缺失填 null → 只输出 JSON', body: '从下面的文本中按字段表 {{fields}} 抽取信息，缺失的字段填 null，只输出 JSON。\n文本：{{text}}', variables: [v('fields', '字段表', '套用时填写'), v('text', '原始文本', '用户输入')] }) },
  ] },
  { key: '安全拒答与边界说明', name: '安全拒答与边界说明', team: '内容安全', owner: '周可', description: '越权、隐私、无依据问题的统一拒答口径', visibility: '全公司', usedBy: ['内部制度问答助手'], versions: [
    { id: 'v1', status: '已发布', at: '2026-09-08 10:00', by: '周可', note: '初始版本', content: prompt({ kind: '安全', scene: '越权与隐私问题', structure: '识别越权 / 隐私 / 无依据 → 说明不能回答的原因 → 给出可行的替代途径', body: '遇到以下问题时礼貌拒答并说明原因：查询他人隐私、超出 {{scope}} 的问题、知识库无依据的问题。\n拒答后给出可行的替代途径。', variables: [v('scope', 'Agent 负责的范围', '套用时填写')] }) },
  ] },
  { key: '长文本摘要', name: '长文本摘要', team: '平台团队', owner: '平台团队', description: '会议纪要、长文档的分层摘要', visibility: '全公司', usedBy: [], versions: [
    { id: 'v1', status: '已发布', at: '2026-09-20 10:00', by: '平台团队', note: '初始版本', content: prompt({ kind: '生成', scene: '会议纪要、长文档', structure: '一句话结论 → 3–5 条要点 → 待办与负责人', body: '把下面的文本整理成：一句话结论、3–5 条要点、待办与负责人。\n文本：{{text}}', variables: [v('text', '原始文本', '用户输入')] }) },
  ] },
];

/** 数据库：结构化数据（上传表格或连接业务库）；版本对应表结构，查询的是实时数据。Agent 版本最多挂 1 个。 */
const db = (tables: DatabaseContent['tables'], source: DatabaseContent['source'] = '连接业务库', dataLevel = '可处理用户数据'): DatabaseContent => ({ source, tables, dataLevel, access: '只读' });
export const initialDatabases: AssetRecord<DatabaseContent>[] = [
  { key: '单品标签库', name: '单品标签库', team: '社区内容', owner: '陈思远', description: '单品的风格、版型、适合身材与季节标签，推荐时按标签过滤', visibility: '社区内容', versions: [
    { id: 'v2', status: '已发布', at: '2026-09-10 10:00', by: '陈思远', note: '新增「适合身材」字段', content: db([{ name: 'items', fields: '单品 ID、品类、风格、版型、适合身材、季节', rows: 182400 }, { name: 'color_palette', fields: '配色 ID、主色、辅色、适合场合', rows: 640 }]) },
    { id: 'v1', status: '已发布', at: '2026-08-01 10:00', by: '陈思远', note: '初始版本', content: db([{ name: 'items', fields: '单品 ID、品类、风格、版型、季节', rows: 150200 }]) },
  ] },
  { key: '处罚梯度表', name: '处罚梯度表', team: '内容安全', owner: '周可', description: '违规类别 × 历史违规次数 → 处置动作，判定后查表给出处置建议', visibility: '内容安全', versions: [
    { id: 'v1', status: '已发布', at: '2026-08-20 10:00', by: '周可', note: '初始版本', content: db([{ name: 'penalty_ladder', fields: '违规类别、违规次数、处置动作、申诉窗口', rows: 96 }], '上传表格', '仅内部数据') },
  ] },
  { key: '售后工单表', name: '售后工单表', team: '客户服务', owner: '王宁', description: '用户的历史售后工单，回答「上次的退款到哪了」这类问题', visibility: '本团队', versions: [
    { id: 'v1', status: '已发布', at: '2026-09-01 10:00', by: '王宁', note: '接入售后工单库（只读视图）', content: db([{ name: 'aftersale_tickets', fields: '工单号、订单号、问题类型、处理状态、退款金额、更新时间', rows: 2380000 }]) },
  ] },
  { key: '差旅标准表', name: '差旅标准表', team: '企业服务', owner: '李一宁', description: '按城市等级和职级的住宿、补贴标准，数值类问题直接查表', visibility: '全公司', versions: [
    { id: 'v1', status: '已发布', at: '2026-09-15 10:00', by: '李一宁', note: '初始版本', content: db([{ name: 'travel_standard', fields: '城市等级、职级、住宿上限、餐补、交通补贴', rows: 48 }], '上传表格', '可处理员工数据') },
  ] },
];

export const initialAssets: AssetState = { tools: initialTools, models: initialModels, prompts: initialPrompts, evalsets: [], databases: initialDatabases };
export const databaseSources: DatabaseContent['source'][] = ['上传表格', '连接业务库'];

/** 评测集默认的维度与评分方式（预置评测集第一次被修改时用它生成 v1） */
export const evalsetDefaults: Record<string, { dimensions: string[]; scoring: string[]; owner: string; at: string }> = {
  base: { dimensions: ['答案正确性', '引用条款'], scoring: ['规则打分', '人工评分'], owner: '业务负责人', at: '2026-08-15 10:00' },
  boundary: { dimensions: ['边界与拒答', '失效政策'], scoring: ['规则打分', '人工评分'], owner: '业务负责人', at: '2026-08-20 10:00' },
  badcase: { dimensions: ['线上失败样本'], scoring: ['人工评分'], owner: 'bad case 工作台', at: '—' },
};
export const evalDimensionOptions = ['答案正确性', '引用条款', '推荐相关性', '转人工判断', '承诺类话术', '边界与拒答', '失效政策', '延迟'];
export const evalScoringOptions = ['规则打分', '人工评分', 'LLM 评委（需先用人工数据校准）'];
/** 「使用示例文件」导入时生成的样本：按 Agent 的预置样本改写（演示数据） */
export const importedCaseSuffix = '（导入）';
export const importSampleName = (agentName: string) => `${agentName}-新增样本.csv`;
export const toImported = (cases: EvalCase[]): EvalCase[] => cases.map(item => ({ ...item, name: `${item.name}${importedCaseSuffix}` }));

export const toolAuthOptions = ['服务账号', '用户令牌透传', '无需鉴权（仅内网只读）'];
export const dataLevelOptions = ['可处理用户数据', '可处理员工数据', '仅内部数据', '仅公开数据'];
export const modelChannels = ['公司托管', '公司网关', '团队微调'];
export const modelCapabilityOptions = ['文本', '多模态', '推理', '长上下文', '低延迟'];
export const promptKinds = ['问答', '对话', '分类', '生成', '改写', '抽取', '安全'];
export const visibilityOptions = ['全公司', '本团队', '需审批'];
export const teamOptions = ['企业服务', '社区内容', '内容安全', '客户服务', '平台团队', '搜索中台', '交易中台', '物流中台'];
