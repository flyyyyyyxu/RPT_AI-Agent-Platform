/** Agent 设置：运行保障、护栏、预算的默认值。 */
import type { AgentSettings, BaseProfileId } from '../../types/domain';

/* ③ ⑦ ⑨ ⑩ 默认运营配置 */
export const settingsFor: Record<BaseProfileId, AgentSettings> = {
  general: { execMode: '在线', qps: 20, dailyQuota: 20000, degrade: '切换备用模型', handoffThreshold: 0.6, alerts: false, guardrails: { format: true, citation: true, promise: true, safety: true }, monthlyBudget: 4000, budgetAlert: 80, overBudget: '仅告警' },
  a: { execMode: '在线', qps: 1500, dailyQuota: 2000000, degrade: '切换备用模型', handoffThreshold: 0.5, alerts: true, guardrails: { format: true, citation: true, promise: true, safety: true }, monthlyBudget: 22000, budgetAlert: 80, overBudget: '自动降级到备用模型' },
  b: { execMode: '批量', qps: 300, dailyQuota: 500000, degrade: '暂停批次并告警', handoffThreshold: 0.7, alerts: true, guardrails: { format: true, citation: true, promise: false, safety: true }, monthlyBudget: 12000, budgetAlert: 85, overBudget: '仅告警' },
  c: { execMode: '会话', qps: 200, dailyQuota: 150000, degrade: '转人工客服', handoffThreshold: 0.65, alerts: true, guardrails: { format: true, citation: true, promise: true, safety: true }, monthlyBudget: 8000, budgetAlert: 80, overBudget: '仅告警' },
  blank: { execMode: '在线', qps: 10, dailyQuota: 1000, degrade: '返回兜底话术', handoffThreshold: 0.6, alerts: false, guardrails: { format: false, citation: false, promise: false, safety: false }, monthlyBudget: 1000, budgetAlert: 80, overBudget: '仅告警' },
};
