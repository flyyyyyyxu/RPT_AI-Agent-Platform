import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, GitBranchPlus, Lock } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { knowledgeBasesFor, upstreamFor } from '../../app/scenarioData';
import { Button } from '../actions/Buttons';
import { diffLines } from '../../app/diff';
import { getCandidate, isEditable, nextVersionId } from '../../app/versions';
import { modelLocks } from '../../data/mock';
import type { Agent, AgentVersion } from '../../types/domain';
import { VersionBadge } from '../badges/Badges';
import { Capability } from '../skeleton/Skeleton';

/** 默认对比基线：看候选 / 灰度版本时对比线上，看线上时对比上一个版本。 */
function defaultBase(agent: Agent, version: AgentVersion) {
  if (agent.productionVersion && agent.productionVersion !== version.id) return agent.productionVersion;
  const index = agent.versions.findIndex(item => item.id === version.id);
  return agent.versions[index + 1]?.id ?? agent.versions.find(item => item.id !== version.id)?.id ?? null;
}

function Pair({ before, after }: { before: string; after: string }) {
  return before === after
    ? <div className="diff-pair"><span className="diff-same">{after}</span><span className="meta">未变化</span><span /></div>
    : <div className="diff-pair"><span className="diff-old">− {before}</span><ArrowRight size={16} aria-hidden="true" /><span className="diff-new">+ {after}</span></div>;
}

export function VersionDiff({ agent, version }: { agent: Agent; version: AgentVersion }) {
  const [baseId, setBaseId] = useState(() => defaultBase(agent, version));
  const base = agent.versions.find(item => item.id === baseId) ?? null;
  const others = agent.versions.filter(item => item.id !== version.id);
  const prompt = base ? diffLines(base.config.prompt, version.config.prompt) : [];
  const promptChanges = prompt.filter(line => line.type !== 'same').length;
  const beforeTools = base?.config.tools ?? [];
  const afterTools = version.config.tools;
  const toolChips = [
    ...afterTools.map(tool => ({ tool, type: beforeTools.includes(tool) ? 'same' : 'add' })),
    ...beforeTools.filter(tool => !afterTools.includes(tool)).map(tool => ({ tool, type: 'del' })),
  ];
  const toolChanges = toolChips.filter(item => item.type !== 'same').length;
  const knowledgeLabel = /政策/.test(version.config.knowledge) ? '政策版本' : '知识版本';
  return <Capability skeleton={[1]} title="版本 diff" description="四类变更分别对比：Prompt、模型、工具版本、知识 / 政策版本。版本是不可修改的快照，diff 直接读快照内容。"
    actions={others.length > 0 && <label className="compact-select diff-select"><span className="sr-only">对比基线</span><select value={baseId ?? ''} onChange={event => setBaseId(event.target.value)}>{others.map(item => <option key={item.id} value={item.id}>对比 {item.id} · {item.status}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>}>
    {!base ? <p className="meta">只有一个版本，暂无可对比的基线。</p> : <>
      <div className="diff-toolbar"><VersionBadge version={base.id} /><ArrowRight size={16} aria-hidden="true" /><VersionBadge version={version.id} /><span className="meta">新增行翠绿底，删除行红底</span></div>
      <div className="diff-sections">
        <section className="diff-section"><div className="diff-section-head"><strong>Prompt</strong><span className="meta">{promptChanges ? `${promptChanges} 行变化` : '未变化'}</span></div>
          <pre className="diff-lines">{prompt.map((line, index) => <div key={index} className={`diff-line ${line.type}`}><span className="diff-sign">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}</span><span>{line.text || ' '}</span></div>)}</pre></section>
        <section className="diff-section"><div className="diff-section-head"><strong>模型</strong><span className="meta">{base.config.model === version.config.model ? '未变化' : '已更换'}</span></div><Pair before={base.config.model} after={version.config.model} /></section>
        <section className="diff-section"><div className="diff-section-head"><strong>工具版本</strong><span className="meta">{toolChanges ? `${toolChanges} 处变化` : '未变化'}</span></div>
          <div className="tool-diff">{toolChips.length ? toolChips.map(item => <span key={`${item.type}-${item.tool}`} className={`tool-chip ${item.type}`}>{item.type === 'add' ? '+ ' : item.type === 'del' ? '− ' : ''}{item.tool}</span>) : <span className="meta">两个版本都未接入工具</span>}</div></section>
        <section className="diff-section"><div className="diff-section-head"><strong>{knowledgeLabel}</strong><span className="meta">{base.config.knowledge === version.config.knowledge ? '未变化' : '已切换'}</span></div><Pair before={base.config.knowledge} after={version.config.knowledge} /></section>
      </div>
    </>}
  </Capability>;
}

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
  return <Capability skeleton={[1]} hero={3} title="依赖锁定" description={`${version.id} 快照锁定了下列依赖的具体版本；上游更新不会悄悄改变线上行为，回退时知识版本也一并回到旧快照。`}>
    <div className="dep-list">{rows.map(row => <div className="dep-row" key={`${row.kind}-${row.name}`}>
      <span className="meta">{row.kind}</span>
      <span><strong>{row.name}</strong><br /><code><Lock size={16} strokeWidth={1.5} aria-hidden="true" /> {row.lock}</code></span>
      {row.change ? <span className="dep-status changed"><AlertTriangle size={16} aria-hidden="true" />上游已更新至 {row.change.latest} · {row.change.at}</span> : <span className="dep-status"><CheckCircle2 size={16} aria-hidden="true" />已锁定 · 与上游一致</span>}
    </div>)}</div>
    {changed.length > 0 && <div className="alert-banner" role="status" data-demo="dep-banner"><AlertTriangle size={20} aria-hidden="true" /><div><strong>依赖已变化，建议回归评测</strong>
      <p>{changed.map(row => `${row.name} → ${row.change?.latest}（${row.change?.note}）`).join('；')}。{isCandidate ? `当前快照仍锁定旧版本，升级后需在评测页重新跑回归。` : candidate ? `请在候选版本 ${candidate.id} 中升级依赖后回归评测。` : `可一键基于 ${version.id} 创建候选版本并升级依赖，再到评测页回归；线上 ${agent.productionVersion ?? '—'} 不受影响。`}</p></div>
      {canCreate && <span data-demo="dep-upgrade"><Button onClick={() => { const id = createUpgradedDraft(agent.id, version.id, upgraded, upgradeNote); onCreated?.(id); }}><GitBranchPlus size={16} />基于 {version.id} 创建候选版本 {nextVersionId(agent)}（升级依赖）</Button></span>}
      {isCandidate && <Button onClick={() => applyFix(agent.id, version.id, { ...version.config, ...upgraded })}>升级到最新依赖</Button>}
      {candidate && !isCandidate && <Link className="button button-secondary" to={`/agents/${agent.id}/build`}>前往候选版本 {candidate.id}</Link>}</div>}
    {version.note.startsWith('升级依赖') && isCandidate && <p className="shared-note"><CheckCircle2 size={16} aria-hidden="true" />已按最新依赖创建；平台用第一条预设问题自动跑了一次冒烟调试（结果见调试台）。下一步：在隔离环境运行评测，无需发布。</p>}
  </Capability>;
}
