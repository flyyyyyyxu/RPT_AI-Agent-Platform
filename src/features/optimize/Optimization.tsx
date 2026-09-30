/**
 * 调优闭环的界面：
 *   StartOptimization：告警 / AB 实验 / 评测门槛上的「纳入本轮优化」按钮 + 预填表单，确认后进入「构建与调优」；
 *     bad case 在 Trace 页的列表里直接纳入（归因和期望输出已在展开详情里确认），不再弹表单；
 *   RoundProgress：本轮进度 ① 改配置 ② 调试 ③ 评测核对 ④ 灰度验证；
 *   GoalCard：构建页「本轮优化目标」（含建议动作）、评测页「优化目标核对」共用。
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Lightbulb, Plus, Target, Trash2, Wrench, XCircle } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { badcasesFor } from '../../core/data-access/scenarioData';
import { getCandidate, getExperiment } from '../../core/rules/versions';
import { goalState, goalsOfVersion, roundProgress, roundSteps, tuneAdvice, tuneTargets, untouchedTargets, type GoalSeed, type GoalState } from '../../core/rules/optimization';
import type { Agent, OptimizationGoal, TuneTarget } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { Drawer } from '../../shared/components/Drawer';
import { VersionBadge } from '../../shared/components/Badges';
import { icon } from '../../shared/styles/tokens';
import { nowStamp } from '../../core/rules/clock';
import { useRound } from './useRound';
import './optimize.css';

/** 「纳入本轮优化」：预填问题来源、调优对象、目标指标，确认后生成优化目标并前往构建与调优 */
export function StartOptimization({ agent, seed, label = '纳入本轮优化', demo }: { agent: Agent; seed: GoalSeed; label?: string; demo?: string }) {
  const { opsOf } = useDemo();
  const { include } = useRound(agent);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ops = opsOf(agent);
  const existing = ops.goals.find(goal => goal.source === seed.source && goal.sourceId === seed.sourceId && goalState(agent, ops, goal) !== '已上线 · 观察中' && goalState(agent, ops, goal) !== '已回退');
  if (existing) return <Link className="goal-chip" to={`/agents/${agent.id}/build`} data-demo={demo}><Target size={icon.small} aria-hidden="true" />{goalState(agent, ops, existing) === '灰度验证中' ? '上一轮已纳入 · 灰度验证中' : `已纳入本轮 · ${goalState(agent, ops, existing)}`}</Link>;
  return <><span data-demo={demo}><Button onClick={() => setOpen(true)}><Wrench size={icon.small} />{label}</Button></span>
    {/* 挂到 body：避免继承告警条、AB 行等所在位置的对齐和颜色 */}
    {open && createPortal(<GoalForm agent={agent} seed={seed} onClose={() => setOpen(false)} onSubmit={value => { include([{ seed: value }]); setOpen(false); navigate(`/agents/${agent.id}/build`); }} />, document.body)}</>;
}

