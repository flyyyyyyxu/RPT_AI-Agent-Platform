import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, Layers, ListPlus, Network, ScanSearch } from 'lucide-react';
import { useDemo } from '../app/DemoProvider';
import { Button } from '../components/actions/Buttons';
import { DemoTag, IntegrationNote, StatusBadge, VersionBadge } from '../components/badges/Badges';
import { Card, SectionHeading } from '../components/content/Content';
import { Feedback } from '../components/feedback/Feedback';
import { Capability, CapabilityBadges, Phase2Row, useSkeletonView } from '../components/skeleton/Skeleton';
import { problemStages } from '../data/mock';
import { badcasesFor, tracesFor } from '../app/scenarioData';
import { AgentShell } from '../layouts/AgentShell';
import type { Agent, ProblemStage, TraceRecord } from '../types/domain';

const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;

function TraceTree({ trace, agentName }: { trace: TraceRecord; agentName: string }) {
  const total = trace.steps.reduce((sum, step) => sum + step.ms, 0);
  const issueIndex = trace.steps.findIndex(step => step.isNew || step.error);
  let offset = 0;
  return <>{trace.note && <p className="trace-note"><Info size={16} aria-hidden="true" />{trace.note}<DemoTag /></p>}<div className="span-tree" role="tree" aria-label={`Trace ${trace.id}`}>
    <div className="span-row root" role="treeitem"><div className="span-main"><div className="span-title"><Network size={16} strokeWidth={1.5} aria-hidden="true" /><strong>agent.run · {agentName}</strong><VersionBadge version={trace.version} />{trace.env && <span className={`env-tag ${trace.env === '隔离评测' ? 'isolated' : ''}`}>{trace.env}</span>}<StatusBadge status={trace.status === '成功' ? '通过' : '警告'} /></div><span className="span-detail">trace_id={trace.id} · service.version={trace.version} · {trace.time}</span></div>
      <div className="span-timing"><div className="span-bar"><span style={{ left: 0, width: '100%' }} /></div><span className="span-ms">{fmtMs(total)}</span></div></div>
    {trace.steps.map((step, index) => {
      const left = (offset / total) * 100; offset += step.ms;
      return <div key={index} role="treeitem" data-demo={index === issueIndex ? 'trace-issue' : undefined} className={`span-row span-depth-${step.depth} ${step.error ? 'has-error' : ''}`}>
        <div className="span-main"><div className="span-title"><span className="span-kind">{step.kind}</span><strong>{step.name}</strong><VersionBadge version={trace.version} />{step.isNew && <span className="new-tag">{trace.version} 新增</span>}</div>
          <span className="span-detail">{step.detail}</span>
          {step.evidence && <div className="span-evidence">{step.evidence.map(item => <span key={item.entry} className={`evidence-chip ${item.expired ? 'expired' : ''}`}>依据：{item.entry}<code>{item.version}</code>{item.expired && <span className="expired-tag"><AlertCircle size={16} aria-hidden="true" />已失效</span>}</span>)}</div>}
          {step.error && <span className="span-error"><AlertCircle size={16} aria-hidden="true" />{step.error}</span>}</div>
        <div className="span-timing"><div className="span-bar"><span style={{ left: `${left}%`, width: `${Math.max(1.5, (step.ms / total) * 100)}%` }} /></div><span className="span-ms">{fmtMs(step.ms)}</span></div>
      </div>;
    })}
  </div></>;
}

