/** ⑦ ⑧ 告警（来自公司监控平台，演示数据）。 */
import { BellRing, CheckCircle2 } from 'lucide-react';
import { alertsFor } from '../../core/data-access/scenarioData';
import type { Agent } from '../../types/domain';
import { DemoTag, IntegrationNote, VersionBadge } from './Badges';
import { HeroTag } from './Capability';

/* ---------------- ⑦ ⑧ 告警（来自公司监控平台） ---------------- */
export function AlertBanners({ agent }: { agent: Agent }) {
  const alerts = alertsFor(agent);
  if (!alerts.length) return null;
  return <div className="alert-stack" data-demo="alert">{alerts.map(alert => {
    const version = agent.versions.find(item => item.id === alert.version);
    const active = Boolean(version && (version.status === '灰度中' || version.status === '影子运行' || version.id === agent.productionVersion));
    return active
      ? <div key={alert.id} className="alert-banner error hero-alert" role="alert"><BellRing size={20} aria-hidden="true" /><div>
          <div className="alert-title"><strong>告警 · {alert.title}</strong><VersionBadge version={alert.version} /><HeroTag n={4} compact /><DemoTag /></div>
          <p>{alert.detail} · 触发于 {alert.time}</p><p>已通知：{alert.notify}</p><IntegrationNote platform="监控" /></div></div>
      : <div key={alert.id} className="alert-banner success" role="status"><CheckCircle2 size={20} aria-hidden="true" /><div>
          <div className="alert-title"><strong>告警已恢复 · {alert.title}</strong><VersionBadge version={alert.version} /><DemoTag /></div><p>{alert.resolvedNote}</p><IntegrationNote platform="监控" /></div></div>;
  })}</div>;
}
