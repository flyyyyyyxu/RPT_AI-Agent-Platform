import { Database, FileCheck2, FlaskConical, GitBranchPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../../core/store/DemoProvider';
import { getCandidate } from '../../core/rules/versions';
import { ScopeBadge, StatusBadge, VersionBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { EvaluationRunner } from './EvaluationRunner';
import { VersionComparison } from './VersionComparison';
import { GateConfig } from './GateConfig';
import { GateSummary } from './GateSummary';
import { BatchEvaluation } from './BatchEvaluation';
import { Phase2Row } from '../../shared/components/Capability';
import { Feedback } from '../../shared/components/Feedback';
import { datasetsFor } from '../../core/data-access/scenarioData';
import { AgentShell } from '../shell/AgentShell';
import type { Agent } from '../../types/domain';
import './evaluation.css';
import { icon } from '../../shared/styles/tokens';

const IsolationNote = () => <span className="isolation-note"><FlaskConical size={icon.small} aria-hidden="true" />隔离环境 · 无需发布</span>;
const phase2 = [
  { title: 'LLM 评委', description: '用评审模型按评分细则自动打分，覆盖人工标注不到的长尾样本。' },
  { title: '线上抽样评测', description: '按比例抽取线上请求回放评测，持续监测上线后的质量漂移。' },
];
const isolationCard = <Card><span className="eyebrow">隔离环境</span><h3>候选版本不发布也能评测</h3><p>评测在独立环境运行：单独的模型配额、只读工具沙箱、下游写接口全部 mock，不接生产流量。本原型的评测结果均为预设 mock 数据。</p></Card>;

export function EvaluationPage({ agent }: { agent: Agent }) {
  const { state, markEvaluated, opsOf } = useDemo();
  const candidate = getCandidate(agent);
  const datasets = datasetsFor(agent, candidate, opsOf(agent), state.assets);
  const [datasetId, setDatasetId] = useState(datasets[0].id);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const dataset = datasets.find(item => item.id === datasetId) ?? datasets[0];
  const baseline = agent.productionVersion;

  if (!candidate) {
    const aside = <><Card><span className="eyebrow">评测对象</span><h3>候选版本</h3><p>评测只针对草稿或待发布版本；线上和历史版本是已评测过的快照。</p></Card>{isolationCard}</>;
    return <AgentShell agent={agent} stepId="evaluation" aside={aside}><SectionHeading eyebrow="评测" title="验证候选版本" description="用评测集比较候选版本和线上版本。" aside={<ScopeBadge phase="MVP" />} />
      <Feedback kind="empty" title="当前没有候选版本" description={`线上 ${baseline ?? '—'} 已完成评测和发布。修改前请先在构建页基于线上版本新建草稿。`} action={<Link className="button button-secondary feedback-action" to={`/agents/${agent.id}/build${baseline ? `?version=${baseline}` : ''}`}><GitBranchPlus size={icon.small} />前往构建页新建草稿</Link>} />
      <SectionHeading eyebrow="上线门槛" title="上线前评测验证" description="门槛对之后的所有候选版本生效；批量评测可以直接对线上版本跑回归。" />
      <GateConfig agent={agent} version={null} />
      {baseline && <BatchEvaluation agent={agent} versionId={baseline} />}
      <Phase2Row items={phase2} />
    </AgentShell>;
  }

  const done = candidate.evaluatedDatasets.includes(dataset.id);
  const disabledReason = !candidate.configured ? '请先在构建页保存配置' : !candidate.debugged ? '请先在构建页运行一次调试' : undefined;
  const run = () => {
    timers.current.forEach(window.clearTimeout);
    setRunning(true); setProgress(12);
    timers.current = [
      window.setTimeout(() => setProgress(48), 350),
      window.setTimeout(() => setProgress(78), 700),
    ];
    // 写入评测结果的定时器不随页面卸载取消：离开页面评测照样完成（界面状态更新在卸载后是空操作）
    const versionId = candidate.id; const datasetId = dataset.id;
    window.setTimeout(() => { setProgress(100); setRunning(false); markEvaluated(agent.id, versionId, datasetId); }, 1150);
  };
  const aside = <><Card><span className="eyebrow">评测对象</span><h3>{baseline ? <>线上 <VersionBadge version={baseline} /> 对比候选 <VersionBadge version={candidate.id} /></> : <>首次评测 <VersionBadge version={candidate.id} /></>}</h3><p>{baseline ? `相同样本分别运行 ${baseline} 和 ${candidate.id}，按预设规则打分。` : '还没有线上版本，只展示候选版本的得分。'}</p></Card>
    <Card><span className="eyebrow">已完成</span><h3>{candidate.evaluatedDatasets.length} / {datasets.length} 个评测集</h3><p className="meta">完成任意一个评测集即可发布。配置修改后评测结果会失效，需要重新运行。</p></Card>{isolationCard}</>;

  return <AgentShell agent={agent} stepId="evaluation" aside={aside}><SectionHeading eyebrow="评测" title={`验证候选版本 ${candidate.id}`} description="选择评测集，运行后查看总分、逐条对比和回答差异。" aside={<div className="heading-badges"><IsolationNote /><ScopeBadge phase="MVP" /></div>} />
    <Card><div className="dataset-list" role="radiogroup" aria-label="评测集列表">{datasets.map(item => {
      const itemDone = candidate.evaluatedDatasets.includes(item.id);
      return <button key={item.id} className={item.id === dataset.id ? 'selected' : ''} role="radio" aria-checked={item.id === dataset.id} disabled={running} title={running ? '评测运行中，完成后可切换评测集' : undefined} onClick={() => { setDatasetId(item.id); setProgress(0); }}><span className="dataset-icon"><Database size={icon.large} /></span><span><strong>{item.name}</strong><small>{item.cases.length} 条样本 · {item.description}</small></span>{itemDone ? <StatusBadge status="通过" /> : <span className="meta">未运行</span>}</button>;
    })}</div>
      <div className="dataset-cases">{dataset.cases.map(item => <span key={item.name}><FileCheck2 size={icon.small} />{item.name}</span>)}</div>
      <EvaluationRunner progress={done && !running ? 100 : progress} running={running} complete={done} disabledReason={disabledReason} datasetName={dataset.name} caseCount={dataset.cases.length} candidateVersion={candidate.id} onRun={run} /></Card>
    {done && !running && <><SectionHeading eyebrow="评测报告" title={baseline ? `${baseline} 与 ${candidate.id} 对比 · ${dataset.name}` : `${candidate.id} 首次评测 · ${dataset.name}`} description="逐条查看得分变化；删去的内容标红，新增的内容标绿。" />
      <GateSummary agent={agent} version={candidate} />
      <VersionComparison dataset={dataset} oldVersion={baseline} newVersion={candidate.id} />
      <div className="flow-next"><Link className="button button-secondary" to={`/agents/${agent.id}/release`}>下一步：发布 {candidate.id}</Link></div></>}
    <SectionHeading eyebrow="上线门槛" title="上线前评测验证" description="门槛决定候选版本能否上线；批量评测在隔离环境跑大样本。" />
    {!(done && !running) && <GateSummary agent={agent} version={candidate} />}
    <GateConfig agent={agent} version={candidate} />
    <BatchEvaluation agent={agent} versionId={candidate.id} />
    <Phase2Row items={phase2} />
  </AgentShell>;
}
