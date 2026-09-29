import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { lifecycleSteps } from './data';
import { DemoProvider, useDemo } from './core/store/DemoProvider';
import { AppShell } from './features/shell/AppShell';
import { AgentDirectory } from './features/directory/DirectoryPage';
import { PlatformPlaceholder } from './features/placeholder/PlatformPlaceholder';
import { BuildPage } from './features/build/BuildPage';
import { CreateAgentPage } from './features/create/CreateAgentPage';
import { EvaluationPage } from './features/evaluation/EvaluationPage';
import { MonitorPage } from './features/monitor/MonitorPage';
import { ReleasePage } from './features/release/ReleasePage';
import { DesignSystemPage } from './features/design-system/DesignSystemPage';
import { LibraryPage } from './features/library/LibraryPage';
import { TracePage } from './features/trace/TracePage';
import { AgentSettingsPage } from './features/settings/AgentSettingsPage';
import { Feedback } from './shared/components/Feedback';

function AgentRoute() {
  const { agentId, stepId } = useParams();
  const { state } = useDemo();
  const agent = state.agents.find(item => item.id === agentId);
  if (!agent) return <Feedback kind="error" title="未找到 Agent" description="请返回工作台重新选择。" />;
  if (!stepId) return <Navigate to={`/agents/${agent.id}/build`} replace />;
  if (stepId !== 'settings' && !lifecycleSteps.some(step => step.id === stepId)) return <Navigate to={`/agents/${agent.id}/build`} replace />;
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
    <Route path="/library" element={<LibraryPage />} />
    <Route path="/evaluation" element={<PlatformPlaceholder title="评测中心" description="统一管理评测资产与准入标准。" />} />
    <Route path="/operations" element={<PlatformPlaceholder title="运维与成本" description="汇总运行保障、观测与成本信息。" />} />
    <Route path="/settings" element={<PlatformPlaceholder title="设置" description="管理平台级演示配置。" />} />
    <Route path="/design-system" element={<DesignSystemPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppShell></DemoProvider>;
}
