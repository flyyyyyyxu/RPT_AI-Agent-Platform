/** ⑦ ⑧ 告警（来自公司监控平台，演示数据）。 */
import { BellRing, CheckCircle2 } from 'lucide-react';
import { alertsFor } from '../../core/data-access/scenarioData';
import type { ReactNode } from 'react';
import type { Agent, AlertDef } from '../../types/domain';
import { DemoTag, IntegrationNote, VersionBadge } from './Badges';
import { icon } from '../styles/tokens';

/* ---------------- ⑦ ⑧ 告警（来自公司监控平台） ---------------- */
/** action：生效中的告警上的操作（例如「发起优化」），由页面传入 */
export function AlertBanners({ agent, action }: { agent: Agent; action?: (alert: AlertDef) => ReactNode }) {
  const alerts = alertsFor(agent);
  if (!alerts.length) return null;
  return <div className="alert-stack" data-demo="alert">{alerts.map(alert => {
    const version = agent.versions.find(item => item.id === alert.version);
    const active = Boolean(version && (version.status === '灰度中' || version.status === '影子运行' || version.id === agent.productionVersion));
    // 版本从没灰度 / 上线过，就不存在「已恢复」的告警
    if (!active && !version?.experimentAt) return null;
    return active
      ? <div key={alert.id} className="alert-banner error" role="alert"><BellRing size={icon.large} aria-hidden="true" /><div>
          <div className="alert-title"><strong>告警 · {alert.title}</strong><VersionBadge version={alert.version} /><DemoTag /></div>
          <p>{alert.detail} · 触发于 {alert.time}</p><p>已通知：{alert.notify}</p><IntegrationNote platform="监控" /></div>{action?.(alert)}</div>
      : <div key={alert.id} className="alert-banner success" role="status"><CheckCircle2 size={icon.large} aria-hidden="true" /><div>
          <div className="alert-title"><strong>告警已恢复 · {alert.title}</strong><VersionBadge version={alert.version} /><DemoTag /></div><p>{alert.resolvedNote}</p><IntegrationNote platform="监控" /></div></div>;
  })}</div>;
}
