/** 工作台：Agent 目录在前，演示剧本入口放在目录下方。 */
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { Card } from '../../shared/components/Content';
import { AgentTable } from './AgentTable';
import { Feedback } from '../../shared/components/Feedback';
import { PlaybookCards } from '../playbook/PlaybookCards';
import { icon } from '../../shared/styles/tokens';
import './directory.css';

export function AgentDirectory() {
  const { state } = useDemo();
  return <div><div className="directory-heading"><div className="page-heading"><span className="eyebrow">工作台</span><h1>Agent 目录</h1><p>点击任意 Agent，进入构建、评测、发布和监控工作区。</p></div><Link className="button button-primary" to="/agents/new"><Plus size={icon.small} />新建 Agent</Link></div>
    {state.agents.length ? <Card className="agent-table-card"><AgentTable agents={state.agents} /></Card> : <Feedback kind="empty" title="还没有 Agent" description="点击「新建 Agent」，描述需求或选择模板生成初始配置。" />}
    <PlaybookCards />
  </div>;
}
