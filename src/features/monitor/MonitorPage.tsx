import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Rocket } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { previousOnline } from '../../core/rules/versions';
import { ScopeBadge, VersionBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { MetricCard } from '../../shared/components/DataDisplay';
import { Feedback } from '../../shared/components/Feedback';
import { CallLogTable } from './CallLogTable';
import { TrendChart } from './TrendChart';
import { formatMetric, isGood, metricLabels } from './format';
import { monitorProfiles } from '../../data';
import { AgentShell } from '../shell/AgentShell';
import { AlertBanners } from '../../shared/components/AlertBanners';
import type { Agent, MonitorMetricKey } from '../../types/domain';
import './monitor.css';
import { icon } from '../../shared/styles/tokens';

const metricKeys: MonitorMetricKey[] = ['calls', 'p95', 'errorRate', 'tokens'];

export function MonitorPage({ agent }: { agent: Agent }) {
  const { markMonitored } = useDemo();
  const [metric, setMetric] = useState<MonitorMetricKey>('calls');
  const production = agent.productionVersion;
  const [justChanged] = useState(!agent.monitored);
  useEffect(() => { if (production) markMonitored(agent.id); }, [agent.id, production]);

  if (!production) {
    return <AgentShell agent={agent} stepId="monitor" aside={<Card><span className="eyebrow">生产环境</span><h3>尚未发布</h3><p>发布后这里会显示调用量、延迟、错误率和 Token 用量。</p></Card>}>
      <SectionHeading eyebrow="监控" title="生产运行概览" description="只统计生产环境的线上指向版本。" aside={<ScopeBadge phase="MVP" />} />
      <Feedback kind="empty" title="还没有生产数据" description="该 Agent 尚未发布，没有线上流量。" action={<Link className="button button-secondary feedback-action" to={`/agents/${agent.id}/release`}><Rocket size={icon.small} />前往发布</Link>} />
    </AgentShell>;
  }

  const profile = monitorProfiles[agent.monitorProfile];
  const series = profile.series;
  const totals: Record<MonitorMetricKey, number> = {
    calls: series.reduce((sum, item) => sum + item.calls, 0),
    p95: series[series.length - 1].p95,
    errorRate: series[series.length - 1].errorRate,
    tokens: series.reduce((sum, item) => sum + item.tokens, 0),
  };
  const older = previousOnline(agent)?.id ?? production;
  const aside = <><Card><span className="eyebrow">生产环境</span><h3>线上指向 <VersionBadge version={production} /></h3><p>最近变更：{agent.lastReleaseAt ?? '—'}</p><p className="meta">调用日志和指标都按版本号归属，发布或回退后新请求会记到新版本上。</p></Card>
    <Link className="button button-secondary full-button" to={`/agents/${agent.id}/release`}><History size={icon.small} />查看版本历史与回退</Link></>;

  return <AgentShell agent={agent} stepId="monitor" aside={aside}><SectionHeading eyebrow="监控" title="生产运行概览" description={`${profile.period} · 线上指向 ${production} 的调用、延迟、错误和 Token 消耗。`} aside={<ScopeBadge phase="MVP" />} />
    {justChanged && agent.lastReleaseAt && <Feedback kind="success" title={`线上指向已切换到 ${production}`} description={`变更时间 ${agent.lastReleaseAt}。以下为演示数据，新请求已记录到 ${production}。`} />}
    <AlertBanners agent={agent} />
    <div className="metric-grid monitor-metrics">{metricKeys.map(key => {
      const change = profile.changes?.[key];
      return <MetricCard key={key} label={`${metricLabels[key]}${key === 'p95' || key === 'errorRate' ? '（最新）' : ''}`} value={formatMetric[key](totals[key])} change={change?.value} direction={change?.direction} good={change ? isGood(key, change.direction) : undefined} detail={change ? profile.compareLabel : profile.period} />;
    })}</div>
    <Card><div className="chart-title-row"><div><strong>{profile.period}趋势</strong><p>切换查看不同指标。</p></div>
      <div className="chart-tabs" role="tablist" aria-label="趋势指标">{metricKeys.map(key => <button key={key} role="tab" aria-selected={metric === key} className={metric === key ? 'active' : ''} onClick={() => setMetric(key)}>{metricLabels[key]}</button>)}</div></div>
      <TrendChart series={series} metric={metric} version={production} /></Card>
    <SectionHeading eyebrow="调用日志" title="最近请求" description="每条请求都带版本号，便于按版本排查。" />
    <Card><CallLogTable logs={profile.logs} versionFor={index => agent.monitorProfile === 'fresh' || index < 3 ? production : older} traceHref={trace => `/agents/${agent.id}/trace?trace=${trace}`} /></Card>
  </AgentShell>;
}
