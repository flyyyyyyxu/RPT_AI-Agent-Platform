import { useLayoutEffect, useRef, useState } from 'react';
import type { MonitorMetricKey, MonitorPoint } from '../../types/domain';
import { tokens } from '../../shared/styles/tokens';
import { formatMetric, metricLabels } from './format';

/** 图表几何全部取自间距变量；按容器实际宽度绘制（1 个坐标单位 = 1px），文字始终是辅助字号。 */
const space = (key: keyof typeof tokens.space) => parseFloat(tokens.space[key]);
const PAD = { left: space(12) + space(4), right: space(8) + space(1), top: space(8), bottom: space(8) + space(1) };
const H = space(12) * 5 + space(2);
/** 低于这个宽度时图表在卡片内横向滚动，避免 7 个数据标签互相重叠。 */
const MIN_W = parseFloat(tokens.layout.asideMax);
const POINT = space(1);

/** 单指标趋势图：带纵轴刻度、图例和数据标签；数值越大位置越高。 */
export function TrendChart({ series, metric, version }: { series: MonitorPoint[]; metric: MonitorMetricKey; version: string }) {
  const canvas = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(MIN_W);
  useLayoutEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const measure = () => setW(Math.max(MIN_W, Math.round(node.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
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
    <div className="chart-canvas" ref={canvas}><svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metricLabels[metric]}从 ${format(first)} 变化到 ${format(last)}`}>
      {ticks.map(tick => <g key={tick}><line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="chart-grid" /><text x={PAD.left - space(2)} y={y(tick) + space(1)} textAnchor="end" className="chart-tick">{format(tick)}</text></g>)}
      <polyline points={points} className="series-line" />
      {values.map((value, index) => <g key={series[index].label}><circle cx={x(index)} cy={y(value)} r={POINT} className="series-point" /><text x={x(index)} y={y(value) - space(3)} textAnchor="middle" className="chart-value">{format(value)}</text><text x={x(index)} y={H - space(3)} textAnchor="middle" className="chart-tick">{series[index].label}</text></g>)}
    </svg></div></div>;
}
