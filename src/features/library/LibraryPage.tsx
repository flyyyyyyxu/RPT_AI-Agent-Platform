import { useState } from 'react';
import { AlertTriangle, BookOpen, FilePlus2, Wrench } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { entryStatus, knowledgeBasesFor, nextKbVersion } from '../../core/data-access/scenarioData';
import { Button } from '../../shared/components/Buttons';
import { StatusBadge, VersionBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import { toolCatalog } from '../../data';
import { entryTone, KbDraftEditor } from './KbDraftEditor';
import './library.css';
import { icon } from '../../shared/styles/tokens';

export function LibraryPage() {
  const { state, setKbDraft } = useDemo();
  const knowledgeBases = knowledgeBasesFor(state);
  const [kbId, setKbId] = useState(state.kbDraft?.kbId ?? (state.playbook?.id === 'c' ? 'aftersale' : knowledgeBases[0].id));
  const kb = knowledgeBases.find(item => item.id === kbId) ?? knowledgeBases[0];
  const [versionId, setVersionId] = useState(kb.versions[0].id);
  const version = kb.versions.find(item => item.id === versionId) ?? kb.versions[0];
  const entries = kb.entries.filter(entry => entry.versions.includes(version.id));
  const selectKb = (id: string) => { const next = knowledgeBases.find(item => item.id === id) ?? knowledgeBases[0]; setKbId(next.id); setVersionId(next.versions[0].id); };
  const usedBy = state.agents.flatMap(agent => agent.versions.filter(item => item.config.knowledge === `${kb.name} ${version.id}`).map(item => `${agent.name} ${item.id}`));
  const latest = kb.versions[0];
  const draft = state.kbDraft;
  const startDraft = () => setKbDraft({ kbId: kb.id, fromVersion: latest.id, nextVersion: nextKbVersion(latest.id), entries: kb.entries.filter(entry => entry.versions.includes(latest.id)).map(entry => ({ title: entry.title, from: entry.from, to: entry.to })) });

  return <div className="page-stack">
    <div className="page-heading"><span className="eyebrow">平台能力</span><h1>能力组件库</h1><p>沉淀可复用的知识库和工具，任何 Agent 在构建页直接选用。</p></div>

    <SectionHeading eyebrow="知识库" title="知识库" description="选择一个知识库查看内容。" />
    <Card><div className="kb-cards" role="radiogroup" aria-label="知识库">{knowledgeBases.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === kb.id} className={`kb-card ${item.id === kb.id ? 'selected' : ''}`} onClick={() => selectKb(item.id)}>
      <strong><BookOpen size={icon.small} aria-hidden="true" /> {item.name}</strong><small>{item.description}</small><small>{item.owner} · {item.versions.length} 个版本</small></button>)}</div>
    </Card>

    <SectionHeading eyebrow="版本管理" title="知识与工具的版本" description="知识、工具和 Prompt 一样有版本；Agent 版本快照只引用具体版本，上游更新不会改变线上行为。" />
    <Capability title={`${kb.name} · 版本与生效期`} description="每条知识带生效 / 失效时间；已失效条款仍保留在旧版本里，便于回溯当时的回答依据。"
      actions={!draft && <span data-demo="kb-new-version"><Button onClick={startDraft}><FilePlus2 size={icon.small} />基于 {latest.id} 新建版本 {nextKbVersion(latest.id)}</Button></span>}>
      <div className="version-chips" role="radiogroup" aria-label="知识库版本">{kb.versions.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === version.id} className={item.id === version.id ? 'selected' : ''} onClick={() => setVersionId(item.id)}>{item.id}<small>{item.publishedAt} 发布</small></button>)}</div>
      <p className="meta">{version.note ? `版本说明：${version.note} · ` : ''}被引用：{usedBy.length ? usedBy.join('、') : '暂无 Agent 版本引用'}{latest.id === version.id && !usedBy.length ? '（引用旧版本的 Agent 会在构建页看到「依赖已变化」提醒）' : ''}</p>
      <div className="table-scroll"><table className="data-table entry-table"><thead><tr><th className="col-entry">知识条目</th><th className="col-time">生效时间</th><th className="col-time">失效时间</th><th className="col-state">状态</th><th className="col-used">所属版本</th></tr></thead>
        <tbody>{entries.map(entry => <tr key={entry.title}><td><span className="truncate" title={entry.title}>{entry.title}</span></td><td className="nowrap">{entry.from}</td><td className="nowrap">{entry.to ?? '长期有效'}</td><td><StatusBadge status={entryTone[entryStatus(entry)]} /> <span className="meta">{entryStatus(entry)}</span></td><td><span className="truncate" title={entry.versions.join('、')}>{entry.versions.join('、')}</span></td></tr>)}</tbody></table></div>
    </Capability>

    {draft && draft.kbId === kb.id && <KbDraftEditor draft={draft} onPublished={setVersionId} />}
    {draft && draft.kbId !== kb.id && <p className="meta">另有一个「{knowledgeBases.find(item => item.id === draft.kbId)?.name}」的新版本草稿未发布。</p>}

    <SectionHeading eyebrow="工具" title="工具" description="已登记的公司内部工具，构建页可多选接入。" />
    <Card><div className="table-scroll"><table className="data-table"><thead><tr><th>工具</th><th>接口</th><th>负责人</th></tr></thead>
      <tbody>{toolCatalog.map(tool => <tr key={tool.name}><td><strong><Wrench size={icon.small} aria-hidden="true" /> {tool.name}</strong></td><td><code>{tool.api}</code></td><td>{tool.owner}</td></tr>)}</tbody></table></div></Card>
    <Capability title="工具版本" description="工具以「名称 + 版本」登记，接口变更必须发新版本；Agent 快照锁定所用版本。">
      <div className="table-scroll"><table className="data-table"><thead><tr><th>工具</th><th>在用版本</th><th>最新版本</th><th>被引用</th></tr></thead>
        <tbody>{toolCatalog.map(tool => <tr key={tool.name}><td>{tool.name}</td><td><VersionBadge version={tool.version} /></td><td>{tool.latest === tool.version ? <span className="meta">与在用一致</span> : <span className="warning-text"><AlertTriangle size={icon.small} aria-hidden="true" /> {tool.latest} 已发布</span>}</td><td><span className="truncate" title={tool.usedBy}>{tool.usedBy}</span></td></tr>)}</tbody></table></div>
    </Capability>
    <Phase2Row items={[
      { title: '企业级共享市场', description: '平台统一认证的技能与工具，全公司可用。' },
      { title: '团队级共享', description: '团队内沉淀的技能与工具，团队成员可复用。' },
      { title: '个人技能', description: '个人调试中的技能，验证后可申请升级到团队级。' },
    ]} />
  </div>;
}
