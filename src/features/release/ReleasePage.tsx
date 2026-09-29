import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RotateCcw, Rocket } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { readinessChecks } from '../../core/rules/gate';
import { goalState, goalsOfVersion } from '../../core/rules/optimization';
import { getCandidate, getExperiment, getVersion, isEvaluated, previousOnline } from '../../core/rules/versions';
import { nowStamp } from '../../core/rules/clock';
import { ConfirmAction } from '../../shared/components/Buttons';
import { ScopeBadge, VersionBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Feedback } from '../../shared/components/Feedback';
import { EnvironmentCards } from './EnvironmentCards';
import { VersionHistory } from './VersionHistory';
import { AbReport } from './AbReport';
import { AlertBanners } from '../../shared/components/AlertBanners';
import { StartOptimization } from '../optimize/Optimization';
import { seedFromAlert } from '../../core/rules/optimization';
import { ReadinessCard } from './ReadinessCard';
import { AccessCard } from './AccessCard';
import { StrategyCard } from './StrategyCard';
import { SwitchResult, TrafficCard, switchStages, type SwitchState } from './TrafficCard';
import { bucketLabel, strategyLabels } from './labels';
import { Phase2Row } from '../../shared/components/Capability';
import { rampSteps } from '../../data';
import { approverOf } from '../../core/data-access/scenarioData';
import { usePlaybookLock } from '../playbook/playbooks';
import { AgentShell } from '../shell/AgentShell';
import type { Agent, AgentOps } from '../../types/domain';
import './release.css';
import { icon } from '../../shared/styles/tokens';

const ROLLBACK_ELAPSED = '1 分 48 秒';
/** 正在执行、会改动演示数据的操作（按 Agent）：离开页面再回来时仍能看到，并防止重复提交。 */
const inflight = new Map<string, string>();

