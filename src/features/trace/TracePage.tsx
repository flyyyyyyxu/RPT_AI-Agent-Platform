import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layers, Rocket, ScanSearch } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { Button } from '../../shared/components/Buttons';
import { StatusBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Feedback } from '../../shared/components/Feedback';
import { Capability, CapabilityBadges, Phase2Row, useSkeletonView } from '../../shared/components/Capability';
import { badcasesFor, tracesFor } from '../../core/data-access/scenarioData';
import { AgentShell } from '../shell/AgentShell';
import type { Agent } from '../../types/domain';
import { fmtMs, TraceTree } from './TraceTree';
import { BadCaseBoard, type BadCaseLabel } from './BadCaseBoard';
import './trace.css';
import { icon } from '../../shared/styles/tokens';

export function TracePage({ agent }: { agent: Agent }) {
  const { opsOf, updateOps, setViewMode } = useDemo();
  const skeletonView = useSkeletonView();
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
  const showTrace = (id: string) => { if (traces.some(item => item.id === id)) setTraceId(id); document.getElementById('trace-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  if (!skeletonView) {
    return <AgentShell agent={agent} stepId="trace" aside={<Card><span className="eyebrow">说明</span><h3>生产骨架能力</h3><p>Trace 与 bad case 属于生产骨架第 ⑥ ⑧ 项，基础能力视图下不显示。</p></Card>}>
      <SectionHeading eyebrow="生产骨架" title="Trace 与 bad case" description="追溯每次运行并归因 bad case。" />
      <Feedback kind="empty" title="当前为「只看基础能力」视图" description="切换到「显示生产骨架」后查看 Trace 树和 bad case 工作台。" action={<Button className="feedback-action" onClick={() => setViewMode('skeleton')}><Layers size={icon.small} />显示生产骨架</Button>} />
    </AgentShell>;
  }

  if (!online || !trace) {
    return <AgentShell agent={agent} stepId="trace" aside={<Card><span className="eyebrow">可追溯</span><h3>Trace 来自生产请求</h3><p className="meta">发布后，每次运行都会记录版本号、每一步的输入输出和引用依据；bad case 也会关联到对应的 Trace。</p></Card>}>
      <SectionHeading eyebrow="生产骨架 · 可观测与可追溯" title="Trace 与 bad case" description="从一条异常请求出发：看清每一步用了哪个版本、引用了哪条知识，再把问题标注回流到评测集。" />
      <Feedback kind="empty" title="暂无 Trace 记录" description={online ? `线上 ${agent.productionVersion} 还没有产生请求记录，有新请求后这里会显示 Trace 和 bad case。` : '该 Agent 尚未发布，没有生产请求；发布后这里会显示每次运行的 Trace 和 bad case。'}
        action={online ? undefined : <Link className="button button-secondary feedback-action" to={`/agents/${agent.id}/release`}><Rocket size={icon.small} />前往发布</Link>} />
    </AgentShell>;
  }

  const aside = <><Card><div className="sub-heading"><span className="eyebrow">bad case 概览</span><CapabilityBadges skeleton={[6]} /></div><h3>{cases.length} 条待处理</h3>
    <p>{(['用户反馈', '申诉', '抽检'] as const).map(source => `${source} ${cases.filter(item => item.source === source).length}`).join(' · ')}</p>
    <p className="meta">已标注 {labeled} / {cases.length} · 已加入评测集 {added}</p></Card>
    <Card><div className="sub-heading"><span className="eyebrow">可追溯</span><CapabilityBadges skeleton={[8]} /></div><h3>每次运行都能还原</h3><p className="meta">Trace 记录版本号、每一步的输入输出和引用依据（知识条目 + 知识版本）。监控页的调用日志通过 Trace ID 跳转到这里。</p></Card></>;

  return <AgentShell agent={agent} stepId="trace" aside={aside}>
    <SectionHeading eyebrow="生产骨架 · 可观测与可追溯" title="Trace 与 bad case" description="从一条异常请求出发：看清每一步用了哪个版本、引用了哪条知识，再把问题标注回流到评测集。" />
    <div id="trace-card"><Capability skeleton={[8]} title="Trace 树" description="输入 → 检索 → 工具调用 → 生成 → 护栏检查 → 输出，每一步显示耗时、引用依据和 Agent 版本号。"
      actions={<span className="otel-note"><ScanSearch size={icon.small} aria-hidden="true" />OpenTelemetry 标准 · 可接入公司链路追踪</span>}>
      <div className="trace-layout">
        <div className="trace-list" role="listbox" aria-label="最近 Trace">{traces.map(item => <button key={item.id} type="button" role="option" aria-selected={item.id === trace.id} className={item.id === trace.id ? 'selected' : ''} onClick={() => setTraceId(item.id)}>
          <span className="trace-list-top"><code>{item.id}</code><StatusBadge status={item.status === '成功' ? '成功' : '异常'} /></span>{item.env === '隔离评测' && <span className="env-tag isolated">隔离评测</span>}<span className="trace-q" title={item.summary}>{item.summary}</span><span className="meta">{item.time} · {item.version} · {fmtMs(item.steps.reduce((sum, step) => sum + step.ms, 0))}</span></button>)}</div>
        <TraceTree trace={trace} agentName={agent.name} />
      </div>
    </Capability></div>

    <BadCaseBoard cases={cases} labelOf={labelOf} setLabel={setLabel} onShowTrace={showTrace} />
    <Phase2Row items={[
      { skeleton: [6], title: '自动聚类', description: '按语义和 Trace 特征把相似 bad case 聚成一类，优先处理高频问题。' },
      { skeleton: [6, 8], title: '自动归因建议', description: '根据 Trace 中的失效知识、工具超时、护栏拦截等信号，建议问题环节。' },
    ]} />
  </AgentShell>;
}
