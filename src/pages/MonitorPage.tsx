import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoProvider';
import { ScopeBadge, VersionBadge } from '../components/badges/Badges';
import { Card, SectionHeading } from '../components/content/Content';
import { MetricCard } from '../components/data-display/DataDisplay';
import { CallLogTable } from '../components/monitor/CallLogTable';
import { TrendChart } from '../components/monitor/TrendChart';
import { AgentShell } from '../layouts/AgentShell';
import type { Agent } from '../types/domain';

export function MonitorPage({ agent }: { agent: Agent }) {
  const { state, markMonitored } = useDemo();
  const runtime = state.runtimes[agent.id];
  useEffect(() => markMonitored(agent.id), [agent.id]);
  const aside = <><Card><span className="eyebrow">生产环境</span><h3>当前版本 <VersionBadge version={agent.productionVersion} /></h3><p>最近更新：2026-09-28 16:13</p></Card><Link className="button button-secondary full-button" to={`/agents/${agent.id}/release`}>查看版本历史与回退</Link></>;
  return <AgentShell agent={agent} stepId="monitor" aside={aside}><SectionHeading eyebrow="基础能力 · 监控" title="生产运行概览" description={`查看 ${runtime.environments.production} 的调用、时延、错误和 Token 消耗。`} aside={<ScopeBadge phase="MVP" />} />
    <div className="metric-grid monitor-metrics"><MetricCard label="调用量" value="12,460" change="8.4%" direction="up" good detail="较上周" /><MetricCard label="P95 延迟" value="1.24s" change="0.18s" direction="down" good detail="较上周" /><MetricCard label="错误率" value="0.32%" change="0.08%" direction="down" good detail="较上周" /><MetricCard label="Token 用量" value="15.8M" change="6.2%" direction="up" good={false} detail="较上周" /></div>
    <Card><TrendChart /></Card><SectionHeading eyebrow="调用日志" title="最近请求" description="查看每次调用的版本、状态、时延和 Token 用量。" /><Card><CallLogTable productionVersion={agent.productionVersion} /></Card>
  </AgentShell>;
}
