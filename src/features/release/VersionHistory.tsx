import { RotateCcw } from 'lucide-react';
import type { Agent, AgentVersion } from '../../types/domain';
import { canRollbackTo } from '../../core/rules/versions';
import { ConfirmAction } from '../../shared/components/Buttons';
import { StatusBadge, VersionBadge } from '../../shared/components/Badges';

function rowHint(agent: Agent, version: AgentVersion) {
  if (version.id === agent.productionVersion) return '当前线上';
  if (version.status === '灰度中') return `灰度中 · ${version.traffic ?? 0}% 流量，不能作为回退目标`;
  if (version.status === '影子运行') return '影子运行中，不接用户流量';
  if (version.status === '草稿' || version.status === '待发布') return '候选版本，未上线过，需通过发布上线';
  return '不可回退';
}

export function VersionHistory({ agent, onRollback, blockedReason }: { agent: Agent; onRollback: (version: string) => void; blockedReason?: string }) {
  return <div className="version-history">{agent.versions.map(version => <div className={`version-row ${version.id === agent.productionVersion ? 'is-production' : ''}`} key={version.id}>
    <div className="version-main"><VersionBadge version={version.id} /><StatusBadge status={version.status} /><div><strong>{version.note}</strong><p title={`${version.updatedAt} · ${version.config.knowledge} · ${version.config.model}`}>{version.updatedAt} · {version.config.knowledge} · {version.config.model}</p></div></div>
    <div className="version-action">{canRollbackTo(agent, version) && blockedReason ? <span className="meta" title={blockedReason}>暂不可回退：{blockedReason}</span> : canRollbackTo(agent, version)
      ? <ConfirmAction icon={<RotateCcw size={16} />} actionLabel={`回退到 ${version.id}`} confirmLabel={`确认回退到 ${version.id}`} impact={`线上指向将从 ${agent.productionVersion} 切换到 ${version.id}（${version.config.knowledge}），之后的新请求立即使用 ${version.id}；${agent.productionVersion} 保留为历史版本，可随时再切回。`} onConfirm={() => onRollback(version.id)} />
      : <span className="meta">{rowHint(agent, version)}</span>}</div>
  </div>)}</div>;
}
