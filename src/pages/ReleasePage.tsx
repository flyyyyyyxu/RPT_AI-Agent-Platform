import { CheckCircle2, Rocket } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoProvider';
import { Button } from '../components/actions/Buttons';
import { ScopeBadge, VersionBadge } from '../components/badges/Badges';
import { Card, SectionHeading } from '../components/content/Content';
import { Feedback } from '../components/feedback/Feedback';
import { EnvironmentCards } from '../components/release/EnvironmentCards';
import { VersionHistory } from '../components/release/VersionHistory';
import { AgentShell } from '../layouts/AgentShell';
import type { Agent } from '../types/domain';

export function ReleasePage({ agent }: { agent: Agent }) {
  const { state, publishAgent, rollbackAgent } = useDemo();
  const runtime = state.runtimes[agent.id];
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const candidate = runtime.environments.development;
  const publish = async () => { setPublishing(true); setMessage(''); await new Promise(resolve => window.setTimeout(resolve, 900)); publishAgent(agent.id, candidate); setPublishing(false); setMessage(`${candidate} 已发布到生产环境`); };
  const rollback = (version: string) => { rollbackAgent(agent.id, version); setMessage(`线上指向已切换至 ${version}`); };
  const aside = <><Card><span className="eyebrow">发布摘要</span><h3>候选版本 <VersionBadge version={candidate} /></h3><p>评测状态：{runtime.evaluated ? '已完成' : '未完成'}</p></Card>{runtime.published && <Link className="button button-primary full-button" to={`/agents/${agent.id}/monitor`}>查看生产监控</Link>}</>;
  return <AgentShell agent={agent} stepId="release" aside={aside}><SectionHeading eyebrow="基础能力 · 发布" title="环境与版本" description="查看各环境指向，并将已评测版本发布到生产。" aside={<ScopeBadge phase="MVP" />} />
    <Card><div className="release-heading"><div><h3>环境指向</h3><p>发布会更新预发与生产环境的版本指向。</p></div><Button variant="primary" disabled={!runtime.evaluated || publishing || candidate === agent.productionVersion} reason={!runtime.evaluated ? '请先运行评测' : candidate === agent.productionVersion ? '该版本已在线上' : undefined} onClick={publish}>{publishing ? '正在发布' : <><Rocket size={16} />发布 {candidate}</>}</Button></div><EnvironmentCards values={runtime.environments} />{message && <Feedback kind="success" title={message} description="环境和版本历史已同步更新。" />}</Card>
    <SectionHeading eyebrow="版本管理" title="版本历史" description="查看快照记录，并在页面内确认后切换生产指向。" />
    <Card><VersionHistory agent={agent} onRollback={rollback} /></Card>
    {runtime.published && <div className="release-complete"><CheckCircle2 size={20} /><span>发布步骤已完成，可进入监控查看生产数据。</span></div>}
  </AgentShell>;
}
