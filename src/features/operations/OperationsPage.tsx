/** 监控与成本（横轴 · 平台共享）：跨 Agent 看运行状况、告警和花费；单个 Agent 的细节在它的「观测」页。 */
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { alertsFor } from '../../core/data-access/scenarioData';
import { getExperiment } from '../../core/rules/versions';
import { IntegrationNote, VersionBadge } from '../../shared/components/Badges';
import { SectionHeading } from '../../shared/components/Content';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import { MetricCard } from '../../shared/components/DataDisplay';
import { monitorProfiles } from '../../data';
import type { Agent, AgentSettings } from '../../types/domain';
import './operations.css';
import { icon } from '../../shared/styles/tokens';

const oneDecimal = (value: number) => value.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const compact = (value: number) => value >= 1e8 ? `${oneDecimal(value / 1e8)}亿` : value >= 1e5 ? `${oneDecimal(value / 1e4)}万` : Math.round(value).toLocaleString('zh-CN');
const latency = (ms: number) => ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
const yuan = (value: number) => `¥${Math.round(value).toLocaleString('zh-CN')}`;

interface Row { agent: Agent; settings: AgentSettings; calls: number; p95: number | null; errorRate: number | null; period: string; alerts: number }

export function OperationsPage() {
  const { state, opsOf } = useDemo();
  const rows: Row[] = state.agents.map(agent => {
    const profile = monitorProfiles[agent.monitorProfile];
    const online = Boolean(agent.productionVersion);
    const last = profile.series[profile.series.length - 1];
    return { agent, settings: opsOf(agent).settings, period: profile.period, alerts: alertsFor(agent).length,
      calls: online ? profile.series.reduce((sum, item) => sum + item.calls, 0) : 0, p95: online ? last.p95 : null, errorRate: online ? last.errorRate : null };
  });
  const online = rows.filter(row => row.agent.productionVersion);
  const totalCost = rows.reduce((sum, row) => sum + row.agent.costThisMonth, 0);
  const totalBudget = rows.reduce((sum, row) => sum + row.settings.monthlyBudget, 0);
  const alerting = rows.filter(row => row.alerts > 0);
  const teams = [...new Set(rows.map(row => row.agent.team))].map(team => {
    const members = rows.filter(row => row.agent.team === team);
    const cost = members.reduce((sum, row) => sum + row.agent.costThisMonth, 0);
    const budget = members.reduce((sum, row) => sum + row.settings.monthlyBudget, 0);
    const alertLine = Math.min(...members.map(row => row.settings.budgetAlert));
    return { team, members, cost, budget, ratio: Math.min(100, (cost / Math.max(1, budget)) * 100), alertLine, quota: members.reduce((sum, row) => sum + row.settings.dailyQuota, 0) };
  });

  return <div className="page-stack">
    <div className="page-heading"><span className="eyebrow">平台共享 · 跨 Agent</span><h1>监控与成本</h1><p>一屏看全部 Agent 的运行状况、告警和花费，先找到出问题的那个，再进入它的「观测」页排查。</p></div>
    <div className="metric-grid ops-metrics">
      <MetricCard label="线上 Agent" value={`${online.length} / ${rows.length}`} detail={alerting.length ? `${alerting.length} 个有未处理告警` : '暂无未处理告警'} />
      <MetricCard label="调用量合计" value={compact(online.reduce((sum, row) => sum + row.calls, 0))} detail="近 7 日，刚发布的按已有时长统计" />
      <MetricCard label="本月成本" value={yuan(totalCost)} detail={`预算 ${yuan(totalBudget)} · 已用 ${oneDecimal((totalCost / Math.max(1, totalBudget)) * 100)}%`} />
    </div>

    <SectionHeading eyebrow="运行概览" title="各 Agent 运行状况" description="指标都按线上指向的版本归属；灰度中的实验在发布与实验页看 AB 报告。" aside={<IntegrationNote platform="监控" />} />
    <Capability title="Agent 运行表" description="P95 延迟和错误率取最新一天；点右侧箭头进入该 Agent 的观测页。">
      <div className="table-scroll"><table className="data-table ops-table"><thead><tr>
        <th className="col-agent">Agent</th><th className="col-ver">线上 / 实验</th><th className="numeric">调用量</th><th className="numeric">P95 延迟</th><th className="numeric">错误率</th><th className="numeric col-cost">本月成本 / 预算</th><th className="col-alert">告警</th><th className="col-go" aria-label="操作" />
      </tr></thead><tbody>{rows.map(({ agent, settings, calls, p95, errorRate, period, alerts }) => {
        const experiment = getExperiment(agent);
        const over = agent.costThisMonth / Math.max(1, settings.monthlyBudget) * 100 >= settings.budgetAlert;
        return <tr key={agent.id}>
          <td><strong className="truncate" title={agent.name}>{agent.name}</strong><small className="meta truncate">{agent.team} · {settings.execMode}</small></td>
          <td>{agent.productionVersion ? <span className="ops-versions"><VersionBadge version={agent.productionVersion} />{experiment && <span className="meta">{experiment.status} {experiment.id}{experiment.traffic ? ` · ${experiment.traffic}%` : ''}</span>}</span> : <span className="meta">未发布</span>}</td>
          <td className="numeric">{agent.productionVersion ? <>{compact(calls)}{period !== '近 7 日' && <small className="meta">{period}</small>}</> : '—'}</td>
          <td className="numeric">{p95 === null ? '—' : latency(p95)}</td>
          <td className="numeric">{errorRate === null ? '—' : `${errorRate.toFixed(1)}%`}</td>
          <td className="numeric"><span className={over ? 'warning-text' : ''}>{yuan(agent.costThisMonth)}</span><small className="meta">/ {yuan(settings.monthlyBudget)}</small></td>
          <td>{alerts ? <span className="warning-text ops-flag"><AlertTriangle size={icon.small} aria-hidden="true" />{alerts} 条</span> : settings.alerts ? <span className="ops-flag ok"><CheckCircle2 size={icon.small} aria-hidden="true" />正常</span> : <span className="meta">未启用告警</span>}</td>
          <td><Link className="row-link" to={`/agents/${agent.id}/monitor`} aria-label={`查看${agent.name}的观测页`}><ArrowRight size={icon.small} /></Link></td>
        </tr>;
      })}</tbody></table></div>
    </Capability>

    <SectionHeading eyebrow="成本与配额" title="按团队看花费" description="成本按 Agent 和版本归集，来自公司计费数据；团队预算和日调用配额由平台统一分配。" />
    <Capability title="团队预算" description="虚线是团队内最严格的预算告警线；超过后按各 Agent 设置里的超预算策略处理。">
      <div className="team-budgets">{teams.map(item => <div className="team-budget" key={item.team}>
        <div className="team-budget-head"><strong>{item.team}</strong><span className={item.ratio >= item.alertLine ? 'warning-text' : 'meta'}>{yuan(item.cost)} / {yuan(item.budget)} · {oneDecimal(item.ratio)}%</span></div>
        <div className="quota-bar" aria-label={`${item.team}预算使用 ${oneDecimal(item.ratio)}%`}><span className={item.ratio >= item.alertLine ? 'over' : ''} style={{ width: `${item.ratio}%` }} /><i style={{ left: `${item.alertLine}%` }} title="预算告警线" /></div>
        <span className="meta">{item.members.map(row => row.agent.name).join('、')} · 日调用配额 {compact(item.quota)}</span>
      </div>)}</div>
    </Capability>

    <SectionHeading eyebrow="运行保障" title="资源隔离与限流" description="每个 Agent 独立限流和配额，高并发的 Agent 不会挤占其他团队；具体数值在各 Agent 的设置页修改。" />
    <Capability title="运行策略一览" description="执行模式、限流、降级和转人工阈值。">
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Agent</th><th>执行模式</th><th className="numeric">限流（QPS）</th><th className="numeric">日调用配额</th><th>降级策略</th><th className="numeric">转人工阈值</th></tr></thead>
        <tbody>{rows.map(({ agent, settings }) => <tr key={agent.id}><td><Link to={`/agents/${agent.id}/settings`}>{agent.name}</Link></td><td>{settings.execMode}</td><td className="numeric">{settings.qps.toLocaleString('zh-CN')}</td><td className="numeric">{compact(settings.dailyQuota)}</td><td><span className="truncate" title={settings.degrade}>{settings.degrade}</span></td><td className="numeric">{settings.handoffThreshold.toFixed(2)}</td></tr>)}</tbody></table></div>
    </Capability>

    <Phase2Row items={[
      { title: '异常检测与智能告警', description: '按历史基线自动识别异常波动，不再逐条配阈值。' },
      { title: '成本分摊结算', description: '按团队、Agent、版本出账，对接公司财务结算。' },
      { title: '自动弹性扩缩容', description: '大促前按预测流量自动扩容，结束后回收。' },
    ]} />
  </div>;
}
