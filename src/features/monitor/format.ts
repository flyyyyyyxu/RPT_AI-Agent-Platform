import type { MonitorMetricKey } from '../../types/domain';

const oneDecimal = (value: number) => value.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 十万以上用「万 / 亿」并统一保留一位小数；十万以下显示带千分位的整数，避免 10,200 被缩成 1.0万。 */
export function compact(value: number) {
  if (value >= 1e8) return `${oneDecimal(value / 1e8)}亿`;
  if (value >= 1e5) return `${oneDecimal(value / 1e4)}万`;
  return Math.round(value).toLocaleString('zh-CN');
}

export const formatMetric: Record<MonitorMetricKey, (value: number) => string> = {
  calls: compact,
  p95: value => value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`,
  errorRate: value => `${value.toFixed(1)}%`,
  tokens: compact,
};

export const metricLabels: Record<MonitorMetricKey, string> = { calls: '调用量', p95: 'P95 延迟', errorRate: '错误率', tokens: 'Token 用量' };

/** 颜色表示好坏：调用量上升是好事；延迟、错误率、Token 上升是坏事。 */
export const isGood = (key: MonitorMetricKey, direction: 'up' | 'down') => key === 'calls' ? direction === 'up' : direction === 'down';