export function TracePage({ agent }: { agent: Agent }) {
  const { opsOf, updateOps, setViewMode } = useDemo();
  const skeletonView = useSkeletonView();
  const traces = tracesFor(agent);
  const cases = badcasesFor(agent);
  const [searchParams] = useSearchParams();
  const linked = searchParams.get('trace');
  const [traceId, setTraceId] = useState(traces.find(item => item.id === linked)?.id ?? traces.find(item => item.status === '异常')?.id ?? traces[0].id);
  const trace = traces.find(item => item.id === traceId) ?? traces[0];
  const ops = opsOf(agent);
  const labelOf = (id: string) => ops.badcases[id] ?? { stage: null, inEvalSet: false };
  const setLabel = (id: string, patch: Partial<{ stage: ProblemStage | null; inEvalSet: boolean }>) => updateOps(agent.id, current => ({ ...current, badcases: { ...current.badcases, [id]: { ...(current.badcases[id] ?? { stage: null, inEvalSet: false }), ...patch } } }));
  const labeled = cases.filter(item => labelOf(item.id).stage).length;
  const added = cases.filter(item => labelOf(item.id).inEvalSet).length;
  const showTrace = (id: string) => { if (traces.some(item => item.id === id)) setTraceId(id); document.getElementById('trace-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  if (!skeletonView) {
    return <AgentShell agent={agent} stepId="trace" aside={<Card><span className="eyebrow">说明</span><h3>生产骨架能力</h3><p>Trace 与 bad case 属于生产骨架第 ⑥ ⑧ 项，基础能力视图下不显示。</p></Card>}>
      <SectionHeading eyebrow="生产骨架" title="Trace 与 bad case" description="追溯每次运行并归因 bad case。" />
      <Feedback kind="empty" title="当前为「只看基础能力」视图" description="切换到「显示生产骨架」后查看 Trace 树和 bad case 工作台。" action={<Button className="feedback-action" onClick={() => setViewMode('skeleton')}><Layers size={16} />显示生产骨架</Button>} />
    </AgentShell>;
  }

  const aside = <><Card><div className="sub-heading"><span className="eyebrow">bad case 概览</span><CapabilityBadges skeleton={[6]} /></div><h3>{cases.length} 条待处理</h3>
    <p>{(['用户反馈', '申诉', '抽检'] as const).map(source => `${source} ${cases.filter(item => item.source === source).length}`).join(' · ')}</p>
    <p className="meta">已标注 {labeled} / {cases.length} · 已加入评测集 {added}</p></Card>
    <Card><div className="sub-heading"><span className="eyebrow">可追溯</span><CapabilityBadges skeleton={[8]} /></div><h3>每次运行都能还原</h3><p className="meta">Trace 记录版本号、每一步的输入输出和引用依据（知识条目 + 知识版本）。监控页的调用日志通过 Trace ID 跳转到这里。</p></Card></>;

  return <AgentShell agent={agent} stepId="trace" aside={aside}>
    <SectionHeading eyebrow="生产骨架 · 可观测与可追溯" title="Trace 与 bad case" description="从一条异常请求出发：看清每一步用了哪个版本、引用了哪条知识，再把问题标注回流到评测集。" />
    <div id="trace-card"><Capability skeleton={[8]} title="Trace 树" description="输入 → 检索 → 工具调用 → 生成 → 护栏检查 → 输出，每一步显示耗时、引用依据和 Agent 版本号。"
      actions={<span className="otel-note"><ScanSearch size={16} strokeWidth={1.5} aria-hidden="true" />OpenTelemetry 标准 · 可接入公司链路追踪</span>}>
      <div className="trace-layout">
        <div className="trace-list" role="listbox" aria-label="最近 Trace">{traces.map(item => <button key={item.id} type="button" role="option" aria-selected={item.id === trace.id} className={item.id === trace.id ? 'selected' : ''} onClick={() => setTraceId(item.id)}>
          <span className="trace-list-top"><code>{item.id}</code><StatusBadge status={item.status === '成功' ? '通过' : '警告'} /></span>{item.env === '隔离评测' && <span className="env-tag isolated">隔离评测</span>}<span className="trace-q" title={item.summary}>{item.summary}</span><span className="meta">{item.time} · {item.version} · {fmtMs(item.steps.reduce((sum, step) => sum + step.ms, 0))}</span></button>)}</div>
        <TraceTree trace={trace} agentName={agent.name} />
      </div>
    </Capability></div>

    <Capability skeleton={[6]} hero={4} title="bad case 工作台" description="汇集用户反馈、申诉和抽检发现的问题；人工标注问题环节后，一键加入评测集，下次候选版本评测自动覆盖。"
      actions={<IntegrationNote platform="标注" />}>
      <div className="badcase-list">{cases.map(item => {
        const label = labelOf(item.id);
        return <div className="badcase" key={item.id} data-demo={`badcase-${item.id}`}>
          <div className="badcase-main"><div className="badcase-meta"><span className="source-tag">{item.source}</span><code>{item.id}</code><VersionBadge version={item.version} /><span className="meta">{item.time}</span></div>
            <strong>{item.summary}</strong><p>{item.detail}</p>
            <button type="button" className="link-button" data-demo={`badcase-trace-${item.id}`} onClick={() => showTrace(item.traceId)}><Network size={16} aria-hidden="true" />查看 Trace {item.traceId}</button></div>
          <div className="badcase-actions"><span className="meta">问题环节（人工标注）</span>
            <div className="stage-picker" data-demo={`stage-${item.id}`} role="radiogroup" aria-label={`${item.id} 问题环节`}>{problemStages.map(stage => <button key={stage} type="button" role="radio" aria-checked={label.stage === stage} className={label.stage === stage ? 'active' : ''} onClick={() => setLabel(item.id, { stage })}>{stage}</button>)}</div>
            {label.inEvalSet ? <span className="added-note"><CheckCircle2 size={16} aria-hidden="true" />已加入「bad case 回归集」· 标注：{label.stage}</span>
              : <span data-demo={`add-eval-${item.id}`}><Button onClick={() => setLabel(item.id, { inEvalSet: true })} disabled={!label.stage} reason={!label.stage ? '请先标注问题环节' : undefined}><ListPlus size={16} />加入评测集</Button></span>}
          </div>
        </div>;
      })}</div>
    </Capability>
    <Phase2Row items={[
      { skeleton: [6], title: '自动聚类', description: '按语义和 Trace 特征把相似 bad case 聚成一类，优先处理高频问题。' },
      { skeleton: [6, 8], title: '自动归因建议', description: '根据 Trace 中的失效知识、工具超时、护栏拦截等信号，建议问题环节。' },
    ]} />
  </AgentShell>;
}
