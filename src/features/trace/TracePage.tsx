import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Rocket, ScanSearch } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { StatusBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Feedback } from '../../shared/components/Feedback';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import { badcasesFor, badcaseTrace, tracesFor } from '../../core/data-access/scenarioData';
import { AgentShell } from '../shell/AgentShell';
import type { Agent } from '../../types/domain';
import { fmtMs, TraceTree } from './TraceTree';
import { BadCaseBoard } from './BadCaseBoard';
import { badcaseStatus, badcaseStatuses } from '../../core/rules/problems';
import { InterventionDrawer, InterventionList } from './Interventions';
import { activeInterventions } from '../../core/rules/interventions';
import { addMinutes, nowStamp } from '../../core/rules/clock';
import type { BadCase, Intervention } from '../../types/domain';
import './trace.css';
import { icon } from '../../shared/styles/tokens';

export function TracePage({ agent }: { agent: Agent }) {
  const { opsOf, updateOps } = useDemo();
  const recent = tracesFor(agent);
  const cases = badcasesFor(agent);
  /* bad case 关联的 Trace 不一定在最近列表里：按需补进来 */
  const caseTraces = cases.map(item => badcaseTrace(agent, item)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const all = [...recent, ...caseTraces.filter(item => !recent.some(trace => trace.id === item.id))].filter((item, index, list) => list.findIndex(other => other.id === item.id) === index);
  const [searchParams] = useSearchParams();
  const linked = searchParams.get('trace');
  const focusBadcase = searchParams.get('badcase');
  const focusCase = cases.find(item => item.id === focusBadcase);
  const [traceId, setTraceId] = useState(all.find(item => item.id === linked)?.id ?? (focusCase && all.find(item => item.id === focusCase.traceId)?.id) ?? recent.find(item => item.status === '异常')?.id ?? recent[0]?.id);
  const trace = all.find(item => item.id === traceId) ?? recent[0];
  const traces = trace && !recent.some(item => item.id === trace.id) ? [trace, ...recent] : recent;
  const online = Boolean(agent.productionVersion);
  const ops = opsOf(agent);
  const statusCount = (status: string) => cases.filter(item => badcaseStatus(agent, ops, item) === status).length;
  const [intervening, setIntervening] = useState<BadCase | null>(null);
  useEffect(() => { if (focusCase) setTraceId(focusCase.traceId); }, [focusCase?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const focus = searchParams.get('focus');
  useEffect(() => { if (focus === 'interventions') window.setTimeout(() => document.getElementById('interventions')?.scrollIntoView({ block: 'start' }), 100); }, [focus]);
  const active = activeInterventions(ops);
  const interventionOf = (id: string) => active.find(item => item.badcaseId === id)?.expiresAt ?? null;
  const log = (who: string, action: string, time: string) => updateOps(agent.id, current => ({ ...current, approvals: [{ time, who, action }, ...current.approvals] }));
  const createIntervention = (draft: Omit<Intervention, 'id' | 'createdAt' | 'expiresAt'>, days: number) => {
    const createdAt = nowStamp();
    const id = `iv-${String(ops.interventions.length + 1).padStart(3, '0')}`;
    const item: Intervention = { ...draft, id, createdAt, expiresAt: addMinutes(createdAt, days * 24 * 60) };
    updateOps(agent.id, current => ({ ...current, interventions: [...current.interventions, item] }));
    log(draft.createdBy, `创建线上干预 ${id}（${draft.kind}，关联 ${draft.badcaseId}，针对 ${draft.appliesTo}，有效期 ${days} 天）`, createdAt);
    setIntervening(null);
  };
  const revoke = (item: Intervention) => {
    const at = nowStamp();
    updateOps(agent.id, current => ({ ...current, interventions: current.interventions.map(entry => entry.id === item.id ? { ...entry, ended: { at, by: agent.owner, reason: '人工撤销', auto: false } } : entry) }));
    log(agent.owner, `撤销线上干预 ${item.id}（关联 ${item.badcaseId}）`, at);
  };
  /* 展开 bad case 时 Trace 树跟着切换；从监控日志带 ?trace= 进来时，第一次不覆盖 */
  const skipFollow = useRef(Boolean(linked));
  const followCase = (item: BadCase) => { if (skipFollow.current) { skipFollow.current = false; return; } if (all.some(entry => entry.id === item.traceId)) setTraceId(item.traceId); };
  const showTrace = (id: string) => { if (all.some(item => item.id === id)) setTraceId(id); window.setTimeout(() => document.getElementById('trace-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };

  if (!online || !trace) {
    return <AgentShell agent={agent} stepId="trace" aside={<Card><span className="eyebrow">可追溯</span><h3>Trace 来自生产请求</h3><p className="meta">发布后，每次运行都会记录版本号、每一步的输入输出和引用依据；bad case 也会关联到对应的 Trace。</p></Card>}>
      <SectionHeading eyebrow="观测 · Trace" title="Trace 与 bad case" description="从问题出发：先看 bad case 影响多大、出在哪一步，确认归因后纳入本轮优化；需要细看时展开完整 Trace。" />
      <Feedback kind="empty" title="暂无 Trace 记录" description={online ? `线上 ${agent.productionVersion} 还没有产生请求记录，有新请求后这里会显示 Trace 和 bad case。` : '该 Agent 尚未发布，没有生产请求；发布后这里会显示每次运行的 Trace 和 bad case。'}
        action={online ? undefined : <Link className="button button-secondary feedback-action" to={`/agents/${agent.id}/release`}><Rocket size={icon.small} />前往发布</Link>} />
    </AgentShell>;
  }

  const aside = <><Card><span className="eyebrow">bad case 概览</span><h3>bad case 待处理 {statusCount('待归因') + statusCount('已归因')} 类</h3>
    <p>{badcaseStatuses.map(status => `${status} ${statusCount(status)}`).join(' · ')}</p>
    <p className="meta">共 {cases.length} 类、{cases.reduce((sum, item) => sum + item.similar, 0)} 条（同类已合并）· 线上干预生效中 {active.length}</p></Card>
    <Card><span className="eyebrow">怎么处理</span><h3>从影响最大的问题开始</h3><p className="meta">展开一行 → 看原始样本和 Trace 异常步骤 → 确认归因 → 纳入本轮优化（自动加入回归集）。已纳入的问题会出现在导航「下一轮」和构建与调优页的「本轮优化目标」里。</p></Card>
    <Card><span className="eyebrow">可追溯</span><h3>每次运行都能还原</h3><p className="meta">Trace 记录版本号、每一步的输入输出和引用依据（知识条目 + 知识版本）。「监控」标签页的调用日志通过 Trace ID 跳转到这里。</p></Card></>;

  return <AgentShell agent={agent} stepId="trace" aside={aside}>
    <SectionHeading eyebrow="观测 · Trace" title="Trace 与 bad case" description="从问题出发：先看 bad case 影响多大、出在哪一步，确认归因后纳入本轮优化；需要细看时展开完整 Trace。" />
    <BadCaseBoard agent={agent} cases={cases} traceOf={item => all.find(entry => entry.id === item.traceId) ?? null} onShowTrace={showTrace} onExpand={followCase} interventionOf={interventionOf} onIntervene={agent.productionVersion ? setIntervening : null} focusId={focusCase?.id ?? null} />
    <div id="trace-card"><Capability title="Trace 树" description="输入 → 检索 → 工具调用 → 生成 → 护栏检查 → 输出，每一步显示耗时、引用依据和 Agent 版本号。"
      actions={<span className="otel-note"><ScanSearch size={icon.small} aria-hidden="true" />OpenTelemetry 标准 · 可接入公司链路追踪</span>}>
      <div className="trace-layout">
        <div className="trace-list" role="listbox" aria-label="最近 Trace">{traces.map(item => <button key={item.id} type="button" role="option" aria-selected={item.id === trace.id} className={item.id === trace.id ? 'selected' : ''} onClick={() => setTraceId(item.id)}>
          <span className="trace-list-top"><code>{item.id}</code><StatusBadge status={item.status === '成功' ? '成功' : '异常'} /></span>{item.env === '隔离评测' && <span className="env-tag isolated">隔离评测</span>}{!recent.some(entry => entry.id === item.id) && <span className="env-tag">来自 bad case</span>}<span className="trace-q" title={item.summary}>{item.summary}</span><span className="meta">{item.time} · {item.version} · {fmtMs(item.steps.reduce((sum, step) => sum + step.ms, 0))}</span></button>)}</div>
        <TraceTree trace={trace} agentName={agent.name} />
      </div>
    </Capability></div>

    <InterventionList agent={agent} ops={ops} onRevoke={revoke} />
    {intervening && <InterventionDrawer agent={agent} ops={ops} badcase={intervening} onClose={() => setIntervening(null)} onCreate={createIntervention} />}
    <Phase2Row items={[
      { title: '语义聚类', description: '现在同类问题由标注平台按规则合并；二期按语义和 Trace 特征自动聚类，并随新反馈实时更新相似条数。' },
      { title: '归因模型', description: '现在的平台建议来自 Trace 规则信号（失效知识、工具超时、护栏未命中等）；二期用人工确认过的标注训练归因模型。' },
    ]} />
  </AgentShell>;
}
