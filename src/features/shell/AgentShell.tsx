import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, PanelRightClose, PanelRightOpen, Settings } from 'lucide-react';
import { lifecycleSteps } from '../../data';
import type { Agent } from '../../types/domain';
import { StatusBadge, VersionBadge } from '../../shared/components/Badges';
import { useSelectedVersion } from '../../core/hooks/useSelectedVersion';
import { useDemo } from '../../core/store/DemoProvider';
import { SkeletonBadge } from '../../shared/components/Badges';
import { getCandidate } from '../../core/rules/versions';
import { lifecycleState } from '../../core/rules/lifecycle';

export function AgentShell({ agent, stepId, children, aside }: { agent: Agent; stepId: string; children: ReactNode; aside: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const skeletonView = useDemo().state.viewMode === 'skeleton';
  const steps = lifecycleSteps.filter(step => skeletonView || step.id !== 'trace');
  const { selected, select, search } = useSelectedVersion(agent);
  const states = lifecycleState(agent);
  const candidate = getCandidate(agent);
  const iteration = candidate ? `本次迭代：${candidate.id}（${candidate.status}）` : agent.productionVersion ? `当前没有候选版本，线上 ${agent.productionVersion} 已完成发布` : '尚未发布';
  return <div className="agent-shell">
    <div className="agent-sticky"><div className="agent-heading"><div><Link className="back-link" to="/"><ArrowLeft size={16} />Agent 目录</Link><div className="agent-title-row"><h1>{agent.name}</h1><span className="level-badge">{agent.level}</span></div><p>负责人：{agent.owner} · {agent.team}</p></div>
      <div className="agent-heading-actions"><label className="version-select"><span>查看版本</span><select value={selected.id} onChange={event => select(event.target.value)}>{agent.versions.map(item => <option key={item.id} value={item.id}>{item.id} · {item.status}{item.traffic ? ` ${item.traffic}%` : ''}</option>)}</select></label><StatusBadge status={selected.status} />
        <span className="production-pointer">线上指向 → {agent.productionVersion ? <VersionBadge version={agent.productionVersion} /> : <span className="meta">未发布</span>}</span>
        <Link className="icon-button agent-settings" to={`/agents/${agent.id}/settings${search}`} title="Agent 设置" aria-label="Agent 设置"><Settings size={20} strokeWidth={1.5} /></Link></div></div>
      <nav className="lifecycle-nav" aria-label="Agent 生命周期">{steps.map((step, index) => {
        const current = step.id === stepId;
        const state = states[step.id];
        return <NavLink key={step.id} to={`/agents/${agent.id}/${step.id}${search}`} className={({ isActive }) => `lifecycle-item ${isActive ? 'current' : ''}`} aria-current={step.id === stepId ? 'step' : undefined}><span className={`step-index step-${current ? '当前' : state}`}>{index + 1}</span><span className="step-copy"><strong>{step.label}{step.id === 'trace' && <SkeletonBadge number={8} />}</strong><small>{current ? `当前${state !== '未开始' ? ` · ${state}` : ''}` : state}</small></span></NavLink>;
      })}</nav></div>
    <div className="workspace-toolbar"><span className="meta">{iteration} · 正在查看 {selected.id}：{selected.note}</span><button className="button button-secondary aside-toggle" onClick={() => setDrawerOpen(value => !value)} aria-expanded={drawerOpen}>{drawerOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}辅助信息</button></div>
    <div className="workspace-columns"><section className="workspace-main">{children}</section><aside className={`workspace-aside ${drawerOpen ? 'drawer-open' : ''}`} aria-label="辅助信息"><div className="drawer-heading"><strong>辅助信息</strong><button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="关闭辅助信息"><PanelRightClose size={20} /></button></div>{aside}</aside></div>
    {drawerOpen && <button className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-label="关闭辅助信息" />}
  </div>;
}
