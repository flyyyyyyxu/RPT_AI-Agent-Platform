import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Boxes, ChevronLeft, ChevronRight, Gauge, LayoutGrid, Menu, RotateCcw, ShieldCheck, Store, X } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { assetSections } from '../../data';
import { Button } from '../../shared/components/Buttons';
import { DemoBadge, ScopeBadge } from '../../shared/components/Badges';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { PlaybookPanel, usePlaybookPanel } from '../playbook/PlaybookPanel';
import './shell.css';
import { icon } from '../../shared/styles/tokens';

/**
 * 一级导航按两个轴组织：
 *   工作台：进入单个 Agent 的生产闭环（纵轴）
 *   资产中心 / 监控与成本 / 治理：跨 Agent 的平台共享能力（横轴）；资产中心下常驻展开五个二级目录
 */
const workbench = { to: '/', label: '工作台', icon: LayoutGrid };
const assets = { to: '/assets/knowledge', label: '资产中心', icon: Boxes };
const platformNav = [
  { to: '/operations', label: '监控与成本', icon: Gauge },
  { to: '/governance', label: '治理', icon: ShieldCheck },
];
const navigation = [workbench, ...platformNav];

function Breadcrumbs() {
  const { pathname } = useLocation();
  const { state } = useDemo();
  const parts = pathname.split('/').filter(Boolean);
  const agent = parts[0] === 'agents' ? state.agents.find(item => item.id === parts[1]) : undefined;
  const current = pathname === '/design-system' ? '设计规范' : pathname === '/agents/new' ? '新建 Agent' : agent ? ({ build: '构建', evaluation: '评测', release: '发布与实验', monitor: '观测 · 监控', trace: '观测 · Trace 与 bad case', settings: '设置' } as Record<string, string>)[parts[2] ?? 'build']
    : parts[0] === 'assets' ? assetSections.find(item => item.id === parts[1])?.label ?? '资产中心' : navigation.find(item => item.to === pathname)?.label ?? '工作台';
  return <nav className="breadcrumbs" aria-label="面包屑"><Link to="/">工作台</Link>{agent && <><ChevronRight aria-hidden="true" /><Link to={`/agents/${agent.id}/build`}>{agent.name}</Link></>}
    {parts[0] === 'assets' && <><ChevronRight aria-hidden="true" /><Link to={assets.to}>资产中心</Link></>}
    {(pathname !== '/' || agent) && <><ChevronRight aria-hidden="true" /><span aria-current="page">{current}</span></>}</nav>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { reset } = useDemo();
  const playbook = usePlaybookPanel();
  const location = useLocation();
  const navigate = useNavigate();
  const navLink = ({ to, label, icon: Icon }: typeof workbench) => <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${(isActive || (to === '/' && location.pathname.startsWith('/agents'))) ? 'active' : ''}`}><Icon size={icon.large} aria-hidden="true" /><span>{label}</span></NavLink>;
  const inAssets = location.pathname.startsWith('/assets');
  const navItems = <>{navLink(workbench)}
    <NavLink to={assets.to} title={collapsed ? assets.label : undefined} onClick={() => setMobileOpen(false)} className={() => `nav-item ${inAssets ? 'parent-active' : ''}`} aria-current={inAssets ? 'true' : undefined}><assets.icon size={icon.large} aria-hidden="true" /><span>{assets.label}</span></NavLink>
    <div className="nav-subgroup" role="group" aria-label="资产中心">{assetSections.map(item => <NavLink key={item.id} to={`/assets/${item.id}`} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-sub-item ${isActive ? 'active' : ''}`}>{item.label}</NavLink>)}</div>
    {platformNav.map(navLink)}
    <div className="nav-item nav-item-phase2" title="二期建设" aria-disabled="true"><Store size={icon.large} aria-hidden="true" /><span>模板广场</span><ScopeBadge phase="二期" /></div></>;
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${playbook.expanded ? 'has-playbook' : playbook.pb ? 'has-playbook-pill' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="一级导航">
      <div className="brand"><span className="brand-symbol" aria-hidden="true">A</span><span className="brand-text">Agent 基建平台</span><button className="icon-button collapse-button" onClick={() => setCollapsed(value => !value)} title={collapsed ? '展开导航' : '收起导航'} aria-label={collapsed ? '展开导航' : '收起导航'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button></div>
      <nav className="sidebar-links">{navItems}</nav>
      <div className="sidebar-bottom"><NavLink to="/design-system" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? '设计规范' : undefined}><span className="design-dot" /><span>设计规范</span></NavLink></div>
    </aside>
    <div className="app-body"><header className="global-topbar"><button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(value => !value)} aria-label={mobileOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileOpen}>{mobileOpen ? <X /> : <Menu />}</button><Breadcrumbs />
      <div className="topbar-actions"><Button onClick={() => { reset(); navigate('/'); }} className="reset-button"><RotateCcw size={icon.small} />重置演示</Button></div></header>
      <main className="content"><div className="page-container" key={location.pathname}><div className="page-utility"><DemoBadge /></div><ErrorBoundary resetKey={location.pathname} onReset={() => { reset(); navigate('/'); }}>{children}</ErrorBoundary></div></main></div>
    <PlaybookPanel />
    {mobileOpen && <button className="mobile-scrim" aria-label="关闭菜单" onClick={() => setMobileOpen(false)} />}
  </div>;
}
