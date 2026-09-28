import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Agent } from '../../types/domain';
import { VersionBadge } from '../badges/Badges';

export function AgentTable({ agents }: { agents: Agent[] }) {
  return <div className="agent-table-wrap"><table className="agent-table"><thead><tr><th>Agent</th><th>团队 / 负责人</th><th>等级</th><th>线上版本</th><th>核心指标</th><th className="numeric">本月成本</th><th aria-label="操作" /></tr></thead>
    <tbody>{agents.map(agent => <tr key={agent.id}><td><Link className="agent-name-link" to={`/agents/${agent.id}/build${agent.id === 'general' ? '?version=v4' : ''}`}><strong>{agent.name}</strong><small>{agent.mode}</small></Link></td><td><span>{agent.team}</span><small>{agent.owner}</small></td><td><span className="level-badge">{agent.level}</span></td><td><VersionBadge version={agent.productionVersion} /></td><td><span className="metric-list" title={agent.metrics.join('、')}>{agent.metrics.join('、')}</span></td><td className="numeric">¥{agent.costThisMonth.toLocaleString('zh-CN')}</td><td><Link className="row-action" to={`/agents/${agent.id}/build${agent.id === 'general' ? '?version=v4' : ''}`} aria-label={`打开${agent.name}`}><ArrowRight size={20} strokeWidth={1.5} /></Link></td></tr>)}</tbody></table></div>;
}
