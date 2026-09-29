import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Rocket, ScanSearch } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { StatusBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Feedback } from '../../shared/components/Feedback';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import { badcasesFor, tracesFor } from '../../core/data-access/scenarioData';
import { AgentShell } from '../shell/AgentShell';
import type { Agent } from '../../types/domain';
import { fmtMs, TraceTree } from './TraceTree';
import { BadCaseBoard, type BadCaseLabel } from './BadCaseBoard';
import { InterventionDrawer, InterventionList } from './Interventions';
import { activeInterventions } from '../../core/rules/interventions';
import { addMinutes, nowStamp } from '../../core/rules/clock';
import type { BadCase, Intervention } from '../../types/domain';
import './trace.css';
import { icon } from '../../shared/styles/tokens';

export function TracePage({ agent }: { agent: Agent }) {
  const { opsOf, updateOps } = useDemo();
  const traces = tracesFor(agent);
  const cases = badcasesFor(agent);
  const [searchParams] = useSearchParams();
  const linked = searchParams.get('trace');
  const [traceId, setTraceId] = useState(traces.find(item => item.id === linked)?.id ?? traces.find(item => item.status === '异常')?.id ?? traces[0]?.id);
  const trace = traces.find(item => item.id === traceId) ?? traces[0];
  const online = Boolean(agent.productionVersion);
  const ops = opsOf(agent);
  const labelOf = (id: string) => ops.badcases[id] ?? { stage: null, inEvalSet: false };
  const setLabel = (id: string, patch: Partial<BadCaseLabel>) => updateOps(agent.id, current => ({ ...current, badcases: { ...current.badcases, [id]: { ...(current.badcases[id] ?? { stage: null, inEvalSet: false }), ...patch } } }));
  const labeled = cases.filter(item => labelOf(item.id).stage).length;
  const added = cases.filter(item => labelOf(item.id).inEvalSet).length;
  const [intervening, setIntervening] = useState<BadCase | null>(null);
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
  const showTrace = (id: string) => { if (traces.some(item => item.id === id)) setTraceId(id); document.getElementById('trace-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  if (!online || !trace) {
    return <AgentShell agent={agent} stepId="trace" aside={<Card><span className="eyebrow">可追溯</span><h3>Trace 来自生产请求</h3><p className="meta">发布后，每次运行都会记录版本号、每一步的输入输出和引用依据；bad case 也会关联到对应的 Trace。</p></Card>}>
      <SectionHeading eyebrow="观测 · Trace" title="Trace 与 bad case" description="从一条异常请求出发：看清每一步用了哪个版本、引用了哪条知识，再把问题标注回流到评测集。" />
      <Feedback kind="empty" title="暂无 Trace 记录" description={online ? `线上 ${agent.productionVersion} 还没有产生请求记录，有新请求后这里会显示 Trace 和 bad case。` : '该 Agent 尚未发布，没有生产请求；发布后这里会显示每次运行的 Trace 和 bad case。'}
        action={online ? undefined : <Link className="button button-secondary feedback-action" to={`/agents/${agent.id}/release`}><Rocket size={icon.small} />前往发布</Link>} />
    </AgentShell>;
  }

  const aside = <><Card><span className="eyebrow">bad case 概览</span><h3>{cases.length} 条待处理</h3>
    <p>{(['用户反馈', '申诉', '抽检'] as const).map(source => `${source} ${cases.filter(item => item.source === source).length}`).join(' · ')}</p>
    <p className="meta">已标注 {labeled} / {cases.length} · 已加入评测集 {added} · 线上干预生效中 {active.length}</p></Card>
    <Card><span className="eyebrow">可追溯</span><h3>每次运行都能还原</h3><p className="meta">Trace 记录版本号、每一步的输入输出和引用依据（知识条目 + 知识版本）。「监控」标签页的调用日志通过 Trace ID 跳转到这里。</p></Card></>;

  return <AgentShell agent={agent} stepId="trace" aside={aside}>
    <SectionHeading eyebrow="观测 · Trace" title="Trace 与 bad case" description="从一条异常请求出发：看清每一步用了哪个版本、引用了哪条知识，再把问题标注回流到评测集。" />
    <div id="trace-card"><Capability title="Trace 树" description="输入 → 检索 → 工具调用 → 生成 → 护栏检查 → 输出，每一步显示耗时、引用依据和 Agent 版本号。"
      actions={<span className="otel-note"><ScanSearch size={icon.small} aria-hidden="true" />OpenTelemetry 标准 · 可接入公司链路追踪</span>}>
      <div className="trace-layout">
        <div className="trace-list" role="listbox" aria-label="最近 Trace">{traces.map(item => <button key={item.id} type="button" role="option" aria-selected={item.id === trace.id} className={item.id === trace.id ? 'selected' : ''} onClick={() => setTraceId(item.id)}>
          <span className="trace-list-top"><code>{item.id}</code><StatusBadge status={item.status === '成功' ? '成功' : '异常'} /></span>{item.env === '隔离评测' && <span className="env-tag isolated">隔离评测</span>}<span className="trace-q" title={item.summary}>{item.summary}</span><span className="meta">{item.time} · {item.version} · {fmtMs(item.steps.reduce((sum, step) => sum + step.ms, 0))}</span></button>)}</div>
        <TraceTree trace={trace} agentName={agent.name} />
      </div>
    </Capability></div>

    <BadCaseBoard agent={agent} cases={cases} labelOf={labelOf} setLabel={setLabel} onShowTrace={showTrace} interventionOf={interventionOf} onIntervene={agent.productionVersion ? setIntervening : null} />
    <InterventionList agent={agent} ops={ops} onRevoke={revoke} />
    {intervening && <InterventionDrawer agent={agent} ops={ops} badcase={intervening} onClose={() => setIntervening(null)} onCreate={createIntervention} />}
    <Phase2Row items={[
      { title: '自动聚类', description: '按语义和 Trace 特征把相似 bad case 聚成一类，优先处理高频问题。' },
      { title: '自动归因建议', description: '根据 Trace 中的失效知识、工具超时、护栏拦截等信号，建议问题环节。' },
    ]} />
  </AgentShell>;
}
