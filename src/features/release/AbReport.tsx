/** ④ AB 实验报告：新旧版本业务指标对比（数据来自公司实验平台，演示数据）。 */
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Minus, Tag } from 'lucide-react';
import { abFor } from '../../core/data-access/scenarioData';
import type { Agent, AgentVersion } from '../../types/domain';
import { DemoTag, IntegrationNote, VersionBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';
import { Feedback } from '../../shared/components/Feedback';
import { icon } from '../../shared/styles/tokens';

/* ---------------- ④ AB 实验报告 ---------------- */
/** 符号单位（%、ms、s、pp）紧贴数字；中文量词（条、分）前留一个空格。 */
const withUnit = (text: string, unit: string) => /^[a-z%]+$/i.test(unit) ? `${text}${unit}` : `${text} ${unit}`;

function formatValue(value: number, unit: string, decimals: number) {
  return withUnit(value.toFixed(decimals), unit);
}

const deltaUnit = (unit: string) => unit === '%' ? 'pp' : unit;

const signed = (value: number, decimals: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(decimals)}`;

export function AbReport({ agent, experiment }: { agent: Agent; experiment: AgentVersion | null }) {
  const ab = abFor(agent);
  const production = agent.productionVersion;
  const shadow = experiment?.status === '影子运行';
  return <Capability demo="ab" title={shadow ? '影子运行对比报告' : 'AB 实验报告'} description="新旧版本在同一时段、按版本号归因的业务指标对比。颜色表示好坏，不表示涨跌。">
    {!experiment || !production ? <Feedback kind="empty" title="当前没有进行中的实验" description="以「比例灰度」或「影子运行」发布候选版本后，这里显示新旧版本的业务指标对比。" /> : <>
      <div className="ab-meta"><IntegrationNote platform="实验" /><span className="meta">数据来自公司实验平台 · 实验 {ab.experimentId} · 已运行 {ab.days} 天 · {ab.sample}</span><DemoTag label="以下数字均为演示数据" /></div>
      <div className="chart-legend"><span><i className="legend-old" />旧版本 {production}</span><span><i className="legend-new" />新版本 {experiment.id}</span></div>
      <div className="ab-grid">{ab.metrics.map(metric => {
        const delta = metric.newValue - metric.oldValue;
        const significant = metric.ci[0] > 0 || metric.ci[1] < 0;
        const good = metric.higherIsBetter ? delta > 0 : delta < 0;
        const max = Math.max(metric.oldValue, metric.newValue, metric.threshold ?? 0) * 1.15 || 1;
        const overThreshold = metric.threshold !== undefined && (metric.higherIsBetter ? metric.newValue < metric.threshold : metric.newValue > metric.threshold);
        return <div className="ab-row" key={metric.label}>
          <div className="ab-label"><strong>{metric.label}</strong><span className="meta">{metric.higherIsBetter ? '越高越好' : '越低越好'}</span></div>
          <div className="ab-bars">
            <div className="ab-bar"><VersionBadge version={production} /><span className="ab-bar-track"><span className="bar-old" style={{ width: `${(metric.oldValue / max) * 100}%` }} /></span><b>{formatValue(metric.oldValue, metric.unit, metric.decimals)}</b></div>
            <div className="ab-bar"><VersionBadge version={experiment.id} /><span className="ab-bar-track"><span className="bar-new" style={{ width: `${(metric.newValue / max) * 100}%` }} /></span><b>{formatValue(metric.newValue, metric.unit, metric.decimals)}</b></div>
          </div>
          <div className="ab-delta"><span className={`metric-change ${significant ? good ? 'positive' : 'negative' : 'neutral'}`}>{delta === 0 ? <Minus size={icon.small} aria-hidden="true" /> : delta > 0 ? <ArrowUp size={icon.small} aria-hidden="true" /> : <ArrowDown size={icon.small} aria-hidden="true" />}{withUnit(signed(delta, metric.decimals), deltaUnit(metric.unit))}</span>
            <span className="meta ab-ci">95% CI [{signed(metric.ci[0], metric.decimals)}, {signed(metric.ci[1], metric.decimals)}]{/^[a-z%]+$/i.test(deltaUnit(metric.unit)) ? '' : ' '}{deltaUnit(metric.unit)}</span>
            <span className={`sig ${significant ? 'yes' : ''}`}>{significant ? '显著' : '不显著'}</span>
            {metric.threshold !== undefined && <span className={`gate-chip ${overThreshold ? 'fail' : 'pass'}`}>{overThreshold ? <AlertCircle size={icon.small} aria-hidden="true" /> : <CheckCircle2 size={icon.small} aria-hidden="true" />}{overThreshold ? '超过门槛' : '门槛内'} {metric.higherIsBetter ? '≥' : '≤'} {formatValue(metric.threshold, metric.unit, metric.decimals)}</span>}</div>
        </div>;
      })}</div>
      <p className="ab-conclusion">{ab.conclusion}</p>
      <p className="tracking-note"><Tag size={icon.small} aria-hidden="true" /><span><strong>版本号已写入埋点</strong>：每次曝光、点击、会话事件都带 <code>agent_version={experiment.id}</code> 和 <code>exp_id={ab.experimentId}</code> 上报，指标按版本号归因，不依赖按时间切分。</span></p>
    </>}
  </Capability>;
}
