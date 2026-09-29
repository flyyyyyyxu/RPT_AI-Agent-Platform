/** 资产中心 · 知识库：知识库（带版本与生效期）、知识运营提交的待入库条目；toolCatalog 供构建页选择工具。工具、模型、Prompt 模板的版本化记录见 assets.ts。 */
import type { KnowledgeBase, PendingEntry } from '../../types/domain';

/* ① 资产中心：知识库（带版本与生效期）和工具（带版本） */
export const knowledgeBases: KnowledgeBase[] = [
  { id: 'hr', name: '制度库', owner: '企业服务 · 李一宁', description: '公司人事、差旅、报销制度条款',
    versions: [{ id: '2026-09 版', publishedAt: '2026-09-01 00:00', usedBy: ['内部制度问答助手 v3', 'v4'], note: '新增 2026 版差旅与休假条款' }, { id: '2026-08 版', publishedAt: '2026-08-01 00:00', usedBy: ['内部制度问答助手 v1', 'v2'] }],
    entries: [
      { title: '《员工休假管理制度》3.2 年假天数', versions: ['2026-09 版', '2026-08 版'], from: '2026-01-01 00:00', to: null },
      { title: '《员工休假管理制度》5.1 病假材料', versions: ['2026-09 版', '2026-08 版'], from: '2026-01-01 00:00', to: null },
      { title: '《差旅管理制度》4.1 住宿标准', versions: ['2026-09 版', '2026-08 版'], from: '2026-03-01 00:00', to: '2026-09-30 23:59' },
      { title: '《差旅管理制度》4.1 住宿标准（10 月修订，按职级区分）', versions: ['2026-09 版'], from: '2026-10-01 00:00', to: null },
      { title: '《加班与调休管理办法》2.3（2024 版）', versions: ['2026-09 版', '2026-08 版'], from: '2024-01-01 00:00', to: '2026-06-30 23:59' },
    ] },
  { id: 'policy', name: '政策库', owner: '内容安全 · 周可', description: '社区规范与审核政策条款',
    versions: [{ id: '2026-09 版', publishedAt: '2026-09-01 00:00', usedBy: ['生态守护 Agent v7', 'v8'], note: '修订站外引流判定条款 4.3' }, { id: '2026-08 版', publishedAt: '2026-08-01 00:00', usedBy: ['生态守护 Agent v6'] }],
    entries: [
      { title: '社区规范 3.2.1 虚假医疗宣传', versions: ['2026-09 版', '2026-08 版'], from: '2025-06-01 00:00', to: null },
      { title: '社区规范 4.3 站外引流（9 月修订）', versions: ['2026-09 版'], from: '2026-09-01 00:00', to: null },
      { title: '社区规范 4.3 站外引流（8 月版）', versions: ['2026-08 版'], from: '2025-12-01 00:00', to: '2026-08-31 23:59' },
      { title: '社区规范 1.4 真实消费评价', versions: ['2026-09 版', '2026-08 版'], from: '2025-06-01 00:00', to: null },
      { title: '未成年人保护专项 2.1', versions: ['2026-09 版'], from: '2026-10-15 00:00', to: null },
    ] },
  { id: 'aftersale', name: '售后知识', owner: '客户服务 · 王宁', description: '售后政策、大促规则、运费险',
    versions: [{ id: 'v35', publishedAt: '2026-09-27 11:20', usedBy: [], note: '新增运费险自动理赔，调整大促价保期' }, { id: 'v34', publishedAt: '2026-09-01 00:00', usedBy: ['电商售后答疑 Agent v21'] }, { id: 'v33', publishedAt: '2026-08-15 00:00', usedBy: ['电商售后答疑 Agent v20'] }],
    entries: [
      { title: '《售后政策》2.4 物流催件', versions: ['v35', 'v34', 'v33'], from: '2026-05-01 00:00', to: null },
      { title: '《售后政策》3.1 质量问题退换', versions: ['v35', 'v34', 'v33'], from: '2026-05-01 00:00', to: null },
      { title: '《大促价保规则》2026 版 1.2（价保 30 天）', versions: ['v35', 'v34'], from: '2026-09-01 00:00', to: null },
      { title: '《大促价保规则》2025 版 1.2（价保 15 天）', versions: ['v34', 'v33'], from: '2025-10-01 00:00', to: '2026-08-31 23:59' },
      { title: '运费险自动理赔', versions: ['v35'], from: '2026-10-01 00:00', to: null },
    ] },
  { id: 'outfit', name: '穿搭风格库', owner: '社区内容 · 陈思远', description: '风格规则与场景搭配要点',
    versions: [{ id: '2026-09', publishedAt: '2026-09-05 10:00', usedBy: ['社区穿搭灵感 Agent v11', 'v12', 'v13'] }],
    entries: [
      { title: '法式约会 · 规则 #F-112', versions: ['2026-09'], from: '2026-09-05 10:00', to: null },
      { title: '小个子显高 · 规则 #P-031', versions: ['2026-09'], from: '2026-09-05 10:00', to: null },
      { title: '夏季防晒穿搭 · 规则 #S-207', versions: ['2026-09'], from: '2026-05-01 00:00', to: '2026-09-30 23:59' },
    ] },
];
export const toolCatalog = [
  { name: '员工身份查询', version: 'v2', latest: 'v2', api: 'hr.identity.get', owner: 'HR 系统组', usedBy: '内部制度问答助手 v3、v4' },
  { name: 'OA 休假余额查询', version: 'v1', latest: 'v1', api: 'oa.leave.balance', owner: 'OA 平台组', usedBy: '—' },
  { name: '笔记检索', version: 'v3', latest: 'v4', api: 'note.search', owner: '搜索中台', usedBy: '社区穿搭灵感 Agent v11、v12、v13' },
  { name: '用户画像查询', version: 'v1', latest: 'v1', api: 'profile.user.get', owner: '用户增长数据组', usedBy: '社区穿搭灵感 Agent v12、v13' },
  { name: '账号历史查询', version: 'v2', latest: 'v2', api: 'risk.account.history', owner: '风控平台', usedBy: '生态守护 Agent v6、v7、v8' },
  { name: '订单查询', version: 'v4', latest: 'v4', api: 'trade.order.get', owner: '交易中台', usedBy: '电商售后答疑 Agent v19–v21' },
  { name: '物流查询', version: 'v2', latest: 'v2', api: 'logistics.track', owner: '物流中台', usedBy: '电商售后答疑 Agent v20、v21' },
];

