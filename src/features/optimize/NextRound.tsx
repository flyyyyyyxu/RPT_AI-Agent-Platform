/**
 * 「下一轮」：导航上观测之后的回环入口和它打开的抽屉。
 * 一轮优化 = 一个候选版本 + 一组要解决的问题。
 *   本轮：挂在当前候选版本上的问题（没有候选版本时，是等下一个候选版本的问题）；
 *   验证中：挂在灰度 / 影子运行版本上的上一轮问题，单独列出，不算进本轮；
 *   待处理问题：告警、门槛未过、AB 变差排在前面，bad case 按影响度排序，每一行都能直接「纳入本轮」。
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { getCandidate } from '../../core/rules/versions';
import { goalState, goalVersion, goalsOfVersion, openGoals } from '../../core/rules/optimization';
import { pendingProblems } from '../../core/rules/problems';
import type { Agent, AgentOps, OptimizationGoal } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { Drawer } from '../../shared/components/Drawer';
import { Feedback } from '../../shared/components/Feedback';
import { icon } from '../../shared/styles/tokens';
import { RoundProgress, StateIcon, stateTone } from './Optimization';
import { useRound } from './useRound';
import './optimize.css';

/** 本轮 = 候选版本上的问题（含等待挂载的）；验证中 = 灰度 / 影子运行版本上还没结束的问题 */
export function roundOf(agent: Agent, ops: AgentOps) {
  const candidate = getCandidate(agent);
  const current = goalsOfVersion(agent, ops, candidate?.id ?? null);
  const verifying = openGoals(agent, ops).filter(goal => !current.includes(goal));
  const verifyingVersion = verifying.map(goal => goalVersion(agent, goal)).find(Boolean) ?? null;
  return { candidate, current, verifying, verifyingVersion };
}

export function NextRoundButton({ agent }: { agent: Agent }) {
  const { opsOf } = useDemo();
  const [open, setOpen] = useState(false);
  const ops = opsOf(agent);
  const { candidate, current, verifying, verifyingVersion } = roundOf(agent, ops);
  const queue = pendingProblems(agent, ops);
  const text = current.length ? `本轮 ${candidate?.id ?? '待建候选'} · ${current.length} 个问题`
    : verifying.length ? `${verifyingVersion} 验证中 · ${verifying.length} 个问题`
    : queue.length ? `待处理 ${queue.length}` : '暂无待处理问题';
  const count = current.length || verifying.length;
  return <>
    <button type="button" className="lifecycle-loop" data-demo="loop" aria-haspopup="dialog" onClick={() => setOpen(true)} title={`下一轮：${text}。一轮优化 = 一个候选版本 + 一组要解决的问题`}>
      <RotateCcw size={icon.large} aria-hidden="true" /><span className="step-copy"><strong>下一轮</strong><small>{text}</small></span>
      {count > 0 ? <span className="loop-count" aria-label={text}>{count}</span> : queue.length > 0 && <span className="loop-count is-pending" aria-label={text}>{queue.length}</span>}
    </button>
    {/* 按钮在吸顶的导航里：抽屉挂到 body，避免被吸顶区域的层级盖住 */}
    {open && createPortal(<NextRoundDrawer agent={agent} onClose={() => setOpen(false)} />, document.body)}
  </>;
}

function GoalList({ agent, ops, goals }: { agent: Agent; ops: AgentOps; goals: OptimizationGoal[] }) {
  return <ul className="round-goals">{goals.map(goal => { const state = goalState(agent, ops, goal); return <li key={goal.id}><span className={`goal-state tone-${stateTone[state]}`}><StateIcon state={state} />{state}</span><span className="source-tag">{goal.source}</span><span title={goal.title}>{goal.title}</span></li>; })}</ul>;
}

