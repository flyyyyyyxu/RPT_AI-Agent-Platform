import { Database, FileCheck2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoProvider';
import { IntegrationNote, ScopeBadge, StatusBadge } from '../components/badges/Badges';
import { Card, SectionHeading } from '../components/content/Content';
import { EvaluationRunner } from '../components/evaluation/EvaluationRunner';
import { VersionComparison } from '../components/evaluation/VersionComparison';
import { AgentShell } from '../layouts/AgentShell';
import type { Agent } from '../types/domain';

export function EvaluationPage({ agent }: { agent: Agent }) {
  const { state, markEvaluated } = useDemo();
  const runtime = state.runtimes[agent.id];
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(runtime.evaluated ? 100 : 0);
  const [dataset, setDataset] = useState<'base' | 'boundary'>('base');
  const datasetName = dataset === 'base' ? '制度问答基础集' : '制度边界与拒答集';
  const candidateVersion = runtime.environments.development;
  const run = () => {
    setRunning(true); setProgress(12);
    window.setTimeout(() => setProgress(48), 350);
    window.setTimeout(() => setProgress(78), 700);
    window.setTimeout(() => { setProgress(100); setRunning(false); markEvaluated(agent.id); }, 1150);
  };
  const aside = <><Card><span className="eyebrow">评测说明</span><h3>版本对比</h3><p>相同样本分别运行 v3 和 v4，并按预设规则计算得分。</p></Card><Card><IntegrationNote platform="标注" /><p className="meta">本页结果均为演示数据。</p></Card></>;
  return <AgentShell agent={agent} stepId="evaluation" aside={aside}><SectionHeading eyebrow="基础能力 · 评测" title="验证候选版本" description="用固定评测集比较新旧版本的回答质量。" aside={<ScopeBadge phase="MVP" />} />
    <Card><div className="dataset-list" role="radiogroup" aria-label="评测集列表"><button className={dataset === 'base' ? 'selected' : ''} role="radio" aria-checked={dataset === 'base'} onClick={() => setDataset('base')}><span className="dataset-icon"><Database size={20} /></span><span><strong>制度问答基础集</strong><small>3 条样本 · 准确性、引用完整性、可执行性</small></span><StatusBadge status={runtime.evaluated ? '通过' : '草稿'} /></button><button className={dataset === 'boundary' ? 'selected' : ''} role="radio" aria-checked={dataset === 'boundary'} onClick={() => setDataset('boundary')}><span className="dataset-icon"><Database size={20} /></span><span><strong>制度边界与拒答集</strong><small>3 条样本 · 无依据问题、权限边界、过期制度</small></span><StatusBadge status="草稿" /></button></div><div className="dataset-cases"><span><FileCheck2 size={16} />年假资格</span><span><FileCheck2 size={16} />异地出差报销</span><span><FileCheck2 size={16} />病假材料</span></div><EvaluationRunner progress={progress} running={running} complete={runtime.evaluated} disabled={!runtime.configured || !runtime.debugged} datasetName={datasetName} candidateVersion={candidateVersion} onRun={run} /></Card>
    {runtime.evaluated && <><SectionHeading eyebrow="评测报告" title={`${agent.productionVersion} 与 ${candidateVersion} 对比`} description="逐条查看得分变化和回答差异。" /><VersionComparison oldVersion={agent.productionVersion} newVersion={candidateVersion} /><div className="flow-next"><Link className="button button-primary" to={`/agents/${agent.id}/release?version=${candidateVersion}`}>下一步：发布 {candidateVersion}</Link></div></>}
  </AgentShell>;
}
