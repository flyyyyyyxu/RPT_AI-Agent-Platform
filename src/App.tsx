import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { DemoProvider, useDemo } from './core/store/DemoProvider';
import { AppShell } from './features/shell/AppShell';
import { AgentDirectory } from './features/directory/DirectoryPage';
import { BuildPage } from './features/build/BuildPage';
import { CreateAgentPage } from './features/create/CreateAgentPage';
import { EvaluationPage } from './features/evaluation/EvaluationPage';
import { MonitorPage } from './features/monitor/MonitorPage';
import { ReleasePage } from './features/release/ReleasePage';
import { DesignSystemPage } from './features/design-system/DesignSystemPage';
import { AssetsIndex, LibraryPage } from './features/library/LibraryPage';
import { TracePage } from './features/trace/TracePage';
import { AgentSettingsPage } from './features/settings/AgentSettingsPage';
import { OperationsPage } from './features/operations/OperationsPage';
import { GovernancePage } from './features/governance/GovernancePage';
import { Feedback } from './shared/components/Feedback';

/** Agent 内的页面：生命周期（构建 / 评测 / 发布与实验 / 观测）+ 设置；观测分监控、Trace 两个标签页 */
const agentPages = ['build', 'evaluation', 'release', 'monitor', 'trace', 'settings'];

function AgentRoute() {
  const { agentId, stepId } = useParams();
  const { state } = useDemo();
  const agent = state.agents.find(item => item.id === agentId);
  if (!agent) return <Feedback kind="error" title="未找到 Agent" description="请返回工作台重新选择。" />;
  if (stepId === 'observe') return <Navigate to={`/agents/${agent.id}/monitor`} replace />;
  if (!stepId || !agentPages.includes(stepId)) return <Navigate to={`/agents/${agent.id}/build`} replace />;
  if (stepId === 'build') return <BuildPage key={agent.id} agent={agent} />;
  if (stepId === 'evaluation') return <EvaluationPage key={agent.id} agent={agent} />;
  if (stepId === 'release') return <ReleasePage key={agent.id} agent={agent} />;
  if (stepId === 'monitor') return <MonitorPage key={agent.id} agent={agent} />;
  if (stepId === 'trace') return <TracePage key={agent.id} agent={agent} />;
  return <AgentSettingsPage key={agent.id} agent={agent} />;
}

export function App() {
  return <DemoProvider><AppShell><Routes>
    <Route path="/" element={<AgentDirectory />} />
    <Route path="/agents/new" element={<CreateAgentPage />} />
    <Route path="/agents/:agentId" element={<AgentRoute />} />
    <Route path="/agents/:agentId/:stepId" element={<AgentRoute />} />
    <Route path="/assets" element={<AssetsIndex />} />
    <Route path="/assets/:tab" element={<LibraryPage />} />
    <Route path="/operations" element={<OperationsPage />} />
    <Route path="/governance" element={<GovernancePage />} />
    {/* 旧入口：能力组件库 → 资产中心 · 知识库；评测中心 → 资产中心 · 评测集；平台设置 → 治理 */}
    <Route path="/library" element={<Navigate to="/assets/knowledge" replace />} />
    <Route path="/evaluation" element={<Navigate to="/assets/evalsets" replace />} />
    <Route path="/settings" element={<Navigate to="/governance" replace />} />
    <Route path="/design-system" element={<DesignSystemPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppShell></DemoProvider>;
}