function GoalForm({ agent, seed, onClose, onSubmit }: { agent: Agent; seed: GoalSeed; onClose: () => void; onSubmit: (value: GoalSeed) => void }) {
  const [targets, setTargets] = useState<TuneTarget[]>(seed.targets);
  const [metrics, setMetrics] = useState<string[]>(seed.metrics);
  const [verify, setVerify] = useState(seed.verify);
  const candidate = getCandidate(agent);
  const valid = metrics.filter(item => item.trim());
  const missing = !valid.length ? '至少写一个目标指标' : undefined;
  return <Drawer label="纳入本轮优化" eyebrow={`纳入本轮优化 · 来自 ${seed.source}`} title="本轮优化目标" meta={candidate ? `目标会挂到候选版本 ${candidate.id}，在构建与调优页修改，评测页核对是否达成。` : `当前没有候选版本；新建候选版本（普通草稿或升级依赖）时自动挂上。`} onClose={onClose} demo="goal-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : '确认后进入「构建与调优」'}</span><Button onClick={onClose}>取消</Button><Button variant="primary" disabled={Boolean(missing)} onClick={() => onSubmit({ ...seed, targets, metrics: valid, verify: verify.trim() })}>纳入并去调优</Button></>}>
    <div className="goal-form">
      <div className="goal-source"><span className="meta">问题来源</span><strong>{seed.source} · {seed.sourceId}</strong><span>{seed.title}</span>{seed.traceId && <span className="meta">关联 Trace {seed.traceId}</span>}</div>
      <div className="field-label">调优对象<div className="asset-chips" role="group" aria-label="调优对象">{tuneTargets.map(item => { const on = targets.includes(item); return <button type="button" key={item} aria-pressed={on} className={on ? 'on' : ''} onClick={() => setTargets(on ? targets.filter(t => t !== item) : [...targets, item])}>{item}</button>; })}</div>
        <span className="meta field-hint">{targets.length ? '构建与调优页会展开并高亮对应模块。' : '还不确定问题在哪一环时可以先不选，去 Trace 定位后再补。'}</span></div>
      <div className="field-label">目标指标<div className="goal-metric-rows">{metrics.map((item, index) => <div className="goal-metric-row" key={index}><input aria-label={`目标指标 ${index + 1}`} value={item} onChange={event => setMetrics(metrics.map((m, i) => i === index ? event.target.value : m))} /><button type="button" className="icon-button" aria-label="删除目标指标" onClick={() => setMetrics(metrics.filter((_, i) => i !== index))}><Trash2 size={icon.small} /></button></div>)}</div>
        <Button onClick={() => setMetrics([...metrics, ''])}><Plus size={icon.small} />添加目标指标</Button></div>
      <label className="field-label">验证方式<input aria-label="验证方式" value={verify} onChange={event => setVerify(event.target.value)} /></label>
    </div>
  </Drawer>;
}

export const stateTone: Record<GoalState, string> = { '待开始': 'pending', '调优中': 'pending', '未达成': 'fail', '已达成': 'pass', '灰度验证中': 'info', '已上线 · 观察中': 'pass', '已回退': 'fail' };
export const StateIcon = ({ state }: { state: GoalState }) => state === '已达成' || state === '已上线 · 观察中' ? <CheckCircle2 size={icon.small} aria-hidden="true" /> : state === '未达成' || state === '已回退' ? <XCircle size={icon.small} aria-hidden="true" /> : <CircleDashed size={icon.small} aria-hidden="true" />;

