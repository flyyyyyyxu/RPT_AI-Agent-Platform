import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Agent } from '../../types/domain';
import { VersionBadge } from '../badges/Badges';
import { getCandidate } from '../../app/versions';

export function AgentTable({ agents }: { agents: Agent[] }) {
  return <div className="agent-table-wrap"><table className="agent-table"><thead><tr><th className="col-name">Agent</th><th className="col-team">团队 / 负责人</th><th className="col-level">等级</th><th className="col-version">线上版本</th><th className="col-metrics">核心指标</th><th className="col-cost numeric">本月成本</th><th className="col-action" aria-label="操作" /></tr></thead>
    <tbody>{agents.map(agent => {
      const gray = agent.versions.find(version => version.status === '灰度中');
      const candidate = getCandidate(agent);
      return <tr key={agent.id}>
        <td data-label="Agent"><Link className="agent-name-link" to={`/agents/${agent.id}/build`}><strong>{agent.name}</strong><small>{agent.mode}</small></Link></td>
        <td data-label="团队 / 负责人"><span>{agent.team}</span><small>{agent.owner}</small></td>
        <td data-label="等级"><span className="level-badge">{agent.level}</span></td>
        <td data-label="线上版本"><div className="version-cell">{agent.productionVersion ? <VersionBadge version={agent.productionVersion} /> : <span className="meta">未发布</span>}
          {gray && <span className="meta">灰度 {gray.id} · {gray.traffic}%</span>}
          {!gray && candidate && <span className="meta">候选 {candidate.id} · {candidate.status}</span>}</div></td>
        <td data-label="核心指标">{agent.headline.length ? <div className="headline-metrics">{agent.headline.map(item => <span key={item.label}><small>{item.label}</small><b>{item.value}</b></span>)}</div> : <span className="meta">{agent.productionVersion ? '新上线，指标积累中' : '未发布，暂无数据'}</span>}</td>
        <td data-label="本月成本" className="numeric">¥{agent.costThisMonth.toLocaleString('zh-CN')}</td>
        <td className="row-action-cell"><Link className="row-action" to={`/agents/${agent.id}/build`} aria-label={`打开${agent.name}`}><ArrowRight size={20} strokeWidth={1.5} /></Link></td>
      </tr>;
    })}</tbody></table>
  </div>;
}
