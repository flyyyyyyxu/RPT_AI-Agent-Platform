/** 工作台：待办在前，Agent 目录其次，演示剧本入口放在目录下方。 */
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { Card } from '../../shared/components/Content';
import { MetricCard } from '../../shared/components/DataDisplay';
import { getExperiment } from '../../core/rules/versions';
import { AgentTable } from './AgentTable';
import { Feedback } from '../../shared/components/Feedback';
import { PlaybookCards } from '../playbook/PlaybookCards';
import { icon } from '../../shared/styles/tokens';
import './directory.css';

export function AgentDirectory() {
  const { state, opsOf } = useDemo();
  const names = (list: string[]) => list.length ? list.join('、') : '暂无';
  const pending = state.agents.filter(agent => opsOf(agent).approvalPending).map(agent => `${agent.name} ${opsOf(agent).approvalPending}`);
  const experiments = state.agents.flatMap(agent => { const experiment = getExperiment(agent); return experiment ? [`${agent.name} ${experiment.id}`] : []; });
  const waiting = state.agents.flatMap(agent => agent.versions.filter(version => version.status === '待发布').map(version => `${agent.name} ${version.id}`));
  return <div><div className="directory-heading"><div className="page-heading"><span className="eyebrow">工作台</span><h1>Agent 目录</h1><p>点击任意 Agent，进入它的构建、评测、发布与实验、观测工作区。</p></div><Link className="button button-primary" to="/agents/new"><Plus size={icon.small} />新建 Agent</Link></div>
    <div className="metric-grid directory-todos" aria-label="待办">
      <MetricCard label="待审批" value={String(pending.length)} detail={names(pending)} />
      <MetricCard label="灰度 / 影子运行中" value={String(experiments.length)} detail={names(experiments)} />
      <MetricCard label="候选版本待发布" value={String(waiting.length)} detail={names(waiting)} />
    </div>
    {state.agents.length ? <Card className="agent-table-card"><AgentTable agents={state.agents} /></Card> : <Feedback kind="empty" title="还没有 Agent" description="点击「新建 Agent」，描述需求或选择模板生成初始配置。" />}
    <PlaybookCards />
  </div>;
}
