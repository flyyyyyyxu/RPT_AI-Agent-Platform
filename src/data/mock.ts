import type { Agent, AgentConfig, AgentRuntime, DebugResult, DemoState } from '../types/domain';

export const generalConfig: AgentConfig = {
  prompt: '你是公司的内部制度问答助手。请根据检索到的制度内容回答 {{question}}。\n\n要求：\n1. 只使用有效制度作为依据\n2. 给出制度名称和条款来源\n3. 信息不足时明确说明',
  model: 'DeepSeek-V3 · 公司托管',
  knowledge: '制度库 2026-09 版',
  tool: '员工身份查询 v2',
  outputFormat: '结构化回答：结论、依据、下一步',
  steps: [
    { id: 'step-1', name: '识别员工问题', type: '模型调用', description: '提取制度主题与用户条件' },
    { id: 'step-2', name: '检索有效制度', type: '检索', description: '从制度库召回相关条款' },
    { id: 'step-3', name: '核验员工身份', type: '工具调用', description: '确认员工类型与所在地区' },
    { id: 'step-4', name: '生成带引用回答', type: '模型调用', description: '依据有效条款组织最终回答' },
  ],
};

export const templateConfigs: Record<string, AgentConfig> = {
  blank: { prompt: '请处理用户输入：{{input}}', model: 'DeepSeek-V3 · 公司托管', knowledge: '暂不接入', tool: '暂不接入', outputFormat: '纯文本', steps: [{ id: 'step-1', name: '生成回答', type: '模型调用', description: '根据 Prompt 生成结果' }] },
  recommendation: { ...generalConfig, prompt: '根据用户偏好 {{preferences}} 和候选内容 {{candidates}}，生成个性化推荐。', knowledge: '内容知识库', tool: '用户画像查询 v1', outputFormat: '推荐理由 + 内容 ID' },
  classification: { ...generalConfig, prompt: '判断输入内容 {{content}} 的类别，并给出置信度。', knowledge: '分类标准库', tool: '暂不接入', outputFormat: 'JSON：category、confidence、reason', steps: [{ id: 'step-1', name: '读取分类标准', type: '检索', description: '召回适用标准' }, { id: 'step-2', name: '执行分类', type: '模型调用', description: '输出类别与置信度' }] },
  conversation: generalConfig,
};

export const generalDebugResult: DebugResult = {
  answer: '可以。根据《员工休假管理制度》第 3.2 条，转正员工每年可享有 5 天带薪年假。入职不满一年的，按当年度剩余自然日折算。你可以在 OA 的「休假申请」中查看当前可用天数。',
  totalDuration: '1.24s',
  steps: [
    { step: '识别员工问题', duration: '118ms', summary: '主题：年假；条件：转正员工', detail: '识别到用户询问年假资格与天数。' },
    { step: '检索有效制度', duration: '436ms', summary: '召回 3 条，采用 1 条', detail: '《员工休假管理制度》3.2 条，生效日期 2026-01-01。' },
    { step: '核验员工身份', duration: '182ms', summary: '员工类型：正式员工', detail: '演示数据：员工状态为已转正。' },
    { step: '生成带引用回答', duration: '504ms', summary: '输出 96 字，引用 1 条', detail: '回答包含结论、制度依据和下一步操作。' },
  ],
};

export const evaluationCases = [
  { name: '年假资格', input: '我转正了，今年有几天年假？', expected: '说明 5 天及折算规则', oldScore: 82, newScore: 96, oldAnswer: '正式员工通常有年假。', newAnswer: '转正员工每年享有 5 天年假，入职不满一年按剩余自然日折算。' },
  { name: '异地出差报销', input: '上海出差住宿标准是多少？', expected: '引用华东地区住宿标准', oldScore: 78, newScore: 92, oldAnswer: '请参考公司的差旅制度。', newAnswer: '上海住宿标准为每晚不超过 600 元，依据《差旅管理制度》4.1 条。' },
  { name: '病假材料', input: '请两天病假需要什么材料？', expected: '说明证明材料与提交入口', oldScore: 88, newScore: 94, oldAnswer: '需要医院证明。', newAnswer: '连续病假两天需上传医疗机构证明，并在 OA 休假申请中提交。' },
];

export const monitoringSeries = [
  { label: '09-22', calls: 1120, latency: 1.52 }, { label: '09-23', calls: 1280, latency: 1.48 }, { label: '09-24', calls: 1350, latency: 1.42 },
  { label: '09-25', calls: 1490, latency: 1.38 }, { label: '09-26', calls: 1620, latency: 1.31 }, { label: '09-27', calls: 1580, latency: 1.28 }, { label: '09-28', calls: 1760, latency: 1.24 },
];

