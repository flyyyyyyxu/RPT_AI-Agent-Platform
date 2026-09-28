import { Activity, Rocket } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoProvider';
import { getCandidate, isEvaluated } from '../app/versions';
import { ConfirmAction } from '../components/actions/Buttons';
import { ScopeBadge, VersionBadge } from '../components/badges/Badges';
import { Card, SectionHeading } from '../components/content/Content';
import { Feedback } from '../components/feedback/Feedback';
import { EnvironmentCards } from '../components/release/EnvironmentCards';
import { VersionHistory } from '../components/release/VersionHistory';
import { AgentShell } from '../layouts/AgentShell';
import type { Agent } from '../types/domain';

export function ReleasePage({ agent }: { agent: Agent }) {
  const { publishCandidate, rollbackTo } = useDemo();
  const candidate = getCandidate(agent);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ title: string; description: string } | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reason = !candidate ? '没有候选版本，请先在构建页新建草稿'
    : !candidate.configured ? '候选版本配置未保存'
    : !candidate.debugged ? '候选版本尚未调试'
    : !isEvaluated(candidate) ? '请先运行评测' : undefined;
  const from = agent.productionVersion;
  const publish = () => {
    if (!candidate) return;
    const target = candidate.id;
    setPublishing(true); setMessage(null);
    timer.current = window.setTimeout(() => {
      publishCandidate(agent.id); setPublishing(false);
      setMessage({ title: `${target} 已发布到生产环境`, description: from ? `线上指向 ${from} → ${target}；${from} 保留为历史版本，可在下方一键回退。` : `线上指向 → ${target}，这是该 Agent 的首次发布。` });
    }, 900);
  };
  const rollback = (version: string) => { const previous = agent.productionVersion; rollbackTo(agent.id, version); setMessage({ title: `已回退到 ${version}`, description: `线上指向 ${previous} → ${version}，新请求已使用 ${version}。` }); };

  const aside = <><Card><span className="eyebrow">发布摘要</span><h3>{candidate ? <>候选版本 <VersionBadge version={candidate.id} /></> : '没有候选版本'}</h3>
    {candidate && <p>配置 {candidate.configured ? '已保存' : '未保存'} · 调试 {candidate.debugged ? '已完成' : '未完成'} · 评测 {isEvaluated(candidate) ? '已完成' : '未完成'}</p>}
    <p className="meta">线上指向：{agent.productionVersion ?? '未发布'}{agent.lastReleaseAt ? ` · 最近变更 ${agent.lastReleaseAt}` : ''}</p></Card>
    {agent.productionVersion && <Link className="button button-primary full-button" to={`/agents/${agent.id}/monitor`}><Activity size={16} />查看 {agent.productionVersion} 生产监控</Link>}</>;

  return <AgentShell agent={agent} stepId="release" aside={aside}><SectionHeading eyebrow="基础能力 · 发布" title="环境与版本" description="发布和回退都只是改变生产环境的线上指向，版本快照本身不变。" aside={<ScopeBadge phase="MVP" />} />
    <Card><div className="release-heading"><div><h3>环境指向</h3><p>发布会把候选版本同时推到预发和生产。</p></div>
      {!publishing && <ConfirmAction variant="primary" icon={<Rocket size={16} />} actionLabel={candidate ? `发布 ${candidate.id} 到生产` : '发布到生产'} confirmLabel={`确认发布 ${candidate?.id ?? ''}`} disabled={Boolean(reason)} reason={reason}
        impact={from ? `生产环境将从 ${from} 切换到 ${candidate?.id}，之后的新请求立即使用 ${candidate?.id}。出现问题可在版本历史中回退到 ${from}。` : `${candidate?.id} 将成为首个线上版本，开始接收生产请求。`} onConfirm={publish} />}</div>
      <EnvironmentCards agent={agent} />
      {publishing && <Feedback kind="loading" title={`正在发布 ${candidate?.id}`} description="正在切换预发和生产环境的版本指向…" />}
      {message && !publishing && <Feedback kind="success" title={message.title} description={message.description} />}</Card>
    <SectionHeading eyebrow="版本管理" title="版本历史" description="只有曾经上线过的版本可以回退；草稿、待发布和灰度中的版本需要走发布流程。" />
    <Card><VersionHistory agent={agent} onRollback={rollback} /></Card>
  </AgentShell>;
}
