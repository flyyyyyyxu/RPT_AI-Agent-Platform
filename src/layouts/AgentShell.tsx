import { useState, type ReactNode } from 'react';
import { Link, NavLink, useSearchParams } from 'react-router-dom';
import { PanelRightClose, PanelRightOpen, Settings } from 'lucide-react';
import { lifecycleSteps } from '../data/mock';
import type { Agent } from '../types/domain';
import { StatusBadge, VersionBadge } from '../components/badges/Badges';

const progressLabels = ['已完成', '当前', '未开始'] as const;

export function AgentShell({ agent, stepId, children, aside }: { agent: Agent; stepId: string; children: ReactNode; aside: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const stepIndex = lifecycleSteps.findIndex(step => step.id === stepId);
  const version = agent.versions.find(item => item.id === searchParams.get('version')) ?? agent.versions.find(item => item.id === agent.productionVersion) ?? agent.versions[0];
  const versionSearch = version.id === agent.productionVersion ? '' : `?version=${version.id}`;
  return <div className="agent-shell">
    <div className="agent-sticky"><div className="agent-heading"><div><Link className="back-link" to="/">← Agent 目录</Link><div className="agent-title-row"><h1>{agent.name}</h1><span className="level-badge">{agent.level}</span></div><p>负责人：{agent.owner} · {agent.team}</p></div>
      <div className="agent-heading-actions"><label className="version-select"><span>查看版本</span><select value={version.id} onChange={event => setSearchParams(event.target.value === agent.productionVersion ? {} : { version: event.target.value })}>{agent.versions.map(item => <option key={item.id} value={item.id}>{item.id} · {item.status}</option>)}</select></label><StatusBadge status={version.status} /><span className="production-pointer">线上指向 → <VersionBadge version={agent.productionVersion} /></span><Link className="icon-button agent-settings" to={`/agents/${agent.id}/settings${versionSearch}`} title="Agent 设置" aria-label="Agent 设置"><Settings size={20} strokeWidth={1.5} /></Link></div></div>
      <nav className="lifecycle-nav" aria-label="Agent 生命周期">{lifecycleSteps.map((step, index) => {
        const progress = stepIndex < 0 ? '未开始' : progressLabels[index < stepIndex ? 0 : index === stepIndex ? 1 : 2];
        return <NavLink key={step.id} to={`/agents/${agent.id}/${step.id}${versionSearch}`} className={({ isActive }) => `lifecycle-item ${isActive ? 'current' : ''}`} aria-current={step.id === stepId ? 'step' : undefined}><span className={`step-index step-${progress}`}>{index + 1}</span><span className="step-copy"><strong>{step.label}</strong><small>{progress}</small></span></NavLink>;
      })}</nav></div>
    <div className="workspace-toolbar"><span className="meta">当前查看 {version.id} · {version.note}</span><button className="button button-secondary aside-toggle" onClick={() => setDrawerOpen(value => !value)} aria-expanded={drawerOpen}>{drawerOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}辅助信息</button></div>
    <div className="workspace-columns"><section className="workspace-main">{children}</section><aside className={`workspace-aside ${drawerOpen ? 'drawer-open' : ''}`} aria-label="辅助信息"><div className="drawer-heading"><strong>辅助信息</strong><button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="关闭辅助信息"><PanelRightClose size={20} /></button></div>{aside}</aside></div>
    {drawerOpen && <button className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-label="关闭辅助信息" />}
  </div>;
}
