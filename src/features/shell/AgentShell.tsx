import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, PanelRightClose, PanelRightOpen, Settings } from 'lucide-react';
import { lifecycleSteps, observeTabs } from '../../data';
import type { Agent } from '../../types/domain';
import { StatusBadge, VersionBadge } from '../../shared/components/Badges';
import { useSelectedVersion } from '../../core/hooks/useSelectedVersion';
import { getCandidate } from '../../core/rules/versions';
import { buildStepLabel, lifecycleState } from '../../core/rules/lifecycle';
import { NextRoundButton } from '../optimize/NextRound';
import { icon } from '../../shared/styles/tokens';

/** 监控、Trace 两个页面同属「观测」这一步 */
const observePages: readonly string[] = observeTabs.map(tab => tab.id);
const stepOf = (pageId: string) => observePages.includes(pageId) ? 'observe' : pageId;
/** 生命周期步骤对应的默认页面：观测默认进监控 */
const pageOfStep = (stepId: string) => stepId === 'observe' ? observeTabs[0].id : stepId;

/**
 * layout="build"：构建页三栏（Prompt / 能力配置 / 调试），调试栏吸顶；lead 放在三栏上方、footer 放在三栏下方，都占满整行。
 * asideLabel：窄屏时辅助栏变成抽屉，按钮上的文字。
 */
export function AgentShell({ agent, stepId, children, aside, lead, footer, layout = 'default', asideLabel = '辅助信息' }: { agent: Agent; stepId: string; children: ReactNode; aside: ReactNode; lead?: ReactNode; footer?: ReactNode; layout?: 'default' | 'build'; asideLabel?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  // 吸顶的调试栏要避开 Agent 头部：把头部高度写进 CSS 变量
  useEffect(() => {
    const sticky = stickyRef.current, shell = shellRef.current;
    if (!sticky || !shell || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => shell.style.setProperty('--agent-sticky-height', `${sticky.offsetHeight}px`));
    observer.observe(sticky);
    return () => observer.disconnect();
  }, []);
  const steps = lifecycleSteps.map(step => step.id === 'build' ? { ...step, label: buildStepLabel(agent) } : step);
  const released = agent.versions.some(version => version.everOnline);
  const { selected, select, search } = useSelectedVersion(agent);
  const states = lifecycleState(agent);
  const candidate = getCandidate(agent);
  const activeStep = stepOf(stepId);
  const iteration = candidate ? `本次迭代：${candidate.id}（${candidate.status}）` : agent.productionVersion ? `当前没有候选版本，线上 ${agent.productionVersion} 已完成发布` : '尚未发布';
  return <div className={`agent-shell agent-shell-${layout}`} ref={shellRef}>
    <div className="agent-sticky" ref={stickyRef}><div className="agent-heading"><div><Link className="back-link" to="/"><ArrowLeft size={icon.small} />Agent 目录</Link><div className="agent-title-row"><h1>{agent.name}</h1><span className="level-badge">{agent.level}</span></div><p>负责人：{agent.owner} · {agent.team}</p></div>
      <div className="agent-heading-actions"><label className="version-select"><span>查看版本</span><select value={selected.id} onChange={event => select(event.target.value)}>{agent.versions.map(item => <option key={item.id} value={item.id}>{item.id} · {item.status}{item.traffic ? ` ${item.traffic}%` : ''}</option>)}</select></label><StatusBadge status={selected.status} />
        <span className="production-pointer">线上指向 → {agent.productionVersion ? <VersionBadge version={agent.productionVersion} /> : <span className="meta">未发布</span>}</span></div></div>
      <nav className="lifecycle-nav" aria-label="Agent 生命周期">{steps.map((step, index) => {
        const current = step.id === activeStep;
        const state = states[step.id];
        return <NavLink key={step.id} to={`/agents/${agent.id}/${pageOfStep(step.id)}${search}`} className={`lifecycle-item ${current ? 'current' : ''}`} aria-current={current ? 'step' : undefined}><span className={`step-index step-${current ? '当前' : state}`}>{index + 1}</span><span className="step-copy"><strong>{step.label}</strong><small>{current ? `当前${state !== '未开始' ? ` · ${state}` : ''}` : state}</small></span></NavLink>;
      })}
        {released && <NextRoundButton agent={agent} />}
        <NavLink to={`/agents/${agent.id}/settings${search}`} className={`lifecycle-item lifecycle-settings ${activeStep === 'settings' ? 'current' : ''}`} aria-current={activeStep === 'settings' ? 'page' : undefined}><Settings size={icon.large} aria-hidden="true" /><span className="step-copy"><strong>设置</strong><small>运行策略 · 护栏 · 成本</small></span></NavLink>
      </nav>
      {activeStep === 'observe' && <nav className="observe-tabs" aria-label="观测">{observeTabs.map(tab => <NavLink key={tab.id} to={`/agents/${agent.id}/${tab.id}${search}`} className={tab.id === stepId ? 'active' : ''} aria-current={tab.id === stepId ? 'page' : undefined}>{tab.label}</NavLink>)}</nav>}
    </div>
    <div className="workspace-toolbar"><span className="meta">{iteration} · 正在查看 {selected.id}：{selected.note}</span><button className="button button-secondary aside-toggle" onClick={() => setDrawerOpen(value => !value)} aria-expanded={drawerOpen}>{drawerOpen ? <PanelRightClose size={icon.small} /> : <PanelRightOpen size={icon.small} />}{drawerOpen ? `收起${asideLabel}` : `展开${asideLabel}`}</button></div>
    {lead && <div className="workspace-lead">{lead}</div>}
    <div className={`workspace-columns ${layout === 'build' ? 'build-columns' : ''}`}><section className="workspace-main">{children}</section><aside className={`workspace-aside ${drawerOpen ? 'drawer-open' : ''}`} aria-label={asideLabel}><div className="drawer-heading"><strong>{asideLabel}</strong><button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label={`关闭${asideLabel}`}><PanelRightClose size={icon.large} /></button></div>{aside}</aside></div>
    {footer && <div className="workspace-footer">{footer}</div>}
    {drawerOpen && <button className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-label={`关闭${asideLabel}`} />}
  </div>;
}
