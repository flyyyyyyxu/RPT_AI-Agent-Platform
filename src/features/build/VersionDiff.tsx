/** ① 版本 diff：Prompt、模型、工具版本、知识 / 政策版本分别对比。 */
import { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { diffLines } from '../../core/rules/diff';
import type { Agent, AgentVersion } from '../../types/domain';
import { VersionBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';

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
