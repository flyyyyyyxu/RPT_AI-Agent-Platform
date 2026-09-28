import { monitoringSeries } from '../../data/mock';

export function TrendChart() {
  const maxCalls = Math.max(...monitoringSeries.map(item => item.calls));
  const points = monitoringSeries.map((item, index) => `${index * 100},${180 - (item.calls / maxCalls) * 140}`).join(' ');
  const latencyPoints = monitoringSeries.map((item, index) => `${index * 100},${40 + ((item.latency - 1.2) / .4) * 120}`).join(' ');
  return <div className="trend-chart"><div className="chart-title-row"><div><strong>近 7 日调用趋势</strong><p>调用量与 P95 延迟</p></div><div className="chart-legend"><span><i className="legend-new" />调用量</span><span><i className="legend-threshold" />P95 延迟</span></div></div><div className="chart-canvas"><svg viewBox="0 0 600 210" role="img" aria-label="近 7 日调用量从 1120 上升到 1760，P95 延迟从 1.52 秒下降到 1.24 秒"><line x1="0" y1="180" x2="600" y2="180" className="chart-axis" /><polyline points={points} className="calls-line" /><polyline points={latencyPoints} className="latency-line" />{monitoringSeries.map((item, index) => <g key={item.label}><circle cx={index * 100} cy={180 - (item.calls / maxCalls) * 140} r="5" className="calls-point" /><text x={index * 100} y="205" textAnchor={index === 0 ? 'start' : index === monitoringSeries.length - 1 ? 'end' : 'middle'}>{item.label}</text><text x={index * 100} y={168 - (item.calls / maxCalls) * 140} textAnchor="middle" className="chart-value">{item.calls}</text><text x={index * 100} y={28 + ((item.latency - 1.2) / .4) * 120} textAnchor="middle" className="latency-value">{item.latency.toFixed(2)}s</text></g>)}</svg></div></div>;
}
