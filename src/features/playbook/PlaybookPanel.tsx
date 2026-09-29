import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Flag, ListChecks, MousePointerClick, RotateCcw, Sparkles, Wand2, X } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { pageNames, pagePath, playbookOf } from './playbooks';
import { Button } from '../../shared/components/Buttons';
import { DemoTag } from '../../shared/components/Badges';
import { HeroTag, heroNames } from '../../shared/components/Capability';
import { useStartPlaybook } from './useStartPlaybook';
import './playbook.css';

/** 右下角「演示步骤」浮层。 */
export function PlaybookPanel() {
  const api = useDemo();
  const { state, setPlaybookStep, exitPlaybook, opsOf, setViewMode } = api;
  const location = useLocation();
  const navigate = useNavigate();
  const start = useStartPlaybook();
  const [collapsed, setCollapsed] = useState(false);
  const [dockLeft, setDockLeft] = useState(false);
  const [exiting, setExiting] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const pb = state.playbook;
  const playbook = pb ? playbookOf(pb.id) : null;
  const agent = playbook ? state.agents.find(item => item.id === playbook.agentId) : undefined;
  const ctx = agent ? { state, agent, ops: opsOf(agent) } : null;
  const index = pb?.step ?? 0;
  const step = playbook?.steps[index];
  const finished = Boolean(playbook && index >= playbook.steps.length);
  const done = Boolean(step?.done && ctx && step.done(ctx));
  const path = playbook && step ? pagePath(playbook, step.page) : '';
  const onPage = location.pathname === path;

  /* 进入某一步时如果条件已满足，就不自动跳；只有在这一步里完成操作才自动进入下一步。 */
  const entered = useRef<{ key: string; done: boolean } | null>(null);
  const stepKey = `${pb?.id}-${index}`;
  useEffect(() => { entered.current = { key: stepKey, done }; }, [stepKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pb || !step?.done || !done) return;
    if (entered.current?.key === stepKey && entered.current.done) return;
    const timer = window.setTimeout(() => setPlaybookStep(index + 1), 1200);
    return () => window.clearTimeout(timer);
  }, [done, stepKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 高亮下一步要点的元素 */
  useEffect(() => {
    if (!step?.target || finished) return;
    let current: Element | null = null;
    let scrolled = false;
    let docked = false;
    setDockLeft(false);
    const apply = () => {
      const element = document.querySelector(`[data-demo="${step.target}"]`);
      if (element !== current) { current?.classList.remove('demo-target'); current = element; }
      if (element && !element.classList.contains('demo-target')) element.classList.add('demo-target');
      if (element && !scrolled) {
        scrolled = true;
        // 目标滚到吸顶导航下方，避免被右下角浮层挡住
        const offset = ['.global-topbar', '.agent-sticky'].reduce((max, selector) => {
          const node = document.querySelector<HTMLElement>(selector);
          if (!node) return max;
          const style = window.getComputedStyle(node);
          return style.position === 'sticky' || style.position === 'fixed' ? Math.max(max, (parseFloat(style.top) || 0) + node.offsetHeight) : max;
        }, 0) + 24;
        window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset), behavior: 'smooth' });
      }
      const panel = panelRef.current?.getBoundingClientRect();
      const box = element?.getBoundingClientRect();
      if (panel && box && window.innerWidth >= 1280) {
        const overlap = box.right > panel.left && box.left < panel.right && box.bottom > panel.top && box.top < panel.bottom;
        if (overlap && !docked && box.height < window.innerHeight / 3) { docked = true; setDockLeft(true); }
      }
    };
    apply();
    const timer = window.setInterval(apply, 400);
    return () => { window.clearInterval(timer); current?.classList.remove('demo-target'); };
  }, [stepKey, location.pathname, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pb || !playbook) return null;
  const total = playbook.steps.length;
  const go = (target: number) => {
    setPlaybookStep(target);
    const next = playbook.steps[target];
    if (next) { const nextPath = pagePath(playbook, next.page); if (nextPath !== location.pathname) navigate(nextPath); }
  };

  if (collapsed) return <button type="button" className="playbook-pill" onClick={() => setCollapsed(false)} aria-label="展开演示步骤"><ListChecks size={16} />演示步骤 · 剧本 {playbook.letter} {finished ? '已完成' : `第 ${index + 1} / ${total} 步`}<ChevronDown size={16} className="pill-caret" /></button>;

  return <aside ref={panelRef} className={`playbook-panel ${dockLeft ? 'dock-left' : ''}`} aria-label="演示步骤" aria-live="polite">
    <div className="pb-head"><div><span className="eyebrow">演示步骤 · 剧本 {playbook.letter}「{playbook.theme}」</span><strong>{playbook.title}</strong></div>
      <div className="pb-head-actions"><button type="button" className="icon-button" onClick={() => setCollapsed(true)} aria-label="收起演示步骤" title="收起"><ChevronDown size={16} /></button><button type="button" className="icon-button" onClick={() => setExiting(true)} aria-label="退出剧本" title="退出剧本"><X size={16} /></button></div></div>
    {exiting && <div className="confirmation pb-exit" role="group" aria-label="退出剧本二次确认"><strong>退出剧本 {playbook.letter}？</strong>
      <p>保留：「{playbook.title}」停在当前剧本数据，可继续自由操作。恢复：换回剧本开始前的原始演示数据。</p>
      <div className="inline-actions"><Button onClick={() => setExiting(false)}>取消</Button><Button onClick={() => { setExiting(false); exitPlaybook(false); }}>保留数据退出</Button><Button onClick={() => { setExiting(false); exitPlaybook(true); }}>恢复原始数据</Button></div></div>}
    <ol className="pb-dots" aria-label="进度">{playbook.steps.map((item, i) => <li key={item.title} className={i < index ? 'done' : i === index ? 'current' : ''} title={`${i + 1}. ${item.title}`} />)}</ol>
    {state.viewMode === 'basic' && <div className="alert-banner"><Flag size={16} aria-hidden="true" /><div><strong>当前为「只看基础能力」</strong><p>剧本用到的生产骨架能力已隐藏。</p></div><Button onClick={() => setViewMode('skeleton')}>显示生产骨架</Button></div>}
    {finished ? <div className="pb-body">
      <div className="pb-finish"><Flag size={20} aria-hidden="true" /><strong>剧本 {playbook.letter} 完成</strong></div>
      <p>{playbook.outcome}</p>
      <div className="playbook-heroes">{playbook.heroes.map(n => <HeroTag key={n} n={n} compact />)}</div>
      <div className="pb-nav"><Button onClick={() => navigate('/')}>返回工作台</Button><Button onClick={() => start(playbook.id)}><RotateCcw size={16} />重新开始</Button><Button onClick={() => setExiting(true)}>退出剧本</Button></div>
    </div> : step && <div className="pb-body">
      <span className="pb-count">第 {index + 1} / {total} 步 · {pageNames[step.page] ?? ''}</span>
      <h3>{step.title}</h3>
      <p className="pb-desc">{step.body}</p>
      {step.hero && <div className="pb-hero"><Sparkles size={16} aria-hidden="true" /><span>这一步体现了<strong>主角 {step.hero}</strong>：{heroNames[step.hero]}</span></div>}
      <div className="pb-next"><MousePointerClick size={16} aria-hidden="true" /><div><span className="meta">下一步点哪里</span><p>{onPage ? step.next : `先前往${pageNames[step.page] ?? '对应页面'}，然后：${step.next}`}</p></div></div>
      {!onPage && <Button variant="primary" onClick={() => navigate(path)}>前往{pageNames[step.page] ?? '对应页面'}<ChevronRight size={16} /></Button>}
      {onPage && step.helper && !done && ctx && <Button onClick={() => step.helper?.run({ applyFix: api.applyFix, setKbDraft: api.setKbDraft }, ctx)}><Wand2 size={16} />{step.helper.label}</Button>}
      {done && step.done && <p className="added-note"><CheckCircle2 size={16} aria-hidden="true" />这一步已完成</p>}
      <div className="pb-nav"><Button onClick={() => go(index - 1)} disabled={index === 0}><ChevronLeft size={16} />上一步</Button>
        <Button onClick={() => go(index + 1)} disabled={Boolean(step.done) && !done} reason={step.done && !done ? '完成页面上的操作后自动进入下一步' : undefined}>{index === total - 1 ? '完成剧本' : '下一步'}<ChevronRight size={16} /></Button></div>
    </div>}
    <p className="pb-foot"><DemoTag label="演示数据" />页面上所有数字均为演示数据</p>
  </aside>;
}
