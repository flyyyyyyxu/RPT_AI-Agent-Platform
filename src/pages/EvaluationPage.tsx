import { Database, FileCheck2, GitBranchPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoProvider';
import { getCandidate } from '../app/versions';
import { ScopeBadge, StatusBadge, VersionBadge } from '../components/badges/Badges';
import { Card, SectionHeading } from '../components/content/Content';
import { EvaluationRunner } from '../components/evaluation/EvaluationRunner';
import { VersionComparison } from '../components/evaluation/VersionComparison';
import { Feedback } from '../components/feedback/Feedback';
import { profiles } from '../data/mock';
import { AgentShell } from '../layouts/AgentShell';
import type { Agent } from '../types/domain';

export function EvaluationPage({ agent }: { agent: Agent }) {
  const { markEvaluated } = useDemo();
  const candidate = getCandidate(agent);
  const datasets = profiles[agent.profile].datasets;
  const [datasetId, setDatasetId] = useState(datasets[0].id);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const dataset = datasets.find(item => item.id === datasetId) ?? datasets[0];
  const baseline = agent.productionVersion;

  if (!candidate) {
    const aside = <Card><span className="eyebrow">评测对象</span><h3>候选版本</h3><p>评测只针对草稿或待发布版本；线上和历史版本是已评测过的快照。</p></Card>;
    return <AgentShell agent={agent} stepId="evaluation" aside={aside}><SectionHeading eyebrow="基础能力 · 评测" title="验证候选版本" description="用评测集比较候选版本和线上版本。" aside={<ScopeBadge phase="MVP" />} />
      <Feedback kind="empty" title="当前没有候选版本" description={`线上 ${baseline ?? '—'} 已完成评测和发布。修改前请先在构建页基于线上版本新建草稿。`} action={<Link className="button button-secondary feedback-action" to={`/agents/${agent.id}/build${baseline ? `?version=${baseline}` : ''}`}><GitBranchPlus size={16} />去构建页新建草稿</Link>} />
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
      window.setTimeout(() => { setProgress(100); setRunning(false); markEvaluated(agent.id, candidate.id, dataset.id); }, 1150),
    ];
  };
  const aside = <><Card><span className="eyebrow">评测对象</span><h3>{baseline ? <>线上 <VersionBadge version={baseline} /> 对比候选 <VersionBadge version={candidate.id} /></> : <>首次评测 <VersionBadge version={candidate.id} /></>}</h3><p>{baseline ? `相同样本分别运行 ${baseline} 和 ${candidate.id}，按预设规则打分。` : '还没有线上版本，只展示候选版本的得分。'}</p></Card>
    <Card><span className="eyebrow">已完成</span><h3>{candidate.evaluatedDatasets.length} / {datasets.length} 个评测集</h3><p className="meta">完成任意一个评测集即可发布。配置修改后评测结果会失效，需要重新运行。</p></Card></>;

  return <AgentShell agent={agent} stepId="evaluation" aside={aside}><SectionHeading eyebrow="基础能力 · 评测" title={`验证候选版本 ${candidate.id}`} description="选择评测集，运行后查看总分、逐条对比和回答差异。" aside={<ScopeBadge phase="MVP" />} />
    <Card><div className="dataset-list" role="radiogroup" aria-label="评测集列表">{datasets.map(item => {
      const itemDone = candidate.evaluatedDatasets.includes(item.id);
      return <button key={item.id} className={item.id === dataset.id ? 'selected' : ''} role="radio" aria-checked={item.id === dataset.id} disabled={running} onClick={() => { setDatasetId(item.id); setProgress(0); }}><span className="dataset-icon"><Database size={20} /></span><span><strong>{item.name}</strong><small>{item.cases.length} 条样本 · {item.description}</small></span>{itemDone ? <StatusBadge status="通过" /> : <span className="meta">未运行</span>}</button>;
    })}</div>
      <div className="dataset-cases">{dataset.cases.map(item => <span key={item.name}><FileCheck2 size={16} />{item.name}</span>)}</div>
      <EvaluationRunner progress={done && !running ? 100 : progress} running={running} complete={done} disabledReason={disabledReason} datasetName={dataset.name} caseCount={dataset.cases.length} candidateVersion={candidate.id} onRun={run} /></Card>
    {done && !running && <><SectionHeading eyebrow="评测报告" title={baseline ? `${baseline} 与 ${candidate.id} 对比 · ${dataset.name}` : `${candidate.id} 首次评测 · ${dataset.name}`} description="逐条查看得分变化；删去的内容标红，新增的内容标绿。" />
      <VersionComparison dataset={dataset} oldVersion={baseline} newVersion={candidate.id} />
      <div className="flow-next"><Link className="button button-primary" to={`/agents/${agent.id}/release`}>下一步：发布 {candidate.id}</Link></div></>}
  </AgentShell>;
}
