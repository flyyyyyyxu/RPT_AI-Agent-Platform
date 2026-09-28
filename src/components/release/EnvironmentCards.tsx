import { Boxes, FlaskConical, Radio } from 'lucide-react';
import { StatusBadge, VersionBadge } from '../badges/Badges';

const environments = [
  { key: 'development', label: '开发', icon: Boxes, status: '进行中' as const },
  { key: 'staging', label: '预发', icon: FlaskConical, status: '通过' as const },
  { key: 'production', label: '生产', icon: Radio, status: '线上' as const },
];

export function EnvironmentCards({ values }: { values: { development: string; staging: string; production: string } }) {
  return <div className="environment-grid">{environments.map(({ key, label, icon: Icon, status }) => <div className="environment-card" key={key}><div><Icon size={20} strokeWidth={1.5} /><strong>{label}环境</strong></div><VersionBadge version={values[key as keyof typeof values]} /><StatusBadge status={status} /></div>)}</div>;
}
