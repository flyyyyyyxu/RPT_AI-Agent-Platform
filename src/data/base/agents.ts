/** 4 个示例 Agent 及版本历史、初始演示状态、团队与生命周期步骤。 */
import type { Agent, DemoState } from '../../types/domain';
import { initialAssets } from './assets';
import { afterSaleConfig, generalConfig, guardConfig, outfitConfig, snap, version } from './configs';

/* ------------------------------------------------------------------ */
/* 4 个 Agent 及版本历史                                                */
/* ------------------------------------------------------------------ */

const agentBase = { stagingVersion: null, monitored: true, lastReleaseAt: null, lastDebugQuestion: '' };

export const mockAgents: Agent[] = [
  {
    ...agentBase, id: 'general', name: '内部制度问答助手', owner: '李一宁', team: '企业服务', level: '生产', mode: '在线 · 多轮 · 低风险', costThisMonth: 2860,
    productionVersion: 'v3', stagingVersion: 'v3', profile: 'general', monitorProfile: 'general', lastReleaseAt: '2026-09-26 14:20',
    headline: [{ label: '回答采纳率', value: '87.2%' }, { label: '引用准确率', value: '96.1%' }],
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
    ...agentBase, id: 'a', name: '社区穿搭灵感 Agent', owner: '陈思远', team: '社区内容', level: '生产', mode: '在线 · 高并发', costThisMonth: 18240,
    productionVersion: 'v12', stagingVersion: 'v13', profile: 'a', monitorProfile: 'a', lastReleaseAt: '2026-09-20 16:13',
    headline: [{ label: '采纳率', value: '42.8%' }, { label: '笔记点击率', value: '18.6%' }],
    versions: [
      version('v13', '灰度中', '2026-09-28 10:05', '图片理解与推荐策略', snap(outfitConfig, { model: 'Qwen3-235B · 公司托管', fallbackModel: 'Qwen3-32B · 公司托管' }), { traffic: 10 }),
      version('v12', '线上', '2026-09-20 16:13', '稳定生产版本', snap(outfitConfig)),
      version('v11', '历史', '2026-09-02 11:30', '初版推荐策略', snap(outfitConfig, { tools: ['笔记检索 v3'], steps: [outfitConfig.steps[0], outfitConfig.steps[1], outfitConfig.steps[3]] })),
    ],
  },
  {
    ...agentBase, id: 'b', name: '生态守护 Agent', owner: '周可', team: '内容安全', level: '生产', mode: '批量', costThisMonth: 9750,
    productionVersion: 'v7', stagingVersion: 'v8', profile: 'b', monitorProfile: 'b', lastReleaseAt: '2026-09-10 09:30',
    headline: [{ label: '抽检一致率', value: '97.8%' }, { label: '申诉改判率', value: '0.9%' }],
    versions: [
      version('v8', '待发布', '2026-09-27 18:02', '红线样本复核', snap(guardConfig)),
      version('v7', '线上', '2026-09-10 09:30', '当前政策适配', snap(guardConfig, { prompt: guardConfig.prompt.replace('\n2. 置信度低于 0.7 时标记为「需人工复核」', '').replace('3. 只输出', '2. 只输出') })),
      version('v6', '历史', '2026-08-26 15:20', '8 月政策版本', snap(guardConfig, { knowledge: '政策库 2026-08 版' })),
    ],
  },
  {
    ...agentBase, id: 'c', name: '电商售后答疑 Agent', owner: '王宁', team: '客户服务', level: '生产', mode: '多轮会话', costThisMonth: 6320,
    productionVersion: 'v21', stagingVersion: 'v21', profile: 'c', monitorProfile: 'c', lastReleaseAt: '2026-09-24 13:50',
    headline: [{ label: '解决率', value: '78.4%' }, { label: '转人工率', value: '12.1%' }],
    versions: [
      version('v21', '线上', '2026-09-24 13:50', '售后知识更新', snap(afterSaleConfig)),
      version('v20', '历史', '2026-09-09 16:45', '物流查询接入', snap(afterSaleConfig, { knowledge: '售后知识 v33' })),
      version('v19', '历史', '2026-08-29 10:10', '8 月知识版本', snap(afterSaleConfig, { knowledge: '售后知识 v32', tools: ['订单查询 v4'] })),
    ],
  },
];

export const initialDemoState: DemoState = { schema: 7, agents: mockAgents, ops: {}, knowledge: {}, assets: initialAssets, kbDraft: null, playbook: null };
export const teams = [...new Set(mockAgents.map(agent => agent.team))];
/** 纵轴：单个 Agent 的生产闭环。观测包含「监控」和「Trace 与 bad case」两个标签页，bad case 回流评测集后开始下一轮。 */
export const lifecycleSteps = [
  { id: 'build', label: '构建' }, { id: 'evaluation', label: '评测' }, { id: 'release', label: '发布与实验' },
  { id: 'observe', label: '观测' },
] as const;
export const observeTabs = [
  { id: 'monitor', label: '监控' }, { id: 'trace', label: 'Trace 与 bad case' },
] as const;
