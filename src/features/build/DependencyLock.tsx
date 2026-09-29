/** ① 依赖锁定：版本快照锁定的模型、知识、工具版本；上游更新时提示回归评测，可一键创建升级依赖的候选版本。 */
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, GitBranchPlus, Lock } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { knowledgeBasesFor, upstreamFor } from '../../core/data-access/scenarioData';
import { Button } from '../../shared/components/Buttons';
import { getCandidate, isEditable, nextVersionId } from '../../core/rules/versions';
import { modelLocks } from '../../data';
import type { Agent, AgentVersion } from '../../types/domain';
import { Capability } from '../../shared/components/Capability';
import { icon } from '../../shared/styles/tokens';

export function DependencyLock({ agent, version, onCreated }: { agent: Agent; version: AgentVersion; onCreated?: (id: string) => void }) {
  const { state, createUpgradedDraft, applyFix } = useDemo();
  const kbs = knowledgeBasesFor(state);
  const rows = [
    { kind: '模型版本', name: version.config.model, lock: modelLocks[version.config.model] ?? '公司托管 · 固定权重', change: null },
    { kind: /政策/.test(version.config.knowledge) ? '政策版本' : '知识源版本', name: version.config.knowledge, lock: version.config.knowledge === '暂不接入' ? '—' : `快照 ${version.config.knowledge}`, change: upstreamFor(version.config.knowledge, kbs) },
    ...version.config.tools.map(tool => ({ kind: '工具版本', name: tool, lock: `接口 ${tool.split(' ').pop()}`, change: upstreamFor(tool, kbs) })),
  ];
  const changed = rows.filter(row => row.change);
  const candidate = getCandidate(agent);
  const isCandidate = isEditable(version);
  const knowledgeChange = upstreamFor(version.config.knowledge, kbs);
  const upgraded = { knowledge: knowledgeChange?.latest ?? version.config.knowledge, tools: [...new Set(version.config.tools.map(tool => upstreamFor(tool, kbs)?.latest ?? tool))] };
  const upgradeNote = `升级依赖：${changed.map(row => row.change?.latest).join('、')}`;
  const canCreate = !isCandidate && !candidate && version.everOnline;
  return <Capability title="依赖锁定" description={`${version.id} 快照锁定了下列依赖的具体版本；上游更新不会悄悄改变线上行为，回退时知识版本也一并回到旧快照。`}>
    <div className="dep-list">{rows.map(row => <div className="dep-row" key={`${row.kind}-${row.name}`}>
      <span className="meta">{row.kind}</span>
      <span><strong>{row.name}</strong><br /><code><Lock size={icon.small} aria-hidden="true" /> {row.lock}</code></span>
      {row.change ? <span className="dep-status changed"><AlertTriangle size={icon.small} aria-hidden="true" />上游已更新至 {row.change.latest} · {row.change.at}</span> : <span className="dep-status"><CheckCircle2 size={icon.small} aria-hidden="true" />已锁定 · 与上游一致</span>}
    </div>)}</div>
    {changed.length > 0 && <div className="alert-banner" role="status" data-demo="dep-banner"><AlertTriangle size={icon.large} aria-hidden="true" /><div><strong>依赖已变化，建议回归评测</strong>
      <p>{changed.map(row => `${row.name} → ${row.change?.latest}（${row.change?.note}）`).join('；')}。{isCandidate ? `当前快照仍锁定旧版本，升级后需在评测页重新跑回归。` : candidate ? `请在候选版本 ${candidate.id} 中升级依赖后回归评测。` : `可一键基于 ${version.id} 创建候选版本并升级依赖，再到评测页回归；线上 ${agent.productionVersion ?? '—'} 不受影响。`}</p></div>
      {canCreate && <span data-demo="dep-upgrade"><Button onClick={() => { const id = createUpgradedDraft(agent.id, version.id, upgraded, upgradeNote); onCreated?.(id); }}><GitBranchPlus size={icon.small} />基于 {version.id} 创建候选版本 {nextVersionId(agent)}（升级依赖）</Button></span>}
      {isCandidate && <Button onClick={() => applyFix(agent.id, version.id, { ...version.config, ...upgraded })}>升级到最新依赖</Button>}
      {candidate && !isCandidate && <Link className="button button-secondary" to={`/agents/${agent.id}/build`}>前往候选版本 {candidate.id}</Link>}</div>}
    {version.note.startsWith('升级依赖') && isCandidate && <p className="shared-note"><CheckCircle2 size={icon.small} aria-hidden="true" />已按最新依赖创建并保存。下一步：在调试台运行一次调试，再到评测页在隔离环境回归，无需发布。</p>}
  </Capability>;
}