function NextRoundDrawer({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { opsOf } = useDemo();
  const { include } = useRound(agent);
  const ops = opsOf(agent);
  const { candidate, current, verifying, verifyingVersion } = roundOf(agent, ops);
  const queue = pendingProblems(agent, ops);
  const [added, setAdded] = useState<{ count: number; badcases: number }>({ count: 0, badcases: 0 });
  const base = `/agents/${agent.id}`;
  return <Drawer label="下一轮优化" demo="next-round" eyebrow="下一轮优化" title={candidate ? `本轮 ${candidate.id}` : '本轮 · 等待新建候选版本'}
    meta="一轮优化 = 一个候选版本 + 一组要解决的问题。从待处理问题里挑出本轮要解决的，回到构建与调优修改，评测页核对，灰度验证后上线。"
    onClose={onClose}
    footer={<><span className="foot-note">{current.length ? `本轮已纳入 ${current.length} 个问题` : '本轮还没有纳入问题'}</span><Button onClick={onClose}>关闭</Button><Link className="button button-primary" to={`${base}/build`} onClick={onClose}>去构建与调优</Link></>}>
    <div className="round-drawer">
      <section className="round-section" aria-label="本轮进度">
        <h3>本轮进度{candidate ? ` · ${candidate.id}` : ''}</h3>
        {current.length ? <><RoundProgress agent={agent} versionId={candidate?.id ?? null} /><GoalList agent={agent} ops={ops} goals={current} /></>
          : <p className="meta">本轮还没有纳入问题：从下面的待处理问题里点「纳入本轮」。{candidate ? `纳入的问题挂到候选版本 ${candidate.id}。` : '纳入的问题会在新建候选版本时自动挂上。'}</p>}
        {added.count > 0 && <p className="round-notice" role="status"><CheckCircle2 size={icon.small} aria-hidden="true" />已纳入 {added.count} 个问题{candidate ? `，挂到候选版本 ${candidate.id}` : '，新建候选版本时自动挂上'}{added.badcases ? `；其中 ${added.badcases} 条 bad case 已加入回归集` : ''}。</p>}
      </section>
      {verifying.length > 0 && <section className="round-section" aria-label="验证中">
        <h3>验证中 · {verifyingVersion}</h3>
        <p className="meta">上一轮的问题挂在 {verifyingVersion} 上，正在灰度验证，不算进本轮；全量上线或回退后自动结束。</p>
        <RoundProgress agent={agent} versionId={verifyingVersion} />
        <GoalList agent={agent} ops={ops} goals={verifying} />
      </section>}
      <section className="round-section" aria-label="待处理问题">
        <h3>待处理问题 · {queue.length}</h3>
        <p className="meta">告警、门槛未过、AB 变差是正在发生或阻断发布的问题，排在前面；bad case 按影响度排序（相似条数 × 来源权重：申诉 3 / 用户反馈 2 / 抽检 1 × 是否出在服务中的版本）。纳入 bad case 时按已确认的归因设调优对象（没确认时用平台建议），并自动加入 bad case 回归集。</p>
        {queue.length ? <ul className="problem-queue">{queue.map(item => <li className="problem-row" key={item.key} data-demo={`queue-${item.sourceId}`}>
          <span className={`impact impact-${item.level}`}>影响 {item.level}</span>
          <div className="problem-main"><div><span className="source-tag">{item.source}</span><strong title={item.title}>{item.title}</strong></div><span className="meta" title={item.meta}>{item.meta}</span></div>
          <div className="problem-actions"><Link className="link-button" to={`${base}/${item.link}`} onClick={onClose}>查看</Link>
            <Button variant="primary" onClick={() => { include([{ seed: item.seed, badcase: item.badcase ? { item: item.badcase, stage: item.seed.targets[0] } : undefined }]); setAdded(value => ({ count: value.count + 1, badcases: value.badcases + (item.badcase ? 1 : 0) })); }}>纳入本轮</Button></div>
        </li>)}</ul>
          : <Feedback kind="empty" title="没有待处理问题" description="新的 bad case、告警、AB 变差指标和门槛未过会出现在这里。" />}
      </section>
    </div>
  </Drawer>;
}
