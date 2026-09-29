/** 发布与实验：AB 报告（来自公司实验平台，界面演示）、放量节奏、审批记录。 */
import type { AbProfile, ApprovalRecord, BaseProfileId, CallerRecord, ProfileId, ReleaseStrategy } from '../../types/domain';

/* ④ AB 实验报告（数据来自公司实验平台，仅为界面演示） */
export const abProfiles: Record<BaseProfileId, AbProfile> = {
  a: {
    experimentId: 'EXP-20260928-outfit-v13', days: 8, sample: '共 1,236 万次曝光',
    metrics: [
      { label: '采纳率', oldValue: 42.8, newValue: 44.9, unit: '%', ci: [1.2, 3.0], higherIsBetter: true, decimals: 1 },
      { label: '点击率', oldValue: 18.6, newValue: 19.4, unit: '%', ci: [0.3, 1.3], higherIsBetter: true, decimals: 1 },
      { label: '7 日留存', oldValue: 61.2, newValue: 61.5, unit: '%', ci: [-0.4, 1.0], higherIsBetter: true, decimals: 1 },
      { label: 'P95 延迟', oldValue: 820, newValue: 910, unit: 'ms', ci: [62, 118], higherIsBetter: false, decimals: 0 },
    ],
    conclusion: '采纳率、点击率显著提升；7 日留存差异不显著；P95 延迟上升 90ms，仍在 1s 门槛内。建议放量到 30% 继续观察留存。',
  },
  general: {
    experimentId: 'EXP-20260929-policy-qa', days: 3, sample: '共 4,920 次问答',
    metrics: [
      { label: '回答采纳率', oldValue: 87.2, newValue: 89.0, unit: '%', ci: [0.4, 3.2], higherIsBetter: true, decimals: 1 },
      { label: '追问率', oldValue: 14.3, newValue: 12.1, unit: '%', ci: [-3.6, -0.8], higherIsBetter: false, decimals: 1 },
      { label: '转人工率', oldValue: 3.1, newValue: 2.8, unit: '%', ci: [-0.9, 0.3], higherIsBetter: false, decimals: 1 },
      { label: 'P95 延迟', oldValue: 1.24, newValue: 1.29, unit: 's', ci: [0.01, 0.09], higherIsBetter: false, decimals: 2 },
    ],
    conclusion: '采纳率提升、追问率下降均显著；转人工率差异不显著；延迟小幅上升。可以继续放量。',
  },
  b: {
    experimentId: 'SHADOW-20260928-guard-v8', days: 2, sample: '影子运行 27.6 万条内容，不影响线上判定',
    metrics: [
      { label: '虚假医疗类召回率', oldValue: 96.1, newValue: 97.2, unit: '%', ci: [0.5, 1.7], higherIsBetter: true, decimals: 1 },
      { label: '站外引流类召回率', oldValue: 94.8, newValue: 93.6, unit: '%', ci: [-1.9, -0.5], higherIsBetter: true, decimals: 1 },
      { label: '误判率', oldValue: 1.8, newValue: 1.6, unit: '%', ci: [-0.4, 0.0], higherIsBetter: false, decimals: 1 },
      { label: '申诉改判率', oldValue: 4.2, newValue: 3.5, unit: '%', ci: [-1.1, -0.3], higherIsBetter: false, decimals: 1 },
    ],
    conclusion: '误判和申诉改判下降，但站外引流类召回率下降且显著，不满足上线门槛。建议补充隐晦引流样本后重新评测。',
  },
  c: {
    experimentId: 'EXP-20260929-aftersale', days: 5, sample: '共 3.8 万次会话',
    metrics: [
      { label: '解决率', oldValue: 78.4, newValue: 80.1, unit: '%', ci: [0.6, 2.8], higherIsBetter: true, decimals: 1 },
      { label: '满意度', oldValue: 4.52, newValue: 4.58, unit: '分', ci: [0.01, 0.11], higherIsBetter: true, decimals: 2 },
      { label: '转人工率', oldValue: 12.1, newValue: 11.2, unit: '%', ci: [-1.5, -0.3], higherIsBetter: false, decimals: 1 },
      { label: '过期知识命中数', oldValue: 7, newValue: 0, unit: '条', ci: [-9, -5], higherIsBetter: false, decimals: 0 },
    ],
    conclusion: '解决率、满意度提升，转人工率下降，过期知识命中清零。可以继续放量。',
  },
  blank: {
    experimentId: 'EXP-20260929-new', days: 1, sample: '样本积累中',
    metrics: [{ label: '可用率', oldValue: 85, newValue: 86, unit: '%', ci: [-2.1, 4.1], higherIsBetter: true, decimals: 1 }],
    conclusion: '样本量不足，暂无显著结论。',
  },
};
export const rampSteps = [10, 30, 50, 100];

