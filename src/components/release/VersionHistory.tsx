import type { Agent } from '../../types/domain';
import { ConfirmAction } from '../actions/Buttons';
import { StatusBadge, VersionBadge } from '../badges/Badges';

export function VersionHistory({ agent, onRollback }: { agent: Agent; onRollback: (version: string) => void }) {
  return <div className="version-history">{agent.versions.map(version => <div className="version-row" key={version.id}><div className="version-main"><VersionBadge version={version.id} /><StatusBadge status={version.status} /><div><strong>{version.note}</strong><p>{version.updatedAt}{version.knowledge ? ` · ${version.knowledge}` : ''}</p></div></div><div className="version-action">{version.id === agent.productionVersion ? <span className="meta">当前线上</span> : <ConfirmAction actionLabel={`回退到 ${version.id}`} impact={`生产环境将从 ${agent.productionVersion} 切换至 ${version.id}，后续新请求立即使用该版本。`} onConfirm={() => onRollback(version.id)} />}</div></div>)}</div>;
}