/** 本轮进度：一轮优化 = 一个候选版本 + 一组要解决的问题。下一步提示按当前状态和本轮问题的来源给出 */
export function RoundProgress({ agent, versionId }: { agent: Agent; versionId: string | null }) {
  const { opsOf } = useDemo();
  const ops = opsOf(agent);
  const goals = goalsOfVersion(agent, ops, versionId);
  const states = roundProgress(agent, ops, versionId);
  const current = states.indexOf('current');
  const version = versionId ? agent.versions.find(item => item.id === versionId) : null;
  const hasBadcase = goals.some(goal => goal.source === 'bad case');
  const untouched = versionId ? untouchedTargets(agent, ops, versionId) : [];
  const gray = version?.status === '灰度中' || version?.status === '影子运行';
  const hint = !goals.length ? null
    : !versionId ? '新建候选版本（普通草稿或升级依赖），本轮问题会自动挂上'
    : current === 0 ? untouched.length ? `还没改：${untouched.join('、')}，按建议动作修改后保存为候选版本` : '按建议动作修改配置，保存为候选版本'
    : current === 1 ? hasBadcase ? '在调试台用本轮问题的原话验证' : '在调试台验证修改效果'
    : current === 2 ? hasBadcase ? '去评测页用 bad case 回归集核对目标' : '去评测页重新评测，核对目标指标'
    : current === 3 ? gray ? '灰度中：看 AB 报告和告警，没问题再全量' : '去发布页灰度发布，观察 AB 报告和告警'
    : null;
  return <div className="round-progress-wrap">
    <ol className="round-progress" aria-label="本轮进度">{roundSteps.map((label, index) => <li key={label} className={`round-step is-${states[index]}`} aria-current={states[index] === 'current' ? 'step' : undefined}><span className="round-index">{states[index] === 'done' ? <CheckCircle2 size={icon.small} aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
    {hint && <span className="meta round-hint">下一步：{hint}</span>}
  </div>;
}

const adviceLink = (agent: Agent, target: TuneTarget) => target === '知识' ? { to: '/assets/knowledge', label: '去资产中心 · 知识库' } : target === '工具' ? { to: '/assets/tools', label: '去资产中心 · 工具' } : target === '策略' ? { to: `/agents/${agent.id}/settings`, label: '去设置' } : null;

/** 本轮优化目标：构建页（可移出、有建议动作）和评测页（核对）共用。versionId 为 null：还没有候选版本，显示等待挂载的目标 */
export function GoalCard({ agent, versionId, mode }: { agent: Agent; versionId: string | null; mode: 'build' | 'evaluation' }) {
  const { opsOf, updateOps } = useDemo();
  const ops = opsOf(agent);
  const goals = goalsOfVersion(agent, ops, versionId);
  if (!goals.length) return null;
  const targets = [...new Set(goals.flatMap(goal => goal.targets))];
  const experiment = getExperiment(agent);
  const remove = (goal: OptimizationGoal) => updateOps(agent.id, current => ({ ...current, goals: current.goals.filter(item => item.id !== goal.id), approvals: [{ time: nowStamp(), who: agent.owner, action: `移出本轮优化 ${goal.id}（${goal.source} ${goal.sourceId}）` }, ...current.approvals] }));
  const sourceLink = (goal: OptimizationGoal) => goal.source === 'bad case' ? `/agents/${agent.id}/trace?badcase=${goal.sourceId}` : goal.source === '告警' ? `/agents/${agent.id}/monitor` : goal.source === 'AB 实验' ? `/agents/${agent.id}/release` : `/agents/${agent.id}/evaluation`;
  return <section className="goal-card" data-demo="goal-card">
    <div className="goal-card-head"><Target size={icon.large} aria-hidden="true" /><strong>{mode === 'build' ? '本轮优化目标' : '优化目标核对'}</strong>{versionId ? <VersionBadge version={versionId} /> : <span className="goal-state">待开始</span>}
      <span className="meta">{goals.length} 个问题 · {mode === 'build' ? '一轮优化 = 一个候选版本 + 一组要解决的问题' : '评测结果与本轮优化目标逐项对照'}</span></div>
    <RoundProgress agent={agent} versionId={versionId} />
    {mode === 'build' && !versionId && experiment && goals.some(goal => goal.sourceId.startsWith(`${experiment.id}:`) || goal.title.includes(`（${experiment.id}）`) || (goal.source === 'bad case' && badcasesFor(agent).find(item => item.id === goal.sourceId)?.version === experiment.id)) && <p className="goal-note">问题出在灰度中的 {experiment.id}：在顶部「查看版本」切到 {experiment.id}，基于它新建草稿修改；线上 {agent.productionVersion} 不含 {experiment.id} 的改动。</p>}
    {mode === 'build' && targets.length > 0 && <div className="goal-advice"><span className="goal-advice-title"><Lightbulb size={icon.small} aria-hidden="true" />建议动作</span>
      <ul>{targets.map(target => { const link = adviceLink(agent, target); return <li key={target}><span className="goal-target">{target}</span><span>{tuneAdvice[target]}</span>{link && <Link className="link-button" to={link.to}>{link.label}</Link>}</li>; })}</ul></div>}
    <ul className="goal-rows">{goals.map(goal => { const state = goalState(agent, ops, goal); return <li className="goal-row" key={goal.id}>
      <details open={mode === 'evaluation' && goals.length <= 3}>
        <summary><span className={`goal-state tone-${stateTone[state]}`}><StateIcon state={state} />{state}</span><span className="source-tag">{goal.source}</span><span className="goal-row-title">{goal.title}</span>
          <span className="goal-row-targets">{goal.targets.length ? goal.targets.map(item => <span key={item} className="goal-target">{item}</span>) : <span className="meta">待定位</span>}</span></summary>
        <dl>
          <div><dt>问题来源</dt><dd>{goal.source} {goal.sourceId} <Link className="link-button" to={sourceLink(goal)}>{goal.source === 'bad case' ? '查看 bad case 与 Trace' : '查看来源'}</Link></dd></div>
          <div><dt>目标指标</dt><dd><ul>{goal.metrics.map(item => <li key={item}>{item}</li>)}</ul></dd></div>
          <div><dt>验证方式</dt><dd>{goal.verify}</dd></div>
          <div><dt>纳入时间</dt><dd>{goal.createdAt} · {goal.createdBy}{mode === 'build' && <button type="button" className="link-button goal-remove" onClick={() => remove(goal)}>移出本轮</button>}</dd></div>
        </dl>
      </details>
    </li>; })}</ul>
  </section>;
}
