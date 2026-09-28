import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Blocks, ChevronDown, Layers, ChevronLeft, ChevronRight, ClipboardCheck, Gauge, LayoutGrid, Menu, RotateCcw, Settings, X } from 'lucide-react';
import { useDemo } from '../app/DemoProvider';
import { teams } from '../data/mock';
import { Button } from '../components/actions/Buttons';
import { DemoBadge } from '../components/badges/Badges';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';

const navigation = [
  { to: '/', label: '工作台', icon: LayoutGrid },
  { to: '/library', label: '能力组件库', icon: Blocks },
  { to: '/evaluation', label: '评测中心', icon: ClipboardCheck },
  { to: '/operations', label: '运维与成本', icon: Gauge },
  { to: '/settings', label: '设置', icon: Settings },
];

function Breadcrumbs() {
  const { pathname } = useLocation();
  const { state } = useDemo();
  const parts = pathname.split('/').filter(Boolean);
  const agent = parts[0] === 'agents' ? state.agents.find(item => item.id === parts[1]) : undefined;
  const current = pathname === '/design-system' ? '设计规范' : pathname === '/agents/new' ? '新建 Agent' : agent ? ({ build: '构建', evaluation: '评测', release: '发布与实验', monitor: '监控', trace: 'Trace 与 bad case', settings: '设置' } as Record<string, string>)[parts[2] ?? 'build'] : navigation.find(item => item.to === pathname)?.label ?? '工作台';
  return <nav className="breadcrumbs" aria-label="面包屑"><Link to="/">工作台</Link>{agent && <><ChevronRight aria-hidden="true" /><Link to={`/agents/${agent.id}/build`}>{agent.name}</Link></>}
    {(pathname !== '/' || agent) && <><ChevronRight aria-hidden="true" /><span aria-current="page">{current}</span></>}</nav>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, setTeam, reset, setViewMode } = useDemo();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${(isActive || (to === '/' && location.pathname.startsWith('/agents'))) ? 'active' : ''}`}><Icon size={20} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span></NavLink>);
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="一级导航">
      <div className="brand"><span className="brand-symbol" aria-hidden="true">A</span><span className="brand-text">Agent 基建平台</span><button className="icon-button collapse-button" onClick={() => setCollapsed(value => !value)} title={collapsed ? '展开导航' : '收起导航'} aria-label={collapsed ? '展开导航' : '收起导航'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button></div>
      <nav className="sidebar-links">{navItems}</nav>
      <div className="sidebar-bottom"><NavLink to="/design-system" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? '设计规范' : undefined}><span className="design-dot" /><span>设计规范</span></NavLink></div>
    </aside>
    <div className="app-body"><header className="global-topbar"><button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(value => !value)} aria-label={mobileOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileOpen}>{mobileOpen ? <X /> : <Menu />}</button><Breadcrumbs />
      <div className="topbar-actions"><div className="view-toggle" role="radiogroup" aria-label="能力视图"><span className="view-toggle-label">能力视图</span>{([['basic', '只看基础能力'], ['skeleton', '显示生产骨架']] as const).map(([mode, label]) => <button key={mode} type="button" role="radio" aria-checked={state.viewMode === mode} className={state.viewMode === mode ? 'active' : ''} onClick={() => setViewMode(mode)}>{mode === 'skeleton' && <Layers size={16} strokeWidth={1.5} aria-hidden="true" />}{label}</button>)}</div>
      <label className="team-select"><span className="sr-only">切换团队</span><select value={state.team} onChange={event => setTeam(event.target.value)}>{teams.map(team => <option key={team}>{team}</option>)}</select><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" /></label>
      <Button onClick={() => { reset(); navigate('/'); }} className="reset-button"><RotateCcw size={16} strokeWidth={1.5} />重置演示</Button></div></header>
      <main className="content"><div className="page-container" key={location.pathname}><div className="page-utility"><DemoBadge /></div><ErrorBoundary resetKey={location.pathname} onReset={() => { reset(); navigate('/'); }}>{children}</ErrorBoundary></div></main></div>
    {mobileOpen && <button className="mobile-scrim" aria-label="关闭菜单" onClick={() => setMobileOpen(false)} />}
  </div>;
}
