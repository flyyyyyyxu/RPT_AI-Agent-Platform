/** 工作台：演示剧本入口 + Agent 目录。 */
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { SectionHeading, Card } from '../../shared/components/Content';
import { AgentTable } from './AgentTable';
import { Feedback } from '../../shared/components/Feedback';
import { PlaybookCards } from '../playbook/PlaybookCards';
import './directory.css';
import { icon } from '../../shared/styles/tokens';

export function AgentDirectory() {
  const { state } = useDemo();
  const agents = state.team === '全部团队' ? state.agents : state.agents.filter(agent => agent.team === state.team);
  return <div><div className="directory-heading"><div className="page-heading"><span className="eyebrow">工作台 · Agent 目录</span><h1>Agent 目录</h1><p>统一进入构建、评测、发布和监控工作区。</p></div><Link className="button button-primary" to="/agents/new"><Plus size={icon.small} />新建 Agent</Link></div>
    <PlaybookCards />
    <SectionHeading eyebrow="工作台" title="全部 Agent" description="点击任意 Agent 进入构建、评测、发布和监控工作区。" />
    {agents.length ? <Card className="agent-table-card"><AgentTable agents={agents} /></Card> : <Feedback kind="empty" title={`「${state.team}」暂无 Agent`} description="切换团队，或新建一个 Agent。" />}
  </div>;
}
