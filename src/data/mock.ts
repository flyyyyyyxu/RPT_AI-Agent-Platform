import type { Agent, DemoState } from '../types/domain';

export const mockAgents: Agent[] = [
  {
    id: 'general', name: '内部制度问答助手', owner: '李一宁', team: '企业服务', level: '生产', mode: '在线 · 多轮 · 低风险', costThisMonth: 2860, productionVersion: 'v3',
    versions: [
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

export const initialDemoState: DemoState = { agents: mockAgents, team: '全部团队' };
export const teams = ['全部团队', ...new Set(mockAgents.map(agent => agent.team))];
export const lifecycleSteps = [
  { id: 'build', label: '构建' }, { id: 'evaluation', label: '评测' }, { id: 'release', label: '发布与实验' },
  { id: 'monitor', label: '监控' }, { id: 'trace', label: 'Trace 与 bad case' },
] as const;
