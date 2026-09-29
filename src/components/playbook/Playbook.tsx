import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Flag, ListChecks, MousePointerClick, Play, RotateCcw, Sparkles, Wand2, X } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { pageNames, pagePath, playbookOf, playbooks, type Playbook } from '../../app/playbooks';
import type { PlaybookId } from '../../types/domain';
import { Button } from '../actions/Buttons';
import { DemoTag } from '../badges/Badges';
import { Card, SectionHeading } from '../content/Content';
import { HeroTag, heroNames } from '../skeleton/Skeleton';

/** 开始剧本：换成剧本的初始数据，并跳到第一步所在页面。 */
export function useStartPlaybook() {
  const { startPlaybook } = useDemo();
  const navigate = useNavigate();
  return (id: PlaybookId) => { const playbook = playbookOf(id); startPlaybook(id); navigate(pagePath(playbook, playbook.steps[0].page)); };
}

/** 工作台上的剧本入口。 */
export function PlaybookCards() {
  const { state, setPlaybookStep } = useDemo();
  const start = useStartPlaybook();
  const navigate = useNavigate();
  const resume = (playbook: Playbook, step: number) => { setPlaybookStep(step); const target = playbook.steps[Math.min(step, playbook.steps.length - 1)]; navigate(pagePath(playbook, target.page)); };
  return <section className="playbook-section" aria-label="演示剧本">
    <SectionHeading eyebrow="演示剧本" title="从一个真实问题走完一遍" description="每条剧本都复用现有页面，只换数据；右下角「演示步骤」浮层会告诉你下一步点哪里。所有数字均为演示数据。" aside={<DemoTag />} />
    <div className="playbook-grid">{playbooks.map(playbook => {
      const active = state.playbook?.id === playbook.id ? state.playbook : null;
      return <Card key={playbook.id} className={`playbook-card ${active ? 'active' : ''}`}>
        <div className="playbook-card-head"><span className="playbook-letter">{playbook.letter}</span><div><span className="eyebrow">剧本 {playbook.letter} · 体现「{playbook.theme}」</span><h3>{playbook.title}</h3></div></div>
        <p>{playbook.summary}</p>
        <ol className="playbook-flow">{playbook.flow.map(item => <li key={item}>{item}</li>)}</ol>
        <div className="playbook-heroes">{playbook.heroes.map(n => <HeroTag key={n} n={n} compact />)}</div>
        <div className="playbook-card-foot"><span className="meta">{playbook.steps.length} 步{active ? ` · 进行到第 ${Math.min(active.step + 1, playbook.steps.length)} 步` : ''}</span>
          <span className="inline-actions">{active && active.step < playbook.steps.length && <Button onClick={() => resume(playbook, active.step)}><ChevronRight size={16} />继续</Button>}
            <Button onClick={() => start(playbook.id)}>{active ? <RotateCcw size={16} /> : <Play size={16} />}{active ? '重新开始' : `开始剧本 ${playbook.letter}`}</Button></span></div>
      </Card>;
    })}</div>
  </section>;
}

/** 右下角「演示步骤」浮层。 */
export function PlaybookPanel() {
  const api = useDemo();
  const { state, setPlaybookStep, exitPlaybook, opsOf, setViewMode } = api;
  const location = useLocation();
  const navigate = useNavigate();
  const start = useStartPlaybook();
  const [collapsed, setCollapsed] = useState(false);
  const [dockLeft, setDockLeft] = useState(false);
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
      <div className="pb-head-actions"><button type="button" className="icon-button" onClick={() => setCollapsed(true)} aria-label="收起演示步骤" title="收起"><ChevronDown size={16} /></button><button type="button" className="icon-button" onClick={exitPlaybook} aria-label="退出剧本" title="退出剧本（数据保留）"><X size={16} /></button></div></div>
    <ol className="pb-dots" aria-label="进度">{playbook.steps.map((item, i) => <li key={item.title} className={i < index ? 'done' : i === index ? 'current' : ''} title={`${i + 1}. ${item.title}`} />)}</ol>
    {state.viewMode === 'basic' && <div className="alert-banner"><Flag size={16} aria-hidden="true" /><div><strong>当前为「只看基础能力」</strong><p>剧本用到的生产骨架能力已隐藏。</p></div><Button onClick={() => setViewMode('skeleton')}>显示生产骨架</Button></div>}
    {finished ? <div className="pb-body">
      <div className="pb-finish"><Flag size={20} aria-hidden="true" /><strong>剧本 {playbook.letter} 完成</strong></div>
      <p>{playbook.outcome}</p>
      <div className="playbook-heroes">{playbook.heroes.map(n => <HeroTag key={n} n={n} compact />)}</div>
      <div className="pb-nav"><Button onClick={() => navigate('/')}>返回工作台</Button><Button onClick={() => start(playbook.id)}><RotateCcw size={16} />重新开始</Button><Button onClick={exitPlaybook}>退出剧本</Button></div>
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