export function ReleasePage({ agent }: { agent: Agent }) {
  const { publishCandidate, rollbackTo, opsOf, updateOps, startExperiment, rampUp, shadowToCanary, stopExperiment, promoteExperiment } = useDemo();
  const strategyLock = usePlaybookLock('strategy', agent.id);
  const ops = opsOf(agent);
  const candidate = getCandidate(agent);
  const experiment = getExperiment(agent);
  const [publishing, setPublishing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [switching, setSwitching] = useState<SwitchState | null>(null);
  const [switchResult, setSwitchResult] = useState<{ from: string; to: string; note: string } | null>(null);
  const [message, setMessage] = useState<{ title: string; description: string } | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  /** 只影响界面展示的定时器：离开页面时取消。 */
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  /** 会改变演示数据的定时器：离开页面也要执行完，否则发布、审批、回退会丢失（界面状态更新在卸载后是空操作）。 */
  const commit = (label: string, fn: () => void, ms: number) => { inflight.set(agent.id, label); window.setTimeout(() => { inflight.delete(agent.id); fn(); }, ms); };
  const busy = inflight.get(agent.id);

  const from = agent.productionVersion;
  const strategy = from ? ops.strategy : 'direct';
  /** 待上线版本：候选版本，或正在影子运行、等待全量的版本。 */
  const shadow = experiment?.status === '影子运行' ? experiment : null;
  const target = candidate ?? shadow;
  const approvalOptional = Boolean(candidate && strategy === 'shadow');
  /** 本轮优化目标：只提示、不阻断发布（目标可能随调优调整，最终以门槛和审批为准） */
  const goals = target ? goalsOfVersion(agent, ops, target.id) : [];
  const unmet = goals.filter(goal => goalState(agent, ops, goal) !== '已达成');
  const checks = [...readinessChecks(agent, ops, target, { approvalOptional }),
    ...(goals.length ? [{ key: 'goals', label: '本轮优化目标已验证', done: !unmet.length, optional: unmet.length > 0, hint: '建议完成',
      detail: unmet.length ? `${unmet.length} / ${goals.length} 个目标还没达成：${unmet.map(goal => goal.metrics[0]).join('；')}` : `${goals.length} 个优化目标在评测中全部达成，灰度期继续看线上指标`,
      link: { to: `/agents/${agent.id}/evaluation`, label: '去评测核对' } }] : [])];
  const missing = checks.filter(item => !item.done && !item.optional);
  const baseReason = !target ? '没有候选版本，请先在构建页新建草稿'
    : !target.configured ? '候选版本尚未保存（在构建页「保存为候选版本」）'
    : !target.debugged ? '候选版本尚未调试'
    : !isEvaluated(target) ? '请先运行评测' : undefined;
  /** 同一时间只允许一个实验：有灰度 / 影子运行时，不能再发布新版本或从版本历史回退。 */
  const experimentBlock = experiment ? `${experiment.id} 正在${experiment.status === '灰度中' ? '灰度' : '影子运行'}，请先放量完成或回退` : undefined;
  const experimentReason = candidate ? experimentBlock : undefined;
  const reason = baseReason ?? experimentReason ?? (missing.length ? `生产就绪检查未完成：${missing.map(item => item.label).join('、')}` : undefined);
  const log = (who: string, action: string) => updateOps(agent.id, current => ({ ...current, approvals: [{ time: nowStamp(), who, action }, ...current.approvals] }));
  const patchOps = (patch: Partial<AgentOps>) => updateOps(agent.id, current => ({ ...current, ...patch }));
  const strategyText = !candidate && shadow ? '全量发布' : strategy === 'canary' ? `比例灰度 ${ops.canaryPercent}%` : strategyLabels[strategy].short;

  const publish = () => {
    if (inflight.has(agent.id)) return;
    if (!candidate && shadow && from) {
      const id = shadow.id;
      setPublishing(true); setMessage(null); setSwitchResult(null);
      commit(`正在全量发布 ${id}`, () => { promoteExperiment(agent.id); setPublishing(false); log(agent.owner, `全量发布：线上指向 ${from} → ${id}`); setMessage({ title: `${id} 已全量发布`, description: `线上指向 ${from} → ${id}；影子运行结束。${from} 保留为历史版本，可随时回退。` }); }, 900);
      return;
    }
    if (!candidate) return;
    const target = candidate.id;
    const mode = strategy;
    setPublishing(true); setMessage(null); setSwitchResult(null);
    commit(`正在发布 ${target}`, () => {
      if (mode === 'direct') publishCandidate(agent.id); else startExperiment(agent.id);
      setPublishing(false);
      log(agent.owner, `执行发布：${target}（${mode === 'direct' ? '直接发布' : strategyText}）`);
      setMessage(mode === 'direct'
        ? { title: `${target} 已发布到生产环境`, description: from ? `线上指向 ${from} → ${target}；${from} 保留为历史版本，可一键回退。` : `线上指向 → ${target}，这是该 Agent 的首次发布。` }
        : mode === 'canary'
          ? { title: `${target} 已开始比例灰度 ${ops.canaryPercent}%`, description: `线上指向仍为 ${from}；${ops.canaryPercent}% 用户分桶命中 ${target}。在「流量指向」中放量或回退。` }
          : { title: `${target} 已开始影子运行`, description: `线上请求被复制给 ${target} 双跑，结果只用于对比，不返回用户。` });
    }, 900);
  };

  const submitApproval = () => {
    if (!target) return;
    updateOps(agent.id, current => ({ ...current, approvalPending: target.id, approvals: [{ time: nowStamp(), who: agent.owner, action: `提交 ${target.id}（${strategyText}）审批` }, ...current.approvals] }));
  };
  const approve = () => {
    if (!target) return;
    setApproving(true);
    commit(`正在审批 ${target.id}`, () => { setApproving(false); updateOps(agent.id, current => ({ ...current, approvalPending: null, approvedVersion: target.id, approvals: [{ time: nowStamp(), who: approverOf(agent), action: `审批通过 ${target.id}（${strategyText}）` }, ...current.approvals] })); }, 700);
  };

  const ramp = () => {
    if (!experiment || experiment.status !== '灰度中') return;
    const next = rampSteps.find(step => step > (experiment.traffic ?? 0)) ?? 100;
    rampUp(agent.id); setSwitchResult(null);
    log(agent.owner, next >= 100 ? `全量发布：线上指向 ${from} → ${experiment.id}` : `放量 ${experiment.id} 到 ${next}%`);
    setMessage(next >= 100 ? { title: `${experiment.id} 已全量发布`, description: `线上指向 ${from} → ${experiment.id}；${from} 保留为历史版本，可随时回退。` } : { title: `${experiment.id} 已放量到 ${next}%`, description: `${next}% 用户分桶命中 ${experiment.id}${ops.sticky ? '，已开启会话粘性的会话保持原版本直到结束' : ''}。` });
  };

  /** 回退 = 把线上指向切回旧版本：分阶段展示，完成后显示耗时。 */
  const pointerSwitch = (fromId: string, toId: string, apply: () => void, note: string) => {
    if (inflight.has(agent.id)) return;
    setMessage(null); setSwitchResult(null);
    setSwitching({ from: fromId, to: toId, stage: 0, done: false });
    switchStages.forEach((_, index) => later(() => setSwitching({ from: fromId, to: toId, stage: index + 1, done: false }), 350 * (index + 1)));
    commit(`正在把线上指向从 ${fromId} 切换到 ${toId}`, () => { apply(); setSwitching(null); setSwitchResult({ from: fromId, to: toId, note }); log(agent.owner, `回退：线上指向 ${fromId} → ${toId}`); }, 350 * (switchStages.length + 1));
  };
  const rollbackTarget = experiment ? getVersion(agent, from) : previousOnline(agent);
  const rollbackVersion = (version: string) => {
    const previous = agent.productionVersion;
    if (!previous) return;
    pointerSwitch(previous, version, () => rollbackTo(agent.id, version), `全部生产流量已切到 ${version}（${getVersion(agent, version)?.config.knowledge ?? ''}），${previous} 保留为历史版本。`);
  };
  const rollbackGray = () => {
    if (!experiment || !from) return;
    if (experiment.status === '影子运行') { stopExperiment(agent.id); log(agent.owner, `停止 ${experiment.id} 影子运行`); setMessage({ title: `已停止 ${experiment.id} 影子运行`, description: `${experiment.id} 退回「待发布」，线上 ${from} 不受影响。` }); return; }
    pointerSwitch(experiment.id, from, () => stopExperiment(agent.id), `${experiment.traffic}% 灰度流量已全部回到 ${from}；${experiment.id} 退回「待发布」，需重新审批后才能再次发布。`);
  };

  const rollbackAction = !from ? null : experiment
    ? experiment.status === '影子运行'
      ? <><ConfirmAction actionLabel={`停止影子运行`} confirmLabel={`确认停止 ${experiment.id} 影子运行`} impact={`影子运行不影响用户，停止后 ${experiment.id} 退回「待发布」。`} onConfirm={rollbackGray} /><ConfirmAction variant="primary" actionLabel={`转为比例灰度 ${ops.canaryPercent}%`} confirmLabel={`确认转为比例灰度 ${ops.canaryPercent}%`} impact={`${ops.canaryPercent}% 真实用户将开始使用 ${experiment.id}，其余继续使用 ${from}。`} onConfirm={() => { shadowToCanary(agent.id); log(agent.owner, `${experiment.id} 由影子运行转为比例灰度 ${ops.canaryPercent}%`); }} /></>
      : <ConfirmAction icon={<RotateCcw size={icon.small} />} actionLabel={`回退到 ${from}`} confirmLabel={`确认回退到 ${from}`}
        impact={<>影响范围：当前 <b>{experiment.traffic}%</b> 灰度流量（命中 {experiment.id} 的用户分桶）将全部切回 {from}；{ops.sticky ? '开启了会话粘性，进行中的会话在下一轮请求时切换；' : ''}{experiment.id} 退回「待发布」，需重新审批。{from} 的版本快照（含 {getVersion(agent, from)?.config.knowledge}）不变，其余 {100 - (experiment.traffic ?? 0)}% 用户无感知。</>} onConfirm={rollbackGray} />
    : rollbackTarget
      ? <ConfirmAction icon={<RotateCcw size={icon.small} />} actionLabel={`回退到 ${rollbackTarget.id}`} confirmLabel={`确认回退到 ${rollbackTarget.id}`}
        impact={<>影响范围：全部生产流量。线上指向从 {from} 切换到 {rollbackTarget.id}（模型、Prompt、工具和 {rollbackTarget.config.knowledge} 一起回到旧快照）；{from} 保留为历史版本，可随时再切回。</>} onConfirm={() => rollbackVersion(rollbackTarget.id)} />
      : <span className="meta">没有曾上线的历史版本，暂不可回退。</span>;

  const publishLabel = !candidate && shadow ? `全量发布 ${shadow.id}` : !candidate ? '发布到生产' : strategy === 'direct' ? `发布 ${candidate.id} 到生产` : strategy === 'shadow' ? `开始影子运行 ${candidate.id}` : `发布 ${candidate.id}（${strategyText}）`;
  const publishAction = !publishing && <ConfirmAction variant="primary" icon={<Rocket size={icon.small} />}
    actionLabel={publishLabel} confirmLabel={`确认${publishLabel}`} disabled={Boolean(reason)} reason={reason}
    impact={!candidate && shadow ? `线上指向将从 ${from} 切换到 ${shadow.id}，影子运行结束，之后的新请求全部使用 ${shadow.id}。出现问题可回退到 ${from}。`
      : strategy === 'direct'
      ? from ? `生产环境将从 ${from} 切换到 ${candidate?.id}，之后的新请求立即使用 ${candidate?.id}。出现问题可回退到 ${from}。` : `${candidate?.id} 将成为首个线上版本，开始接收生产请求。`
      : strategy === 'canary' ? `${ops.canaryPercent}% 流量（${bucketLabel(ops)}）将命中 ${candidate?.id}，其余继续使用 ${from}；${ops.sticky ? '已开启会话粘性。' : '未开启会话粘性，多轮会话可能中途切换版本。'}线上指向保持 ${from}。`
      : `${candidate?.id} 将复制线上请求双跑，只用于对比，不返回给用户；线上指向保持 ${from}。`} onConfirm={publish} />;

  const aside = <><Card><span className="eyebrow">发布摘要</span><h3>{candidate ? <>候选版本 <VersionBadge version={candidate.id} /></> : '没有候选版本'}</h3>
    {candidate && <p>配置 {candidate.configured ? '已保存' : '未保存'} · 调试 {candidate.debugged ? '已完成' : '未完成'} · 评测 {isEvaluated(candidate) ? '已完成' : '未完成'}</p>}
    <p className="meta">线上指向：{agent.productionVersion ?? '未发布'}{agent.lastReleaseAt ? ` · 最近变更 ${agent.lastReleaseAt}` : ''}</p></Card>
    <Card><span className="eyebrow">生产就绪</span><h3>{target ? `${checks.filter(item => item.done).length} / ${checks.length} 项已完成` : experiment ? `${experiment.id} ${experiment.status}` : '暂无待发布版本'}</h3>
      <p className="meta">{target ? missing.length ? `待完成：${missing.map(item => item.label).join('、')}` : `可以按「${strategyText}」发布` : '发布、放量、回退都只改变线上指向。'}</p></Card>
    {agent.productionVersion && <Link className="button button-secondary full-button" to={`/agents/${agent.id}/monitor`}><Activity size={icon.small} />查看 {agent.productionVersion} 生产监控</Link>}</>;

  const feedback = <>{busy && !publishing && !switching && <Feedback kind="loading" title={busy} description="上一个操作仍在执行，完成后页面会自动更新。" />}
    {publishing && <Feedback kind="loading" title={`正在发布 ${candidate?.id}`} description="正在切换预发和生产环境的版本指向…" />}
    {message && !publishing && <Feedback kind="success" title={message.title} description={message.description} />}</>;

  const trafficBlock = <><TrafficCard agent={agent} ops={ops} experiment={experiment} rollbackTarget={rollbackTarget} switching={switching} onRamp={ramp} rollbackAction={rollbackAction} />
    {switchResult && <SwitchResult from={switchResult.from} to={switchResult.to} elapsed={ROLLBACK_ELAPSED} note={switchResult.note} />}
    <AbReport agent={agent} experiment={experiment} /></>;
  const releaseBlock = <><ReadinessCard candidate={target} experiment={experiment} checks={checks} approvalPending={Boolean(target && ops.approvalPending === target.id)} onSubmitApproval={submitApproval} onApprove={approve} approving={approving}>
    {target && <div className="publish-bar" data-demo="publish"><div><strong>发布策略：{strategyText}</strong><p className="meta">{reason ? '完成上面的检查项后才能发布。' : '所有检查项已完成。'}</p></div>{publishAction}</div>}
  </ReadinessCard>
    <StrategyCard agent={agent} ops={ops} update={patchOps} locked={experiment ? `${experiment.id} 正在${experiment.status === '灰度中' ? '灰度' : '影子运行'}，结束后才能调整策略` : strategyLock} /></>;

  return <AgentShell agent={agent} stepId="release" aside={aside}><SectionHeading eyebrow="发布" title="环境与版本" description="发布和回退都只是改变生产环境的线上指向，版本快照本身不变。" aside={<ScopeBadge phase="MVP" />} />
    <Card><div className="release-heading"><div><h3>环境指向</h3><p>发布入口在下方「生产就绪检查」中；调用方默认跟随生产环境的线上指向，见页面底部「接入方式」。</p></div></div>
      <EnvironmentCards agent={agent} /></Card>

    <SectionHeading eyebrow="发布与实验" title="受控发布、实验与回退" description="上线前逐项检查；上线后按比例放量、用业务指标说话；出问题分钟级回退。" />
    {feedback}
    <AlertBanners agent={agent} action={alert => <StartOptimization agent={agent} demo={`optimize-${alert.id}`} seed={seedFromAlert(agent, alert)} />} />
    {experiment ? <>{trafficBlock}{releaseBlock}</> : <>{releaseBlock}{trafficBlock}</>}
    <Phase2Row items={[
      { title: '按指标自动熔断', description: '灰度期间核心指标跌破阈值时，自动把流量切回线上版本并告警。' },
      { title: '自动放量', description: '实验指标显著为正且无告警时，按预设节奏自动放量。' },
    ]} />

    <SectionHeading eyebrow="版本管理" title="版本历史" description="只有曾经上线过的版本可以回退；草稿、待发布和灰度中的版本需要走发布流程。" />
    <Card><VersionHistory agent={agent} onRollback={rollbackVersion} blockedReason={experimentBlock} /></Card>

    <SectionHeading eyebrow="接入" title="接入方式" description="调用地址、app_id、按线上指向还是锁定版本调用，以及谁在调用这个 Agent。" />
    <AccessCard agent={agent} ops={ops} />
  </AgentShell>;
}
