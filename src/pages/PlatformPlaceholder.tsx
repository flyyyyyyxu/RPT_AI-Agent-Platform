import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useDemo } from '../app/DemoProvider';
import { SectionHeading, Card, Placeholder } from '../components/content/Content';
import { AgentTable } from '../components/agents/AgentTable';
import { Feedback } from '../components/feedback/Feedback';
import { PlaybookCards } from '../components/playbook/Playbook';

export function AgentDirectory() {
  const { state } = useDemo();
  const agents = state.team === '全部团队' ? state.agents : state.agents.filter(agent => agent.team === state.team);
  return <div><div className="directory-heading"><div className="page-heading"><span className="eyebrow">工作台 · Agent 目录</span><h1>Agent 目录</h1><p>统一进入构建、评测、发布和监控工作区。</p></div><Link className="button button-primary" to="/agents/new"><Plus size={16} />新建 Agent</Link></div>
    <PlaybookCards />
    <SectionHeading eyebrow="工作台" title="全部 Agent" description="点击任意 Agent 进入构建、评测、发布和监控工作区。" />
    {agents.length ? <Card className="agent-table-card"><AgentTable agents={agents} /></Card> : <Feedback kind="empty" title={`「${state.team}」暂无 Agent`} description="切换团队，或新建一个 Agent。" />}
  </div>;
}

export function PlatformPlaceholder({ title, description }: { title: string; description: string }) {
  return <div><div className="page-heading"><span className="eyebrow">平台基础能力</span><h1>{title}</h1><p>{description}</p></div><SectionHeading eyebrow="页面框架" title="工作区占位" description="此阶段只建立统一布局，具体业务流程将在后续补充。" /><Placeholder title={`${title}主操作区`} description="页面内容待后续按具体任务设计。" /></div>;
}
