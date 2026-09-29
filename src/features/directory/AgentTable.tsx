/**
 * 工作台 Agent 目录：维护者一眼要看的是
 *   线上跑的是哪个版本 → 有没有正在进行、需要我处理的事 → 运行是否健康 → 业务效果 → 花了多少钱。
 * 等级只在「原型」时作为名字旁的小标签出现；团队、负责人、执行模式放在名字下面。
 */
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Agent } from '../../types/domain';
import { VersionBadge } from '../../shared/components/Badges';
import { useDemo } from '../../core/store/DemoProvider';
import { alertsFor } from '../../core/data-access/scenarioData';
import { getCandidate, getExperiment } from '../../core/rules/versions';
import { monitorProfiles } from '../../data';
import { icon } from '../../shared/styles/tokens';

const latency = (ms: number) => ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;

export function AgentTable({ agents }: { agents: Agent[] }) {
  const { opsOf, pausePlaybook } = useDemo();
  return <div className="agent-table-wrap"><table className="agent-table">
    <colgroup><col className="col-name" /><col className="col-version" /><col className="col-progress" /><col className="col-health" /><col className="col-metrics" /><col className="col-cost" /><col className="col-action" /></colgroup>
    <thead><tr><th>Agent</th><th>线上版本</th><th>进行中</th><th>运行健康</th><th>业务核心指标 · 近 7 日</th><th className="numeric">本月成本</th><th aria-label="操作" /></tr></thead>
    <tbody>{agents.map(agent => {
      const ops = opsOf(agent);
      const settings = ops.settings;
      const experiment = getExperiment(agent);
      const candidate = getCandidate(agent);
      const online = Boolean(agent.productionVersion);
      const alerts = alertsFor(agent).length;
      const series = monitorProfiles[agent.monitorProfile].series;
      const last = series[series.length - 1];
      const budgetRatio = agent.costThisMonth / Math.max(1, settings.monthlyBudget) * 100;
      const progress = experiment ? { text: `${experiment.status} ${experiment.id}${experiment.traffic ? ` · ${experiment.traffic}%` : ''}`, tone: 'progress' }
        : ops.approvalPending ? { text: `${ops.approvalPending} 待审批`, tone: 'warning' }
        : candidate ? { text: `候选 ${candidate.id} · ${candidate.status}`, tone: 'neutral' } : null;
      const href = `/agents/${agent.id}/build`;
      return <tr key={agent.id}>
        <td data-label="Agent"><Link className="agent-name-link" to={href} onClick={pausePlaybook}><strong>{agent.name}{agent.level === '原型' && <span className="level-badge">原型</span>}</strong><small>{agent.team} · {agent.owner} · {settings.execMode}</small></Link></td>
        <td data-label="线上版本">{online ? <VersionBadge version={agent.productionVersion!} /> : <span className="meta">未发布</span>}</td>
        <td data-label="进行中">{progress ? <span className={`status-badge tone-${progress.tone}`}>{progress.text}</span> : <span className="meta">—</span>}</td>
        <td data-label="运行健康">{!online || !last ? <span className="meta">—</span> : <>
          {alerts ? <span className="health warn"><AlertTriangle size={icon.small} aria-hidden="true" />告警 {alerts} 条</span>
            : settings.alerts ? <span className="health ok"><CheckCircle2 size={icon.small} aria-hidden="true" />正常</span>
            : <span className="health muted">未启用告警</span>}
          <small>{settings.execMode === '批量' ? `错误率 ${last.errorRate.toFixed(1)}%` : `P95 ${latency(last.p95)}`}</small></>}</td>
        <td data-label="业务核心指标 · 近 7 日">{agent.headline.length ? <div className="headline-metrics">{agent.headline.map(item => <span key={item.label}><small>{item.label}</small><b>{item.value}</b></span>)}</div> : <span className="meta">{online ? '新上线，指标积累中' : '未发布，暂无数据'}</span>}</td>
        <td data-label="本月成本" className="numeric"><span className={budgetRatio >= settings.budgetAlert ? 'warning-text' : ''}>¥{agent.costThisMonth.toLocaleString('zh-CN')}</span><small>预算 {budgetRatio.toFixed(1)}%</small></td>
        <td className="row-action-cell"><Link className="row-action" to={href} onClick={pausePlaybook} aria-label={`打开${agent.name}`}><ArrowRight size={icon.large} /></Link></td>
      </tr>;
    })}</tbody></table>
  </div>;
}