export const callLogs = [
  { time: '2026-09-28 16:13', trace: 'tr_9f2a01', version: 'v4', status: '成功', latency: '1.24s', tokens: '1,284' },
  { time: '2026-09-28 16:09', trace: 'tr_9f29d8', version: 'v4', status: '成功', latency: '1.18s', tokens: '1,106' },
  { time: '2026-09-28 16:02', trace: 'tr_9f281c', version: 'v3', status: '失败', latency: '2.06s', tokens: '864' },
  { time: '2026-09-28 15:56', trace: 'tr_9f274e', version: 'v3', status: '成功', latency: '1.43s', tokens: '1,352' },
];

export const mockAgents: Agent[] = [
  {
    id: 'general', name: '内部制度问答助手', owner: '李一宁', team: '企业服务', level: '生产', mode: '在线 · 多轮 · 低风险', costThisMonth: 2860, productionVersion: 'v3',
    versions: [
      { id: 'v4', status: '草稿', updatedAt: '2026-09-28 15:40', note: '优化制度引用与结构化输出', knowledge: '制度库 2026-09 版' },
      { id: 'v3', status: '线上', updatedAt: '2026-09-26 14:20', note: '补充制度检索与引用', knowledge: '制度库 2026-09 版' },
      { id: 'v2', status: '草稿', updatedAt: '2026-09-12 10:15', note: '多轮问答优化', knowledge: '制度库 2026-08 版' },
      { id: 'v1', status: '草稿', updatedAt: '2026-08-22 17:40', note: '初始版本', knowledge: '制度库 2026-08 版' },
    ], metrics: ['回答采纳率', 'P95 延迟'],
  },
  {
    id: 'a', name: '穿搭灵感', owner: '陈思远', team: '社区内容', level: '生产', mode: '在线 · 高并发', costThisMonth: 18240, productionVersion: 'v12',
    versions: [
      { id: 'v13', status: '灰度中', updatedAt: '2026-09-28 10:05', note: '图片理解与推荐策略', traffic: 10 },
      { id: 'v12', status: '线上', updatedAt: '2026-09-20 16:13', note: '稳定生产版本' },
      { id: 'v11', status: '草稿', updatedAt: '2026-09-02 11:30', note: '历史快照' },
    ], metrics: ['采纳率', '点击率', '7 日留存', 'P95 延迟'],
  },
  {
    id: 'b', name: '生态守护', owner: '周可', team: '内容安全', level: '生产', mode: '批量', costThisMonth: 9750, productionVersion: 'v7',
    versions: [
      { id: 'v8', status: '待发布', updatedAt: '2026-09-27 18:02', note: '红线样本复核', knowledge: '政策库 2026-09 版' },
      { id: 'v7', status: '线上', updatedAt: '2026-09-10 09:30', note: '当前政策适配', knowledge: '政策库 2026-09 版' },
      { id: 'v6', status: '草稿', updatedAt: '2026-08-26 15:20', note: '历史快照', knowledge: '政策库 2026-08 版' },
    ], metrics: ['分类别召回率', '分类别误判率', '红线样本通过率', '申诉改判率'],
  },
  {
    id: 'c', name: '售后答疑', owner: '王宁', team: '客户服务', level: '生产', mode: '多轮会话', costThisMonth: 6320, productionVersion: 'v21',
    versions: [
      { id: 'v21', status: '线上', updatedAt: '2026-09-24 13:50', note: '售后知识更新', knowledge: '售后知识 v34' },
      { id: 'v20', status: '草稿', updatedAt: '2026-09-09 16:45', note: '历史快照', knowledge: '售后知识 v33' },
      { id: 'v19', status: '草稿', updatedAt: '2026-08-29 10:10', note: '历史快照', knowledge: '售后知识 v32' },
    ], metrics: ['解决率', '满意度', '转人工率', '过期知识命中数'],
  },
];

const runtimeFor = (agent: Agent): AgentRuntime => ({
  config: structuredClone(generalConfig), configured: false, debugged: false, evaluated: false, published: false, monitored: false,
  environments: { development: agent.id === 'general' ? 'v4' : agent.productionVersion, staging: agent.productionVersion, production: agent.productionVersion }, lastDebugQuestion: '',
});

export const initialDemoState: DemoState = { agents: mockAgents, team: '全部团队', runtimes: Object.fromEntries(mockAgents.map(agent => [agent.id, runtimeFor(agent)])) };
export const teams = ['全部团队', ...new Set(mockAgents.map(agent => agent.team))];
export const lifecycleSteps = [
  { id: 'build', label: '构建' }, { id: 'evaluation', label: '评测' }, { id: 'release', label: '发布与实验' },
  { id: 'monitor', label: '监控' }, { id: 'trace', label: 'Trace 与 bad case' },
] as const;
