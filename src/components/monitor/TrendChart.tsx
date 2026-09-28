import type { MonitorMetricKey, MonitorPoint } from '../../types/domain';
import { formatMetric, metricLabels } from './format';

const W = 640; const H = 248; const PAD = { left: 64, right: 36, top: 32, bottom: 36 };

/** 单指标趋势图：带纵轴刻度、图例和数据标签；数值越大位置越高。 */
export function TrendChart({ series, metric, version }: { series: MonitorPoint[]; metric: MonitorMetricKey; version: string }) {
  const values = series.map(item => item[metric]);
  const max = Math.max(...values); const min = Math.min(...values);
  const span = max - min || max || 1;
  const low = Math.max(0, min - span * 0.25); const high = max + span * 0.25;
  const x = (index: number) => PAD.left + (index * (W - PAD.left - PAD.right)) / Math.max(1, series.length - 1);
  const y = (value: number) => PAD.top + ((high - value) / (high - low || 1)) * (H - PAD.top - PAD.bottom);
  const ticks = [0, 0.5, 1].map(ratio => low + (high - low) * ratio);
  const format = formatMetric[metric];
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const first = values[0]; const last = values[values.length - 1];
  return <div className="trend-chart"><div className="chart-legend"><span><i className="legend-new" />{metricLabels[metric]} · 线上 {version}</span></div>
    <div className="chart-canvas"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metricLabels[metric]}从 ${format(first)} 变化到 ${format(last)}`}>
      {ticks.map(tick => <g key={tick}><line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="chart-grid" /><text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" className="chart-tick">{format(tick)}</text></g>)}
      <polyline points={points} className="series-line" />
      {values.map((value, index) => <g key={series[index].label}><circle cx={x(index)} cy={y(value)} r="4" className="series-point" /><text x={x(index)} y={y(value) - 12} textAnchor="middle" className="chart-value">{format(value)}</text><text x={x(index)} y={H - 12} textAnchor="middle" className="chart-tick">{series[index].label}</text></g>)}
    </svg></div></div>;
}
