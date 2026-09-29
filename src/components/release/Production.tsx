import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp, BellRing, CheckCircle2, CircleDashed, AlertTriangle, LoaderCircle, Minus, Radio, Tag, Timer } from 'lucide-react';
import { rampSteps } from '../../data/mock';
import { abFor, alertsFor } from '../../app/scenarioData';
import type { Agent, AgentOps, AgentVersion, ReleaseStrategy } from '../../types/domain';
import type { ReadinessItem } from '../../app/gate';
import { Button } from '../actions/Buttons';
import { DemoTag, IntegrationNote, StatusBadge, VersionBadge } from '../badges/Badges';
import { Capability, HeroTag, Switch } from '../skeleton/Skeleton';

export const strategyLabels: Record<ReleaseStrategy, { title: string; short: string; description: string }> = {
  direct: { title: '直接发布', short: '直接发布', description: '线上指向立即切换到新版本，适合低风险变更。' },
  canary: { title: '比例灰度', short: '比例灰度', description: '按用户分桶切一部分流量，逐步放量。' },
  shadow: { title: '影子运行', short: '影子运行', description: '复制线上请求双跑，只对比不返回，适合批量和高风险场景。' },
};

/* ---------------- ③ 生产就绪检查 ---------------- */
export function ReadinessCard({ candidate, experiment, checks, approvalPending, onSubmitApproval, onApprove, approving, children }: {
  approvalPending: boolean; candidate: AgentVersion | null; experiment: AgentVersion | null; checks: ReadinessItem[];
  onSubmitApproval: () => void; onApprove: () => void; approving: boolean; children: ReactNode;
}) {
  const doneCount = checks.filter(item => item.done).length;
  return <Capability skeleton={[3]} hero={1} demo="readiness" title="生产就绪检查" description="发布前逐项确认；任一项未完成，发布按钮禁用并写明原因。门槛、护栏、告警的配置变化会实时反映在这里。"
    actions={candidate ? <span className="meta">{candidate.id} · 已完成 {doneCount} / {checks.length}</span> : undefined}>
    {!candidate ? <p className="meta">{experiment ? `${experiment.id} 已完成生产就绪检查，当前${experiment.status}${experiment.traffic ? ` ${experiment.traffic}%` : ''}；放量与回退见「流量指向」。` : '没有候选版本。请先在构建页新建草稿，完成配置、调试和评测后再发布。'}</p>
      : <ul className="check-list">{checks.map(item => <li key={item.key} data-demo={`check-${item.key}`} className={`check-item ${item.done ? item.warn ? 'warn' : 'done' : ''}`}>
        <span className="check-icon">{item.done ? item.warn ? <AlertTriangle size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" /> : <CircleDashed size={20} aria-hidden="true" />}</span>
        <span><strong>{item.label}</strong><small className="meta">{item.detail}</small></span>
        <span className="check-actions">
          {item.key === 'approval' && !item.done && !item.optional && <>{approvalPending ? <Button onClick={onApprove} disabled={approving}>{approving ? <LoaderCircle size={16} className="spin" /> : null}模拟审批通过</Button> : <Button onClick={onSubmitApproval}>提交审批</Button>}</>}
          {item.key !== 'approval' && !item.done && item.link && <Link className="button button-secondary" to={item.link.to}>{item.link.label}</Link>}
          {item.done ? <StatusBadge status={item.warn ? '警告' : '通过'} /> : item.optional ? <span className="meta">全量前需要</span> : <StatusBadge status={item.key === 'approval' && approvalPending ? '待审批' : '未完成'} />}
        </span></li>)}</ul>}
    {children}
  </Capability>;
}

/* ---------------- ③ 发布策略 ---------------- */
export const bucketLabel = (ops: AgentOps) => ops.settings.execMode === '会话' ? '按会话 ID 分桶' : '按用户 ID 哈希分桶';

export function StrategyCard({ agent, ops, update, locked }: { agent: Agent; ops: AgentOps; update: (patch: Partial<AgentOps>) => void; locked?: string }) {
  const strategy: ReleaseStrategy = agent.productionVersion ? ops.strategy : 'direct';
  return <Capability skeleton={[3]} demo="strategy" title="发布策略" description="选择新版本进入生产的方式；比例灰度和影子运行都不改变线上指向。">
    <div className="strategy-grid"><div className="settings-grid">
      <div className="strategy-options" role="radiogroup" aria-label="发布策略">{(Object.keys(strategyLabels) as ReleaseStrategy[]).map(key => {
        const disabled = Boolean(locked) || (!agent.productionVersion && key !== 'direct');
        return <button key={key} type="button" role="radio" aria-checked={strategy === key} className={`strategy-option ${strategy === key ? 'selected' : ''}`} disabled={disabled} title={!agent.productionVersion && key !== 'direct' ? '首次发布没有线上版本可对照，只能直接发布' : locked} onClick={() => update({ strategy: key })}><strong>{strategyLabels[key].title}</strong><small>{strategyLabels[key].description}</small></button>;
      })}</div>
      {locked && <p className="meta">{locked}</p>}
      {!agent.productionVersion && <p className="meta">首次发布没有线上版本可对照，只能直接发布。</p>}
      {strategy === 'canary' && <div className="range-field"><span className="field-label">灰度比例<span className="range-value">{ops.canaryPercent}%</span></span>
        <input type="range" min={1} max={50} step={1} value={ops.canaryPercent} disabled={Boolean(locked)} aria-label="灰度比例" onChange={event => update({ canaryPercent: Number(event.target.value) })} />
        <span className="range-scale meta"><span>1%</span><span>{bucketLabel(ops)}</span><span>50%</span></span></div>}
      <Switch checked={ops.sticky} disabled={Boolean(locked) || strategy === 'shadow'} onChange={value => update({ sticky: value })} label="会话粘性" />
      <p className="meta">{strategy === 'shadow' ? '影子运行不向用户返回结果，无需会话粘性。' : ops.sticky ? '同一用户 / 会话在灰度期间固定命中同一版本，多轮对话不会中途切版本。' : '未开启：多轮会话可能在两个版本之间切换，影响体验和指标归因。'}</p>
    </div>
      <div><div className="sub-heading"><h4>审批记录</h4><span className="meta">{ops.approvals.length} 条</span></div>
        {ops.approvals.length ? <ol className="approval-list">{ops.approvals.map((item, index) => <li key={`${item.time}-${index}`}><strong>{item.action}</strong><p>{item.who} · {item.time}</p></li>)}</ol> : <p className="meta">暂无审批记录。</p>}</div>
    </div>
  </Capability>;
}

/* ---------------- ④ ⑤ 流量指向：放量与回退 ---------------- */
export interface SwitchState { from: string; to: string; stage: number; done: boolean }
export const switchStages = ['冻结发布操作', '网关切换线上指向', '排空进行中的会话', '健康检查与告警确认'];

export function TrafficCard({ agent, ops, experiment, rollbackTarget, switching, onRamp, rollbackAction }: {
  agent: Agent; ops: AgentOps; experiment: AgentVersion | null; rollbackTarget: AgentVersion | null; switching: SwitchState | null; onRamp: () => void; rollbackAction: ReactNode;
}) {
  const production = agent.productionVersion;
  const gray = experiment?.status === '灰度中' ? experiment : null;
  const shadow = experiment?.status === '影子运行' ? experiment : null;
  const traffic = gray?.traffic ?? 0;
  const next = rampSteps.find(step => step > traffic) ?? 100;
  return <Capability skeleton={[3, 5]} hero={[2, 3]} demo="traffic" title="流量指向" description="平台网关负责分流：发布、放量、回退都只是改变指向，版本快照本身不变。">
    {!production ? <p className="meta">尚未发布，暂无生产流量。</p> : <>
      <div className="pointer-cards">
        <div className="pointer-card active"><span className="meta"><Radio size={16} strokeWidth={1.5} aria-hidden="true" /> 线上指向</span><strong><VersionBadge version={production} /> <StatusBadge status="线上" /></strong><span className="meta">{gray ? `承接 ${100 - traffic}% 流量` : '承接全部生产流量'}</span></div>
        <ArrowRight className="pointer-arrow" size={20} aria-hidden="true" />
        {experiment ? <div className="pointer-card gray"><span className="meta">{gray ? '灰度分桶指向' : '影子双跑'}</span><strong><VersionBadge version={experiment.id} /> <StatusBadge status={experiment.status === '灰度中' ? '灰度中' : '影子运行'} /></strong><span className="meta">{gray ? `${traffic}% 流量 · ${bucketLabel(ops)} · ${ops.sticky ? '会话粘性已开启' : '未开启会话粘性'}` : '复制 100% 请求，不返回用户'}</span></div>
          : <div className="pointer-card"><span className="meta">可回退目标</span><strong>{rollbackTarget ? <VersionBadge version={rollbackTarget.id} /> : '—'}</strong><span className="meta">{rollbackTarget ? `${rollbackTarget.config.knowledge} · ${rollbackTarget.config.model}` : '没有曾上线的历史版本'}</span></div>}
      </div>
      <div className="traffic-split"><div className="traffic-bar" aria-label="流量分配">
        <span className="traffic-old" style={{ flexBasis: `${gray ? 100 - traffic : 100}%` }}>{production} · {gray ? 100 - traffic : 100}%</span>
        {gray && <span className="traffic-new" style={{ flexBasis: `${traffic}%` }}>{gray.id} · {traffic}%</span>}
        {shadow && <span className="traffic-shadow" style={{ flexBasis: '30%' }}>{shadow.id} 影子</span>}
      </div><div className="traffic-legend"><span><i className="traffic-old" />旧版本 {production}</span>{experiment && <span><i className="traffic-new" />新版本 {experiment.id}</span>}</div></div>
      {gray && <div className="ramp-steps" aria-label="放量节奏">{rampSteps.map(step => <span key={step} className={`ramp-step ${step === traffic ? 'current' : step < traffic ? 'done' : ''}`}>{step}%</span>)}</div>}
      {switching && <div className="card"><div className="sub-heading"><h4 className="pointer-flip">线上指向 <VersionBadge version={switching.from} /><ArrowRight size={16} aria-hidden="true" /><VersionBadge version={switching.to} /></h4><Timer size={16} aria-hidden="true" /></div>
        <ol className="switch-stages">{switchStages.map((label, index) => <li key={label} className={index < switching.stage ? 'done' : index === switching.stage ? 'active' : ''}>{index < switching.stage ? <CheckCircle2 size={16} aria-hidden="true" /> : index === switching.stage ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <CircleDashed size={16} aria-hidden="true" />}{label}</li>)}</ol></div>}
      {!switching && <div className="rollout-actions">
        {gray && <Button variant="primary" onClick={onRamp}><ArrowUp size={16} />{next >= 100 ? `全量放量：线上指向切到 ${gray.id}` : `放量到 ${next}%`}</Button>}
        <span className="rollback-slot" data-demo="rollback">{rollbackAction}</span>
      </div>}
    </>}
  </Capability>;
}

export function SwitchResult({ from, to, elapsed, note }: { from: string; to: string; elapsed: string; note: string }) {
  return <div className="switch-result" role="status" data-demo="switch-result"><CheckCircle2 size={20} aria-hidden="true" /><div><strong className="pointer-flip">线上指向 <del>{from}</del><ArrowRight size={16} aria-hidden="true" />{to}</strong><p>{note}</p></div><span className="elapsed" title="从确认回退到全部流量切换完成">耗时 {elapsed}</span><DemoTag /></div>;
}

/* ---------------- ④ AB 实验报告 ---------------- */
function formatValue(value: number, unit: string, decimals: number) {
  const text = value.toFixed(decimals);
  return unit === '%' ? `${text}%` : unit === 'ms' ? `${text}ms` : unit === 's' ? `${text}s` : `${text} ${unit}`;
}
const deltaUnit = (unit: string) => unit === '%' ? 'pp' : unit;
const signed = (value: number, decimals: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(decimals)}`;

export function AbReport({ agent, experiment }: { agent: Agent; experiment: AgentVersion | null }) {
  const ab = abFor(agent);
  const production = agent.productionVersion;
  const shadow = experiment?.status === '影子运行';
  return <Capability skeleton={[4]} hero={[2, 4]} demo="ab" title={shadow ? '影子运行对比报告' : 'AB 实验报告'} description="新旧版本在同一时段、按版本号归因的业务指标对比。颜色表示好坏，不表示涨跌。">
    {!experiment || !production ? <p className="meta">当前没有进行中的实验。以「比例灰度」或「影子运行」发布候选版本后，这里显示新旧版本的业务指标对比。</p> : <>
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
          <div className="ab-delta"><span className={`metric-change ${significant ? good ? 'positive' : 'negative' : 'neutral'}`}>{delta === 0 ? <Minus size={16} aria-hidden="true" /> : delta > 0 ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}{signed(delta, metric.decimals)} {deltaUnit(metric.unit)}</span>
            <span className="meta ab-ci">95% CI [{signed(metric.ci[0], metric.decimals)}, {signed(metric.ci[1], metric.decimals)}] {deltaUnit(metric.unit)}</span>
            <span className={`sig ${significant ? 'yes' : ''}`}>{significant ? '显著' : '不显著'}</span>
            {metric.threshold !== undefined && <span className={`gate-chip ${overThreshold ? 'fail' : 'pass'}`}>{overThreshold ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}{overThreshold ? '超过门槛' : '门槛内'} {metric.higherIsBetter ? '≥' : '≤'} {formatValue(metric.threshold, metric.unit, metric.decimals)}</span>}</div>
        </div>;
      })}</div>
      <p className="ab-conclusion">{ab.conclusion}</p>
      <p className="tracking-note"><Tag size={16} aria-hidden="true" /><span><strong>版本号已写入埋点</strong>：每次曝光、点击、会话事件都带 <code>agent_version={experiment.id}</code> 和 <code>exp_id={ab.experimentId}</code> 上报，指标按版本号归因，不依赖按时间切分。</span></p>
    </>}
  </Capability>;
}

/* ---------------- ⑦ ⑧ 告警（来自公司监控平台） ---------------- */
export function AlertBanners({ agent }: { agent: Agent }) {
  const alerts = alertsFor(agent);
  if (!alerts.length) return null;
  return <div className="alert-stack" data-demo="alert">{alerts.map(alert => {
    const version = agent.versions.find(item => item.id === alert.version);
    const active = Boolean(version && (version.status === '灰度中' || version.status === '影子运行' || version.id === agent.productionVersion));
    return active
      ? <div key={alert.id} className="alert-banner error hero-alert" role="alert"><BellRing size={20} aria-hidden="true" /><div>
          <div className="alert-title"><strong>告警 · {alert.title}</strong><VersionBadge version={alert.version} /><HeroTag n={4} compact /><DemoTag /></div>
          <p>{alert.detail} · 触发于 {alert.time}</p><p>已通知：{alert.notify}</p><IntegrationNote platform="监控" /></div></div>
      : <div key={alert.id} className="alert-banner success" role="status"><CheckCircle2 size={20} aria-hidden="true" /><div>
          <div className="alert-title"><strong>告警已恢复 · {alert.title}</strong><VersionBadge version={alert.version} /><DemoTag /></div><p>{alert.resolvedNote}</p><IntegrationNote platform="监控" /></div></div>;
  })}</div>;
}
