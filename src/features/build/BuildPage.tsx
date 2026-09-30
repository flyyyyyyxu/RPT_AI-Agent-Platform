/**
 * 构建页：上方是版本信息与操作条，下方三栏——左 Prompt、中能力配置、右调试对话（吸顶）；
 * 版本快照与对比（依赖锁定 + 版本 diff）放在三栏下方，默认折叠。
 *
 * 草稿模型：
 *   - 表单改动 600ms 后自动保存为「工作草稿」（version.draft），不改变版本快照、不推进演示时钟；
 *   - 调试直接调当前草稿，不需要先保存；
 *   - 「保存为候选版本」把草稿写入快照：配置变化会清空评测结果，调试结果只在调试的正是这份草稿时保留。
 */
import { Check, ChevronDown, ChevronRight, GitBranchPlus, Lock, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../../core/store/DemoProvider';
import { useSelectedVersion } from '../../core/hooks/useSelectedVersion';
import { getCandidate, isEditable, isEvaluated, nextVersionId } from '../../core/rules/versions';
import { badcasePreset, badcasesFor, debugPresets } from '../../core/data-access/scenarioData';
import { Button } from '../../shared/components/Buttons';
import { ScopeBadge, StatusBadge } from '../../shared/components/Badges';
import { SectionHeading } from '../../shared/components/Content';
import { Phase2Row } from '../../shared/components/Capability';
import { usePlaybookLock } from '../playbook/playbooks';
import { AgentShell } from '../shell/AgentShell';
import type { Agent, AgentConfig, AgentVersion } from '../../types/domain';
import { icon } from '../../shared/styles/tokens';
import { DebugChat } from './DebugChat';
import { PromptPanel } from './PromptPanel';
import { CapabilityPanel, memoryText } from './CapabilityPanel';
import { DependencyAlert, DependencyLock, useDependencies } from './DependencyLock';
import { VersionDiff } from './VersionDiff';
import './build.css';
import { buildStepLabel } from '../../core/rules/lifecycle';
import { goalsOfVersion, targetChanged } from '../../core/rules/optimization';
import { GoalCard } from '../optimize/Optimization';

const same = (a: AgentConfig, b: AgentConfig) => JSON.stringify(a) === JSON.stringify(b);
const AUTOSAVE_MS = 600;

export function BuildPage({ agent }: { agent: Agent }) {
  const { selected } = useSelectedVersion(agent);
  // updatedAt 变化说明快照被页面外修改过（依赖升级、剧本代改、保存为候选版本），重新挂载，表单从新快照开始
  return <BuildWorkspace key={`${agent.id}-${selected.id}-${selected.updatedAt}`} agent={agent} version={selected} />;
}

function BuildWorkspace({ agent, version }: { agent: Agent; version: AgentVersion }) {
  const { saveConfig, saveDraft, createDraft, markDebugged, opsOf } = useDemo();
  /** 本轮优化目标：候选版本上看挂在它上面的；只读快照且还没有候选版本时，看等待挂载的 */
  const goalVersionId = isEditable(version) ? version.id : getCandidate(agent) ? undefined : null;
  const goals = goalVersionId === undefined ? [] : goalsOfVersion(agent, opsOf(agent), goalVersionId);
  const focus = [...new Set(goals.flatMap(goal => goal.targets))];
  const draftLock = usePlaybookLock('plain-draft', agent.id);
  const { select } = useSelectedVersion(agent);
  const editable = isEditable(version);
  const candidate = getCandidate(agent);
  const draft = editable && version.draft?.base === version.updatedAt ? version.draft : undefined;
  const [form, setForm] = useState<AgentConfig>(() => structuredClone(draft?.config ?? version.config));
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  /* 自动保存：防抖写入工作草稿；离开页面时立即写入还没落盘的改动 */
  const timer = useRef<number | null>(null);
  const latest = useRef(form);
  latest.current = form;
  const base = version.updatedAt;
  const flush = () => { if (timer.current === null) return; window.clearTimeout(timer.current); timer.current = null; saveDraft(agent.id, version.id, latest.current, base); };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);
  const change = (next: AgentConfig) => {
    setForm(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; saveDraft(agent.id, version.id, next, base); }, AUTOSAVE_MS);
  };
  const patch = (value: Partial<AgentConfig>) => change({ ...form, ...value });

  const dirty = !same(form, version.config);
  const debugged = dirty ? Boolean(draft?.debugged && same(draft.config, form)) : version.debugged;
  const evaluated = isEvaluated(version);
  const deps = useDependencies(version.config);
  const save = () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } saveConfig(agent.id, version.id, form); };
  const openSnapshot = () => { setSnapshotOpen(true); window.setTimeout(() => document.getElementById('version-snapshot')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };

  /* 本轮 bad case 的原话放进调试台：调优对象改过就按期望回答，没改就复现问题 */
  const cases = badcasesFor(agent);
  const roundPresets = goals.filter(goal => goal.source === 'bad case').flatMap(goal => {
    const item = cases.find(entry => entry.id === goal.sourceId);
    return item ? [badcasePreset(agent, item, goal.targets.every(target => targetChanged(agent, form, target)))] : [];
  });
  const aside = <DebugChat presets={[...roundPresets, ...debugPresets(agent)]} roundQuestions={roundPresets.map(item => item.question)} initialQuestion={debugged || !editable ? agent.lastDebugQuestion : ''}
    target={!editable ? `只读快照 ${version.id}` : dirty ? `${version.id} 的草稿（未保存）` : `候选版本 ${version.id}`}
    debugged={editable ? debugged : true} memoryTurns={form.memory.turns} model={form.model} dialog={form.dialog}
    readOnlyNote={editable ? undefined : `调试只读快照不影响生命周期状态。`}
    onRun={async question => { const snapshot = form; flush(); await new Promise(resolve => window.setTimeout(resolve, 950)); markDebugged(agent.id, version.id, question, editable ? snapshot : undefined); }} />;

  const status = !editable ? null
    : dirty ? <span className="warning-text">草稿已自动保存{draft ? ` · ${draft.savedAt.slice(11)}` : ''}，尚未写入 {version.id}{evaluated ? '；保存后需要重新评测' : ''}</span>
    : version.configured ? <span className="meta">{version.id} 已保存 · {version.updatedAt}</span>
    : <span className="meta">初始配置尚未保存为候选版本</span>;
  // 有本轮优化目标时，进度看目标卡里的「本轮进度」，这里不重复显示
  const steps = editable && !goals.length && <span className="build-progress"><span className={!dirty && version.configured ? 'done' : ''}>① 保存</span><span className={debugged ? 'done' : ''}>② 调试</span><span className={evaluated && !dirty ? 'done' : ''}>③ 评测</span></span>;

  const lead = <>
    <SectionHeading eyebrow={buildStepLabel(agent)} title={editable ? `配置候选版本 ${version.id}` : `查看快照 ${version.id}`}
      description={editable ? '左边写角色指令，中间配能力，右边随时调试草稿；确认后保存为候选版本，再去评测。' : '已上线或历史版本是不可修改的快照，包含模型、Prompt、编排、工具和知识版本。'}
      aside={<div className="heading-badges"><StatusBadge status={version.status} /><ScopeBadge phase="MVP" /></div>} />
    {!editable && <div className="snapshot-banner"><Lock size={icon.large} /><div><strong>{version.id} 是只读快照</strong><p>{candidate ? `已有候选版本 ${candidate.id}，请在候选版本上继续修改。` : `如需修改，请基于 ${version.id} 新建草稿 ${nextVersionId(agent)}；线上指向不受影响。`}</p></div>
      {candidate ? <Link className="button button-secondary" to={`/agents/${agent.id}/build`}>前往候选版本 {candidate.id}</Link>
        : <span data-demo="new-draft"><Button variant="primary" disabled={Boolean(draftLock)} reason={draftLock} onClick={() => select(createDraft(agent.id, version.id))}><GitBranchPlus size={icon.small} />基于 {version.id} 新建草稿 {nextVersionId(agent)}</Button></span>}</div>}
    {goalVersionId !== undefined && <GoalCard agent={agent} versionId={goalVersionId} mode="build" />}
    <DependencyAlert agent={agent} version={version} config={editable ? form : version.config} dirty={dirty} onCreated={select} />
    {editable && <div className="build-bar">
      <div className="form-status">{status}{steps}</div>
      <div className="build-bar-actions">
        <button type="button" className="link-button" onClick={openSnapshot}>版本快照与对比</button>
        {version.configured && debugged && !dirty && <Link className="button button-secondary" to={`/agents/${agent.id}/evaluation`}>下一步：运行评测</Link>}
        <Button variant="primary" disabled={!dirty && version.configured} title={!dirty && version.configured ? '没有新的修改' : undefined} onClick={save}>{!dirty && version.configured ? <Check size={icon.small} /> : <Save size={icon.small} />}{!dirty && version.configured ? `已保存为 ${version.id}` : `保存为候选版本 ${version.id}`}</Button>
      </div>
    </div>}
  </>;

  const footer = <section className="snapshot-section" id="version-snapshot">
    <button type="button" className="snapshot-toggle" aria-expanded={snapshotOpen} onClick={() => setSnapshotOpen(value => !value)}>
      {snapshotOpen ? <ChevronDown size={icon.large} aria-hidden="true" /> : <ChevronRight size={icon.large} aria-hidden="true" />}
      <span><strong>版本快照与对比 · {version.id}</strong>
        <span className="meta">锁定 {version.config.model.split(' · ')[0]} · {version.config.knowledge}{version.config.database ? ` · 数据库 ${version.config.database}` : ''} · 工具 {version.config.tools.length} 个 · {memoryText(version.config)}{deps.changed.length ? ` · ${deps.changed.length} 项依赖有上游更新` : ''}{dirty ? ' · 以已保存的快照为准，不含未保存的草稿' : ''}</span></span>
    </button>
    {snapshotOpen && <div className="snapshot-body">
      <DependencyLock version={version} />
      <VersionDiff agent={agent} version={version} />
      <Phase2Row items={[{ title: '依赖变化自动触发回归', description: '模型、知识或工具上游发版后，自动用受影响 Agent 的评测集跑回归并通知负责人。' }]} />
    </div>}
  </section>;

  return <AgentShell agent={agent} stepId="build" aside={aside} lead={lead} footer={footer} layout="build" asideLabel="调试台">
    <div className="build-grid">
      <div className="build-col" data-demo="prompt"><PromptPanel config={form} readOnly={!editable} focused={focus.includes('Prompt')} onChange={prompt => patch({ prompt })} /></div>
      <div className="build-col" data-demo="config"><CapabilityPanel agent={agent} config={form} readOnly={!editable} focus={focus} patch={patch} /></div>
    </div>
  </AgentShell>;
}