/* 审批：各 profile 的初始审批记录和默认发布策略；以及审批人 */
export const approvalsFor: Record<ProfileId, { approvals: ApprovalRecord[]; pending: string | null; approved: string | null; strategy: ReleaseStrategy }> = {
  general: { approvals: [{ time: '2026-09-26 13:58', who: '王磊（企业服务负责人）', action: '审批通过 v3 直接发布' }], pending: null, approved: null, strategy: 'canary' },
  a: { approvals: [{ time: '2026-09-28 09:52', who: '刘畅（社区内容负责人）', action: '审批通过 v13 比例灰度 10%' }, { time: '2026-09-28 09:40', who: '陈思远', action: '提交 v13 灰度发布审批' }], pending: null, approved: 'v13', strategy: 'canary' },
  b: { approvals: [{ time: '2026-09-27 18:10', who: '周可', action: '提交 v8 影子运行审批' }], pending: 'v8', approved: null, strategy: 'shadow' },
  c: { approvals: [{ time: '2026-09-24 13:31', who: '赵敏（客服运营负责人）', action: '审批通过 v21 直接发布' }], pending: null, approved: null, strategy: 'canary' },
  blank: { approvals: [], pending: null, approved: null, strategy: 'direct' },
  pa: { approvals: [{ time: '2026-09-20 15:58', who: '刘畅（社区内容负责人）', action: '审批通过 v12（比例灰度 10%）' }], pending: null, approved: null, strategy: 'canary' },
  pb: { approvals: [{ time: '2026-09-10 09:12', who: '孙悦（内容安全负责人）', action: '审批通过 v7（直接发布）' }], pending: null, approved: null, strategy: 'shadow' },
  pc: { approvals: [{ time: '2026-09-24 13:31', who: '赵敏（客服运营负责人）', action: '审批通过 v21（直接发布）' }], pending: null, approved: null, strategy: 'canary' },
};
export const approverFor: Record<BaseProfileId, string> = { general: '王磊（企业服务负责人）', a: '刘畅（社区内容负责人）', b: '孙悦（内容安全负责人）', c: '赵敏（客服运营负责人）', blank: '王磊（企业服务负责人）' };

/* 接入方式：调用地址、app_id、已登记的调用方（pin 为 null 表示跟随线上指向） */
export const gatewayBase = 'https://agent-gateway.intra.example/v1';
export const appIdOf = (agentId: string) => `app_${agentId}_${[...agentId].reduce((sum, ch) => sum * 31 + ch.charCodeAt(0), 7).toString(16).slice(-6).padStart(6, '0')}`;
export const callersFor: Record<BaseProfileId, CallerRecord[]> = {
  general: [
    { id: 'cl-1', service: 'oa-assistant', scene: 'OA 右下角助手', owner: '李一宁', qps: 15, pin: null, api: '在线 API', since: '2026-08-22' },
  ],
  a: [
    { id: 'cl-1', service: 'note-feed-service', scene: '发现页穿搭卡片', owner: '陈思远', qps: 1200, pin: null, api: '在线 API', since: '2026-09-02' },
    { id: 'cl-2', service: 'search-assist', scene: '搜索结果页灵感模块', owner: '林默', qps: 260, pin: null, api: '在线 API', since: '2026-09-12' },
    { id: 'cl-3', service: 'offline-replay', scene: '离线回放对账', owner: '陈思远', qps: 20, pin: 'v12', api: '批量 API', since: '2026-09-20' },
  ],
  b: [
    { id: 'cl-1', service: 'audit-batch-pipeline', scene: '笔记与评论审核批处理', owner: '周可', qps: 260, pin: null, api: '批量 API', since: '2026-08-26' },
    { id: 'cl-2', service: 'appeal-review-desk', scene: '申诉复核台（复核需按原判版本复现）', owner: '孙悦', qps: 20, pin: 'v7', api: '在线 API', since: '2026-09-10' },
  ],
  c: [
    { id: 'cl-1', service: 'cs-im-gateway', scene: '售后 IM 会话入口', owner: '王宁', qps: 170, pin: null, api: '在线 API', since: '2026-09-09' },
    { id: 'cl-2', service: 'cs-quality-check', scene: '客服质检回放', owner: '赵敏', qps: 10, pin: 'v21', api: '批量 API', since: '2026-09-24' },
  ],
  blank: [],
};
