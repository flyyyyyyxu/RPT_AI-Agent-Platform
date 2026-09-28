import { Check, ChevronDown, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoProvider';
import { Button } from '../components/actions/Buttons';
import { ScopeBadge } from '../components/badges/Badges';
import { ConfigSection } from '../components/build/ConfigSection';
import { DebugPreview } from '../components/build/DebugPreview';
import { WorkflowStepList } from '../components/build/WorkflowStepList';
import { Card, SectionHeading } from '../components/content/Content';
import { generalDebugResult } from '../data/mock';
import { AgentShell } from '../layouts/AgentShell';
import type { Agent, AgentConfig } from '../types/domain';

export function BuildPage({ agent }: { agent: Agent }) {
  const { state, updateConfig, markConfigured, markDebugged } = useDemo();
  const runtime = state.runtimes[agent.id];
  const config = runtime.config;
  const patch = (value: Partial<AgentConfig>) => updateConfig(agent.id, { ...config, ...value });
  const aside = <DebugPreview result={generalDebugResult} initialQuestion={runtime.lastDebugQuestion} onRun={async question => { await new Promise(resolve => window.setTimeout(resolve, 950)); markDebugged(agent.id, question); }} />;
  return <AgentShell agent={agent} stepId="build" aside={aside}><SectionHeading eyebrow="基础能力 · 构建" title="配置 Agent" description="配置候选版本的 Prompt、模型、知识与执行步骤。" aside={<ScopeBadge phase="MVP" />} />
    <Card className="config-card"><ConfigSection title="Prompt" description="支持使用双花括号声明变量。"><textarea className="prompt-editor" rows={9} value={config.prompt} onChange={event => patch({ prompt: event.target.value })} /><div className="variable-row"><span className="meta">已识别变量</span><code>{config.prompt.match(/{{[^}]+}}/g)?.join('  ') || '暂无变量'}</code></div></ConfigSection>
      <div className="config-pair"><ConfigSection title="模型" description="选择公司托管的基础模型。"><label className="select-field"><select value={config.model} onChange={event => patch({ model: event.target.value })}><option>DeepSeek-V3 · 公司托管</option><option>Qwen3-235B · 公司托管</option><option>Claude Sonnet · 公司网关</option></select><ChevronDown size={16} /></label></ConfigSection><ConfigSection title="输出格式" description="约束最终回答的结构。"><input value={config.outputFormat} onChange={event => patch({ outputFormat: event.target.value })} /></ConfigSection></div>
      <div className="config-pair"><ConfigSection title="知识库" description="检索回答所需的内部资料。"><label className="select-field"><select value={config.knowledge} onChange={event => patch({ knowledge: event.target.value })}><option>制度库 2026-09 版</option><option>制度库 2026-08 版</option><option>暂不接入</option></select><ChevronDown size={16} /></label></ConfigSection><ConfigSection title="工具" description="调用已登记的公司内部工具。"><label className="select-field"><select value={config.tool} onChange={event => patch({ tool: event.target.value })}><option>员工身份查询 v2</option><option>OA 休假余额查询 v1</option><option>暂不接入</option></select><ChevronDown size={16} /></label></ConfigSection></div>
      <ConfigSection title="执行步骤" description="按顺序执行模型、检索、工具或代码节点。"><WorkflowStepList steps={config.steps} onChange={steps => patch({ steps })} /></ConfigSection>
      <div className="sticky-form-actions"><Button variant="primary" onClick={() => markConfigured(agent.id)}>{runtime.configured ? <Check size={16} /> : <Save size={16} />}{runtime.configured ? '配置已保存' : '保存配置'}</Button>{runtime.debugged && <Link className="button button-secondary" to={`/agents/${agent.id}/evaluation?version=${agent.versions[0].id}`}>下一步：运行评测</Link>}</div>
    </Card>
  </AgentShell>;
}
