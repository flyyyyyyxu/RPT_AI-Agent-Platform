/**
 * ① 依赖锁定：版本快照锁定的模型、知识、工具版本。
 *   DependencyAlert：上游有更新时放在三栏上方提示，并提供一键升级（基于线上快照建候选版本，或在候选版本里升级）。
 *   DependencyLock：锁定明细表，放在底部「版本快照与对比」里。
 */
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, GitBranchPlus, Lock } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { knowledgeBasesFor, upstreamFor } from '../../core/data-access/scenarioData';
import { modelChoices } from '../../core/data-access/assets';
import { Button } from '../../shared/components/Buttons';
import { getCandidate, isEditable, isEvaluated, nextVersionId } from '../../core/rules/versions';
import { modelLocks } from '../../data';
import type { Agent, AgentConfig, AgentVersion } from '../../types/domain';
import { Capability } from '../../shared/components/Capability';
import { icon } from '../../shared/styles/tokens';
import { NO_FALLBACK } from './CapabilityPanel';

/** 依赖行与上游变化。config 默认是版本快照；候选版本传入工作草稿，让提示跟着正在编辑的内容走。 */
export function useDependencies(config: AgentConfig) {
  const { state } = useDemo();
  const kbs = knowledgeBasesFor(state);
  const models = modelChoices(state, [config.model, config.fallbackModel]);
  const weights = (key: string) => { const found = models.find(item => item.key === key); return found?.weights ? `${found.record?.name.toLowerCase()} · ${/^\d/.test(found.weights) ? `权重 ${found.weights}` : found.weights}` : modelLocks[key] ?? '固定权重'; };
  const rows = [
    { kind: '模型版本', name: config.model, lock: weights(config.model), change: null },
    ...(config.fallbackModel !== NO_FALLBACK ? [{ kind: '备用模型', name: config.fallbackModel, lock: weights(config.fallbackModel), change: null }] : []),
    { kind: /政策/.test(config.knowledge) ? '政策版本' : '知识源版本', name: config.knowledge, lock: config.knowledge === '暂不接入' ? '—' : `快照 ${config.knowledge}`, change: upstreamFor(config.knowledge, kbs) },
    ...config.tools.map(tool => ({ kind: '工具版本', name: tool, lock: `接口 ${tool.split(' ').pop()}`, change: upstreamFor(tool, kbs, state.assets.tools) })),
  ];
  const changed = rows.filter(row => row.change);
  const upgraded: Partial<AgentConfig> = {
    knowledge: upstreamFor(config.knowledge, kbs)?.latest ?? config.knowledge,
    tools: [...new Set(config.tools.map(tool => upstreamFor(tool, kbs, state.assets.tools)?.latest ?? tool))],
  };
  return { rows, changed, upgraded, upgradeNote: `升级依赖：${changed.map(row => row.change?.latest).join('、')}` };
}

export function DependencyAlert({ agent, version, config, dirty, onCreated }: { agent: Agent; version: AgentVersion; config: AgentConfig; dirty: boolean; onCreated?: (id: string) => void }) {
  const { createUpgradedDraft, applyFix } = useDemo();
  const { changed, upgraded, upgradeNote } = useDependencies(config);
  const candidate = getCandidate(agent);
  const isCandidate = isEditable(version);
  const canCreate = !isCandidate && !candidate && version.everOnline;
  const justUpgraded = isCandidate && version.note.startsWith('升级依赖') && !isEvaluated(version);
  if (!changed.length) return justUpgraded
    ? <p className="shared-note dep-note"><CheckCircle2 size={icon.small} aria-hidden="true" />已按最新依赖创建并保存为 {version.id}。下一步：在右侧调试台运行一次调试，再到评测页在隔离环境回归，无需发布。</p>
    : null;
  return <div className="alert-banner" role="status" data-demo="dep-banner"><AlertTriangle size={icon.large} aria-hidden="true" /><div><strong>依赖已变化，建议回归评测</strong>
    <p>{changed.map(row => `${row.name} → ${row.change?.latest}（${row.change?.note}）`).join('；')}。{isCandidate ? `${version.id} 仍锁定旧版本，升级后需要重新调试并在评测页回归。` : candidate ? `请在候选版本 ${candidate.id} 中升级依赖后回归评测。` : `可一键基于 ${version.id} 创建候选版本并升级依赖，再到评测页回归；线上 ${agent.productionVersion ?? '—'} 不受影响。`}</p></div>
    {canCreate && <span data-demo="dep-upgrade"><Button onClick={() => { const id = createUpgradedDraft(agent.id, version.id, upgraded, upgradeNote); onCreated?.(id); }}><GitBranchPlus size={icon.small} />基于 {version.id} 创建候选版本 {nextVersionId(agent)}（升级依赖）</Button></span>}
    {isCandidate && <Button onClick={() => applyFix(agent.id, version.id, { ...config, ...upgraded })}>{dirty ? '升级依赖（草稿一并保存）' : '升级到最新依赖'}</Button>}
    {candidate && !isCandidate && <Link className="button button-secondary" to={`/agents/${agent.id}/build`}>前往候选版本 {candidate.id}</Link>}</div>;
}

export function DependencyLock({ version }: { version: AgentVersion }) {
  const { rows } = useDependencies(version.config);
  return <Capability title="依赖锁定" description={`${version.id} 快照锁定了下列依赖的具体版本；上游更新不会悄悄改变线上行为，回退时知识版本也一并回到旧快照。`}>
    <div className="dep-list">{rows.map(row => <div className="dep-row" key={`${row.kind}-${row.name}`}>
      <span className="meta">{row.kind}</span>
      <span><strong>{row.name}</strong><br /><code><Lock size={icon.small} aria-hidden="true" /> {row.lock}</code></span>
      {row.change ? <span className="dep-status changed"><AlertTriangle size={icon.small} aria-hidden="true" />上游已更新至 {row.change.latest} · {row.change.at}</span> : <span className="dep-status"><CheckCircle2 size={icon.small} aria-hidden="true" />已锁定 · 与上游一致</span>}
    </div>)}</div>
  </Capability>;
}
