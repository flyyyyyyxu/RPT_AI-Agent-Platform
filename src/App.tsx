import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { lifecycleSteps } from './data/mock';
import { DemoProvider, useDemo } from './app/DemoProvider';
import { AppShell } from './layouts/AppShell';
import { AgentDirectory, PlatformPlaceholder } from './pages/PlatformPlaceholder';
import { AgentStepPlaceholder } from './pages/AgentStepPlaceholder';
import { BuildPage } from './pages/BuildPage';
import { CreateAgentPage } from './pages/CreateAgentPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { MonitorPage } from './pages/MonitorPage';
import { ReleasePage } from './pages/ReleasePage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { Feedback } from './components/feedback/Feedback';

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
  return <AgentStepPlaceholder key={agent.id} agent={agent} stepId={stepId} />;
}

export function App() {
  return <DemoProvider><AppShell><Routes>
    <Route path="/" element={<AgentDirectory />} />
    <Route path="/agents/new" element={<CreateAgentPage />} />
    <Route path="/agents/:agentId" element={<AgentRoute />} />
    <Route path="/agents/:agentId/:stepId" element={<AgentRoute />} />
    <Route path="/library" element={<PlatformPlaceholder title="能力组件库" description="沉淀可复用的 Agent 能力组件。" />} />
    <Route path="/evaluation" element={<PlatformPlaceholder title="评测中心" description="统一管理评测资产与准入标准。" />} />
    <Route path="/operations" element={<PlatformPlaceholder title="运维与成本" description="汇总运行保障、观测与成本信息。" />} />
    <Route path="/settings" element={<PlatformPlaceholder title="设置" description="管理平台级演示配置。" />} />
    <Route path="/design-system" element={<DesignSystemPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppShell></DemoProvider>;
}
