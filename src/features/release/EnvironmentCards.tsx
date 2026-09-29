import { Boxes, FlaskConical, Radio } from 'lucide-react';
import type { Agent } from '../../types/domain';
import { getCandidate, getVersion } from '../../core/rules/versions';
import { StatusBadge, VersionBadge } from '../../shared/components/Badges';

export function EnvironmentCards({ agent }: { agent: Agent }) {
  const development = getCandidate(agent)?.id ?? agent.productionVersion;
  const environments = [
    { key: 'development', label: '开发', icon: Boxes, version: development, note: '候选版本在此调试和评测' },
    { key: 'staging', label: '预发', icon: FlaskConical, version: agent.stagingVersion, note: '最近一次进入预发的版本' },
    { key: 'production', label: '生产', icon: Radio, version: agent.productionVersion, note: '线上指向，发布和回退都会改变它' },
  ];
  return <div className="environment-grid">{environments.map(({ key, label, icon: Icon, version, note }) => {
    const item = getVersion(agent, version);
    return <div className={`environment-card ${key === 'production' ? 'production' : ''}`} key={key}><div className="environment-title"><Icon size={20} strokeWidth={1.5} /><strong>{label}环境</strong></div>
      <div className="environment-version">{item ? <><VersionBadge version={item.id} /><StatusBadge status={item.status} /></> : <span className="meta">暂无版本</span>}</div><p className="meta">{note}</p></div>;
  })}</div>;
}