/* 待入库条目：知识运营提交、尚未进入任何知识版本 */
export const pendingEntries: Record<string, PendingEntry[]> = {
  aftersale: [{ title: '《退货政策》2.1 十五天无理由退货（2026-09 修订）', from: '2026-09-01 00:00', to: null, submittedBy: '知识运营 · 赵敏 · 2026-09-28 17:20 提交' }],
};

/** 资产中心的五个二级目录：左侧导航和资产中心页面共用 */
export const assetSections = [
  { id: 'knowledge', label: '知识库', description: '按团队管理的知识库。知识带版本和生效期；Agent 版本快照只引用具体版本，上游更新不会改变线上行为。' },
  { id: 'tools', label: '工具', description: '已登记的公司内部工具，构建页可多选接入；接口变更必须发新版本，Agent 快照锁定所用版本。' },
  { id: 'evalsets', label: '评测集', description: '每个 Agent 的评测页从这里选评测集；bad case 工作台加入的样本会汇成「bad case 回归集」，下一轮评测自动带上。' },
  { id: 'models', label: '模型', description: '只有登记在这里的模型可以被 Agent 选用；版本快照锁定具体权重，模型升级需要新建候选版本并重新评测。' },
  { id: 'prompts', label: 'Prompt 模板', description: '从已上线 Agent 中沉淀的 Prompt 结构，新建 Agent 时套用，再按业务改写。' },
] as const;
export type AssetSectionId = typeof assetSections[number]['id'];

