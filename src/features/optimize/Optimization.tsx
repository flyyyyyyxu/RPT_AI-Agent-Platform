/**
 * 调优闭环的界面：
 *   StartOptimization：观测 / 评测里的「发起优化」按钮 + 预填表单，保存后进入「构建与调优」；
 *   GoalCard：构建页「本轮优化目标」、评测页「优化目标核对」共用。
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Plus, Target, Trash2, Wrench, XCircle } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { nowStamp } from '../../core/rules/clock';
import { getCandidate } from '../../core/rules/versions';
import { goalState, goalsOfVersion, tuneTargets, type GoalSeed, type GoalState } from '../../core/rules/optimization';
import type { Agent, OptimizationGoal, TuneTarget } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { Drawer } from '../../shared/components/Drawer';
import { VersionBadge } from '../../shared/components/Badges';
import { icon } from '../../shared/styles/tokens';
import './optimize.css';

/** 「发起优化」：预填问题来源、调优对象、目标指标，确认后生成优化目标并前往构建与调优 */
export function StartOptimization({ agent, seed, label = '发起优化', demo, beforeCreate }: { agent: Agent; seed: GoalSeed; label?: string; demo?: string; beforeCreate?: () => void }) {
  const { opsOf, updateOps } = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ops = opsOf(agent);
  const existing = ops.goals.find(goal => goal.source === seed.source && goal.sourceId === seed.sourceId && goalState(agent, ops, goal) !== '已上线 · 观察中' && goalState(agent, ops, goal) !== '已回退');
  if (existing) return <Link className="goal-chip" to={`/agents/${agent.id}/build`} data-demo={demo}><Target size={icon.small} aria-hidden="true" />已发起优化 · {goalState(agent, ops, existing)}</Link>;
  return <><span data-demo={demo}><Button onClick={() => setOpen(true)}><Wrench size={icon.small} />{label}</Button></span>
    {open && <GoalForm agent={agent} seed={seed} onClose={() => setOpen(false)} onSubmit={value => {
      const candidate = getCandidate(agent);
      const at = nowStamp();
      const goal: OptimizationGoal = { ...value, id: `og-${String(ops.goals.length + 1).padStart(3, '0')}`, createdAt: at, createdBy: agent.owner, version: candidate?.id ?? null };
      beforeCreate?.();
      updateOps(agent.id, current => ({ ...current, goals: [...current.goals, goal], approvals: [{ time: at, who: agent.owner, action: `发起优化 ${goal.id}（${goal.source} ${goal.sourceId} · 调优对象 ${goal.targets.join('、') || '待定位'}${candidate ? ` · 挂到 ${candidate.id}` : ' · 等待新建候选版本'}）` }, ...current.approvals] }));
      setOpen(false);
      navigate(`/agents/${agent.id}/build`);
    }} />}</>;
}

function GoalForm({ agent, seed, onClose, onSubmit }: { agent: Agent; seed: GoalSeed; onClose: () => void; onSubmit: (value: GoalSeed) => void }) {
  const [targets, setTargets] = useState<TuneTarget[]>(seed.targets);
  const [metrics, setMetrics] = useState<string[]>(seed.metrics);
  const [verify, setVerify] = useState(seed.verify);
  const candidate = getCandidate(agent);
  const valid = metrics.filter(item => item.trim());
  const missing = !valid.length ? '至少写一个目标指标' : undefined;
  return <Drawer label="发起优化" eyebrow={`发起优化 · 来自${seed.source}`} title="本轮优化目标" meta={candidate ? `目标会挂到候选版本 ${candidate.id}，在构建与调优页修改，评测页核对是否达成。` : `当前没有候选版本；新建候选版本（普通草稿或升级依赖）时自动挂上。`} onClose={onClose} demo="goal-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : '确认后进入「构建与调优」'}</span><Button onClick={onClose}>取消</Button><Button variant="primary" disabled={Boolean(missing)} onClick={() => onSubmit({ ...seed, targets, metrics: valid, verify: verify.trim() })}>确认并去调优</Button></>}>
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

const stateTone: Record<GoalState, string> = { '待开始': 'pending', '调优中': 'pending', '未达成': 'fail', '已达成': 'pass', '灰度验证中': 'info', '已上线 · 观察中': 'pass', '已回退': 'fail' };
const StateIcon = ({ state }: { state: GoalState }) => state === '已达成' || state === '已上线 · 观察中' ? <CheckCircle2 size={icon.small} aria-hidden="true" /> : state === '未达成' || state === '已回退' ? <XCircle size={icon.small} aria-hidden="true" /> : <CircleDashed size={icon.small} aria-hidden="true" />;

/** 本轮优化目标：构建页（可移除）和评测页（核对）共用 */
/** versionId 为 null：还没有候选版本，显示等待挂载的目标 */
export function GoalCard({ agent, versionId, mode }: { agent: Agent; versionId: string | null; mode: 'build' | 'evaluation' }) {
  const { opsOf, updateOps } = useDemo();
  const ops = opsOf(agent);
  const goals = goalsOfVersion(agent, ops, versionId);
  if (!goals.length) return null;
  const remove = (goal: OptimizationGoal) => updateOps(agent.id, current => ({ ...current, goals: current.goals.filter(item => item.id !== goal.id), approvals: [{ time: nowStamp(), who: agent.owner, action: `移除优化目标 ${goal.id}（${goal.source} ${goal.sourceId}）` }, ...current.approvals] }));
  return <section className="goal-card" data-demo="goal-card">
    <div className="goal-card-head"><Target size={icon.large} aria-hidden="true" /><strong>{mode === 'build' ? '本轮优化目标' : '优化目标核对'}</strong>{versionId ? <VersionBadge version={versionId} /> : <span className="goal-state">待开始</span>}
      <span className="meta">{!versionId ? '新建候选版本（普通草稿或升级依赖）后自动挂上，开始调优' : mode === 'build' ? '改完调试 → 评测页核对 → 灰度验证' : '评测结果与本轮优化目标逐项对照'}</span></div>
    {goals.map(goal => { const state = goalState(agent, ops, goal); return <div className="goal-item" key={goal.id}>
      <dl>
        <div><dt>问题来源</dt><dd>{goal.source} {goal.sourceId}「{goal.title}」{goal.traceId && <Link className="link-button" to={`/agents/${agent.id}/trace?trace=${goal.traceId}`}>查看 Trace {goal.traceId}</Link>}</dd></div>
        <div><dt>调优对象</dt><dd>{goal.targets.length ? goal.targets.map(item => <span key={item} className="goal-target">{item}</span>) : <span className="meta">待定位（去 Trace 确认问题出在哪一环）</span>}</dd></div>
        <div><dt>目标指标</dt><dd><ul>{goal.metrics.map(item => <li key={item}>{item}</li>)}</ul></dd></div>
        <div><dt>验证方式</dt><dd>{goal.verify}</dd></div>
      </dl>
      <div className="goal-item-side"><span className={`goal-state tone-${stateTone[state]}`}><StateIcon state={state} />{state}</span>
        {mode === 'build' && <button type="button" className="link-button" onClick={() => remove(goal)}>移除</button>}</div>
    </div>; })}
  </section>;
}
