import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDemo } from '../app/DemoProvider';
import { SectionHeading, Card, Placeholder } from '../components/content/Content';
import { StatusBadge, VersionBadge } from '../components/badges/Badges';

export function AgentDirectory() {
  const { state } = useDemo();
  const agents = state.team === '全部团队' ? state.agents : state.agents.filter(agent => agent.team === state.team);
  return <div><div className="page-heading"><span className="eyebrow">工作台 · Agent 目录</span><h1>选择 Agent</h1><p>查看统一的构建、评测、发布和观测工作区。</p></div>
    <div className="agent-grid">{agents.map(agent => <Link key={agent.id} to={`/agents/${agent.id}/build`} className="agent-directory-link"><Card><div className="directory-card-top"><StatusBadge status="线上" /><ArrowRight size={20} strokeWidth={1.5} /></div><h2>{agent.name}</h2><p>{agent.mode}</p><div className="directory-card-bottom"><span>{agent.team} · {agent.owner}</span><span>线上 <VersionBadge version={agent.productionVersion} /></span></div></Card></Link>)}</div>
  </div>;
}

export function PlatformPlaceholder({ title, description }: { title: string; description: string }) {
  return <div><div className="page-heading"><span className="eyebrow">平台基础能力</span><h1>{title}</h1><p>{description}</p></div><SectionHeading eyebrow="页面框架" title="工作区占位" description="此阶段只建立统一布局，具体业务流程将在后续补充。" /><Placeholder title={`${title}主操作区`} description="页面内容待后续按具体任务设计。" /></div>;
}
