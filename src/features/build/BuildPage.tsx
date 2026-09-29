import { Check, ChevronDown, GitBranchPlus, Lock, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../../core/store/DemoProvider';
import { useSelectedVersion } from '../../core/hooks/useSelectedVersion';
import { getCandidate, isEditable, isEvaluated, nextVersionId } from '../../core/rules/versions';
import { Button } from '../../shared/components/Buttons';
import { ScopeBadge, StatusBadge } from '../../shared/components/Badges';
import { ConfigSection } from './ConfigSection';
import { DebugPreview } from './DebugPreview';
import { WorkflowStepList } from './WorkflowStepList';
import { DependencyLock } from './DependencyLock';
import { VersionDiff } from './VersionDiff';
import { Phase2Row } from '../../shared/components/Capability';
import { Card, SectionHeading } from '../../shared/components/Content';
import { modelOptions, toolCatalog } from '../../data';
import { debugPresets, knowledgeBasesFor } from '../../core/data-access/scenarioData';
import { usePlaybookLock } from '../playbook/playbooks';

/** 工具选项：工具目录里的在用版本和最新版本。 */
const toolOptions = [...new Set(toolCatalog.flatMap(tool => [`${tool.name} ${tool.version}`, `${tool.name} ${tool.latest}`]))];
import { AgentShell } from '../shell/AgentShell';
import type { Agent, AgentConfig, AgentVersion } from '../../types/domain';
import './build.css';
import { icon } from '../../shared/styles/tokens';

const withCurrent = (options: string[], value: string) => options.includes(value) ? options : [value, ...options];

export function BuildPage({ agent }: { agent: Agent }) {
  const { selected } = useSelectedVersion(agent);
  // updatedAt 变化说明配置被页面外修改过（依赖升级、剧本代改），重新挂载，避免表单留着旧配置被误保存
  return <BuildWorkspace key={`${agent.id}-${selected.id}-${selected.updatedAt}`} agent={agent} version={selected} />;
}

function BuildWorkspace({ agent, version }: { agent: Agent; version: AgentVersion }) {
  const { state, saveConfig, createDraft, markDebugged } = useDemo();
  const draftLock = usePlaybookLock('plain-draft', agent.id);
  /** 知识库选项：来自能力组件库，新发布的知识版本会立即出现在这里。 */
  const knowledgeOptions = [...knowledgeBasesFor(state).flatMap(kb => kb.versions.map(item => `${kb.name} ${item.id}`)), '暂不接入'];
  const { select } = useSelectedVersion(agent);
  const [form, setForm] = useState<AgentConfig>(() => structuredClone(version.config));
  const editable = isEditable(version);
  const candidate = getCandidate(agent);
  const dirty = JSON.stringify(form) !== JSON.stringify(version.config);
  const patch = (value: Partial<AgentConfig>) => setForm(previous => ({ ...previous, ...value }));
  const toggleTool = (tool: string) => patch({ tools: form.tools.includes(tool) ? form.tools.filter(item => item !== tool) : [...form.tools, tool] });
  const variables = form.prompt.match(/{{[^}]+}}/g);
  const loseProgress = dirty && (version.debugged || isEvaluated(version));
  const debugReason = editable ? (dirty ? '请先保存配置，再调试' : !version.configured ? '请先保存配置' : undefined) : undefined;

  const aside = <DebugPreview presets={debugPresets(agent)} initialQuestion={!editable || version.debugged ? agent.lastDebugQuestion : ''} disabledReason={debugReason}
    snapshotNote={editable ? undefined : `正在调试只读快照 ${version.id}，不影响生命周期状态。`}
    onRun={async question => { await new Promise(resolve => window.setTimeout(resolve, 950)); markDebugged(agent.id, version.id, question); }} />;

  return <AgentShell agent={agent} stepId="build" aside={aside}><SectionHeading eyebrow="构建" title={editable ? `配置候选版本 ${version.id}` : `查看快照 ${version.id}`} description={editable ? '修改 Prompt、模型、知识、工具和执行步骤；保存后需要重新调试和评测。' : '已上线或历史版本是不可修改的快照，包含模型、Prompt、编排、工具和知识版本。'} aside={<div className="heading-badges"><StatusBadge status={version.status} /><ScopeBadge phase="MVP" /></div>} />
    {!editable && <div className="snapshot-banner"><Lock size={icon.large} /><div><strong>{version.id} 是只读快照</strong><p>{candidate ? `已有候选版本 ${candidate.id}，请在候选版本上继续修改。` : `如需修改，请基于 ${version.id} 新建草稿 ${nextVersionId(agent)}；线上指向不受影响。`}</p></div>
      {candidate ? <Link className="button button-secondary" to={`/agents/${agent.id}/build`}>前往候选版本 {candidate.id}</Link>
        : <Button variant="primary" disabled={Boolean(draftLock)} reason={draftLock} onClick={() => select(createDraft(agent.id, version.id))}><GitBranchPlus size={icon.small} />基于 {version.id} 新建草稿 {nextVersionId(agent)}</Button>}</div>}
    <Card className="config-card"><fieldset disabled={!editable} className="config-fieldset">
      <div data-demo="prompt"><ConfigSection title="Prompt" description="用双花括号声明变量，例如 {{question}}。"><textarea className="prompt-editor" rows={9} value={form.prompt} readOnly={!editable} onChange={event => patch({ prompt: event.target.value })} /><div className="variable-row"><span className="meta">已识别变量</span>{variables ? variables.map(item => <code key={item}>{item}</code>) : <span className="meta">暂无变量</span>}</div></ConfigSection></div>
      <div className="config-pair"><ConfigSection title="模型" description="选择公司托管的基础模型。"><label className="select-field"><select value={form.model} onChange={event => patch({ model: event.target.value })}>{withCurrent(modelOptions, form.model).map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={icon.small} /></label></ConfigSection><ConfigSection title="输出格式" description="约束最终回答的结构。"><input value={form.outputFormat} readOnly={!editable} onChange={event => patch({ outputFormat: event.target.value })} /></ConfigSection></div>
      <div className="config-pair"><ConfigSection title="知识库" description="知识版本会随配置一起写入版本快照。"><label className="select-field"><select value={form.knowledge} onChange={event => patch({ knowledge: event.target.value })}>{withCurrent(knowledgeOptions, form.knowledge).map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={icon.small} /></label></ConfigSection>
        <ConfigSection title="工具" description="调用已登记的公司内部工具，可多选。"><div className="tool-options">{[...toolOptions, ...form.tools.filter(tool => !toolOptions.includes(tool))].map(tool => <label key={tool} className={`tool-option ${form.tools.includes(tool) ? 'selected' : ''}`}><input type="checkbox" checked={form.tools.includes(tool)} onChange={() => toggleTool(tool)} />{tool}</label>)}</div></ConfigSection></div>
      <ConfigSection title="执行步骤" description="按顺序执行，每一步可以是模型调用、检索、工具调用或代码节点。"><WorkflowStepList steps={form.steps} readOnly={!editable} onChange={steps => patch({ steps })} /></ConfigSection>
    </fieldset>
      {editable && <div className="sticky-form-actions">
        <span className="form-status">{dirty ? <span className="warning-text">有未保存的修改{loseProgress ? '，保存后需要重新调试和评测' : ''}</span> : version.configured ? <span className="meta">配置已保存 · {version.updatedAt}</span> : <span className="meta">初始配置尚未保存</span>}</span>
        {version.configured && version.debugged && !dirty && <Link className="button button-secondary" to={`/agents/${agent.id}/evaluation`}>下一步：运行评测</Link>}
        <Button variant="primary" disabled={!dirty && version.configured} reason={!dirty && version.configured ? '配置未修改' : undefined} onClick={() => saveConfig(agent.id, version.id, form)}>{!dirty && version.configured ? <Check size={icon.small} /> : <Save size={icon.small} />}{!dirty && version.configured ? '已保存' : '保存配置'}</Button>
      </div>}
    </Card>
    <SectionHeading eyebrow="版本管理" title={`版本快照 ${version.id}`} description="变更与版本管理：每个版本锁定模型、Prompt、工具和知识的具体版本，可逐项 diff。" />
    <DependencyLock agent={agent} version={version} onCreated={select} />
    <VersionDiff agent={agent} version={version} />
    <Phase2Row items={[{ title: '依赖变化自动触发回归', description: '模型、知识或工具上游发版后，自动用受影响 Agent 的评测集跑回归并通知负责人。' }]} />
  </AgentShell>;
}
