import type { MonitorMetricKey } from '../../types/domain';

export function compact(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e4) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString('zh-CN');
}

export const formatMetric: Record<MonitorMetricKey, (value: number) => string> = {
  calls: compact,
  p95: value => value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`,
  errorRate: value => `${value.toFixed(2)}%`,
  tokens: compact,
};

export const metricLabels: Record<MonitorMetricKey, string> = { calls: '调用量', p95: 'P95 延迟', errorRate: '错误率', tokens: 'Token 用量' };

/** 颜色表示好坏：调用量上升是好事；延迟、错误率、Token 上升是坏事。 */
export const isGood = (key: MonitorMetricKey, direction: 'up' | 'down') => key === 'calls' ? direction === 'up' : direction === 'down';
