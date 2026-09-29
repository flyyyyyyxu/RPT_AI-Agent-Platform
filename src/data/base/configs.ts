/** 各 Agent 的配置快照（Prompt、模型、知识、工具、步骤），以及构造版本记录的工具函数。 */
import type { AgentConfig, AgentVersion, VersionStatus } from '../../types/domain';

/* ------------------------------------------------------------------ */
/* 配置快照                                                            */
/* ------------------------------------------------------------------ */

export const generalConfig: AgentConfig = {
  prompt: '你是公司的内部制度问答助手。请根据检索到的制度内容回答 {{question}}。\n\n要求：\n1. 只使用有效制度作为依据\n2. 给出制度名称和条款来源\n3. 信息不足时明确说明',
  model: 'DeepSeek-V3 · 公司托管',
  fallbackModel: 'Qwen3-32B · 公司托管',
  knowledge: '制度库 2026-09 版',
  tools: ['员工身份查询 v2'],
  memory: { turns: 5, preferences: false },
  outputFormat: '结构化回答：结论、依据、下一步',
  steps: [
    { id: 'step-1', name: '识别员工问题', type: '模型调用', description: '提取制度主题与用户条件' },
    { id: 'step-2', name: '检索有效制度', type: '检索', description: '从制度库召回相关条款' },
    { id: 'step-3', name: '核验员工身份', type: '工具调用', description: '确认员工类型与所在地区' },
    { id: 'step-4', name: '生成带引用回答', type: '模型调用', description: '依据有效条款组织最终回答' },
  ],
};

export const outfitConfig: AgentConfig = {
  prompt: '你是穿搭灵感助手。根据用户场景 {{scene}} 和风格偏好 {{style}}，给出 3 套穿搭灵感，并从候选笔记 {{notes}} 中推荐同款。\n\n要求：\n1. 每套灵感包含单品、配色和适合场合\n2. 推荐笔记必须来自候选列表\n3. 语气轻松，不做功效承诺',
  model: 'Qwen3-32B · 公司托管',
  fallbackModel: 'DeepSeek-V3 · 公司托管',
  knowledge: '穿搭风格库 2026-09',
  tools: ['笔记检索 v3', '用户画像查询 v1'],
  memory: { turns: 3, preferences: true },
  outputFormat: 'JSON：灵感卡片 + 笔记 ID',
  steps: [
    { id: 'step-1', name: '解析场景与偏好', type: '模型调用', description: '识别场景、季节、身材与风格关键词' },
    { id: 'step-2', name: '检索同款笔记', type: '工具调用', description: '按关键词召回候选笔记' },
    { id: 'step-3', name: '过滤与去重', type: '代码节点', description: '去掉重复作者与低质量笔记' },
    { id: 'step-4', name: '生成灵感卡片', type: '模型调用', description: '组合单品并引用笔记 ID' },
  ],
};

export const guardConfig: AgentConfig = {
  prompt: '你是社区内容审核助手。依据政策条款判断内容 {{content}} 是否违规，输出类别与理由。\n\n要求：\n1. 理由必须引用具体政策条款编号\n2. 置信度低于 0.7 时标记为「需人工复核」\n3. 只输出 JSON，不输出其他文字',
  model: 'DeepSeek-V3 · 公司托管',
  fallbackModel: '不启用',
  knowledge: '政策库 2026-09 版',
  tools: ['账号历史查询 v2'],
  memory: { turns: 0, preferences: false },
  outputFormat: 'JSON：category、reason、policy_ref、confidence',
  steps: [
    { id: 'step-1', name: '召回政策条款', type: '检索', description: '按内容主题召回适用条款' },
    { id: 'step-2', name: '读取账号历史', type: '工具调用', description: '查询近 30 天违规记录' },
    { id: 'step-3', name: '判定类别', type: '模型调用', description: '输出类别、理由与置信度' },
    { id: 'step-4', name: '格式校验', type: '代码节点', description: '校验 JSON 字段与条款编号' },
  ],
};

export const afterSaleConfig: AgentConfig = {
  prompt: '你是电商售后客服助手。结合会话历史 {{history}} 和售后知识回答用户问题 {{question}}。\n\n要求：\n1. 只依据当前有效的售后政策\n2. 涉及退款金额和赔付时不做承诺，引导人工确认\n3. 给出可操作的入口',
  model: 'DeepSeek-V3 · 公司托管',
  fallbackModel: '不启用',
  knowledge: '售后知识 v34',
  tools: ['订单查询 v4', '物流查询 v2'],
  memory: { turns: 10, preferences: false },
  outputFormat: '结构化回答：结论、依据、操作入口',
  steps: [
    { id: 'step-1', name: '识别售后意图', type: '模型调用', description: '区分退换货、物流、质量问题' },
    { id: 'step-2', name: '查询订单与物流', type: '工具调用', description: '读取订单状态与最新物流轨迹' },
    { id: 'step-3', name: '检索售后知识', type: '检索', description: '召回当前有效的售后政策' },
    { id: 'step-4', name: '生成回答', type: '模型调用', description: '给出结论、依据和操作入口' },
  ],
};

export const blankConfig: AgentConfig = {
  prompt: '请处理用户输入：{{input}}',
  model: 'DeepSeek-V3 · 公司托管',
  fallbackModel: '不启用',
  knowledge: '暂不接入',
  tools: [],
  memory: { turns: 0, preferences: false },
  outputFormat: '纯文本',
  steps: [{ id: 'step-1', name: '生成回答', type: '模型调用', description: '根据 Prompt 生成结果' }],
};

/** 基于某份配置做局部修改，得到新的配置快照。 */
export const snap = (base: AgentConfig, patch: Partial<AgentConfig> = {}): AgentConfig => ({ ...structuredClone(base), ...patch });

/** 构造一条 mock 版本记录。 */
export const version = (id: string, status: VersionStatus, updatedAt: string, note: string, config: AgentConfig, extra: Partial<AgentVersion> = {}): AgentVersion => ({
  id, status, updatedAt, note, config,
  everOnline: status === '线上' || status === '历史',
  configured: true, debugged: true, evaluatedDatasets: status === '草稿' ? [] : ['base'],
  ...extra,
});
