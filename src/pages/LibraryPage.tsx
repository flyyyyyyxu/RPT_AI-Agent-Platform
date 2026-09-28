import { useState } from 'react';
import { AlertTriangle, BookOpen, Wrench } from 'lucide-react';
import { StatusBadge, VersionBadge, type Status } from '../components/badges/Badges';
import { Card, SectionHeading } from '../components/content/Content';
import { Capability, Phase2Row, SkeletonHeading, useSkeletonView } from '../components/skeleton/Skeleton';
import { knowledgeBases, toolCatalog } from '../data/mock';

const entryTone: Record<string, Status> = { 生效中: '通过', 已失效: '历史', 待生效: '待发布' };

export function LibraryPage() {
  const skeletonView = useSkeletonView();
  const [kbId, setKbId] = useState(knowledgeBases[0].id);
  const kb = knowledgeBases.find(item => item.id === kbId) ?? knowledgeBases[0];
  const [versionId, setVersionId] = useState(kb.versions[0].id);
  const version = kb.versions.find(item => item.id === versionId) ?? kb.versions[0];
  const entries = kb.entries.filter(entry => entry.versions.includes(version.id));
  const selectKb = (id: string) => { const next = knowledgeBases.find(item => item.id === id) ?? knowledgeBases[0]; setKbId(next.id); setVersionId(next.versions[0].id); };

  return <div className="page-stack">
    <div className="page-heading"><span className="eyebrow">平台基础能力</span><h1>能力组件库</h1><p>沉淀可复用的知识库和工具，任何 Agent 在构建页直接选用。</p></div>

    <SectionHeading eyebrow="基础能力 · 知识库" title="知识库" description="选择一个知识库查看内容。" />
    <Card><div className="kb-cards" role="radiogroup" aria-label="知识库">{knowledgeBases.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === kb.id} className={`kb-card ${item.id === kb.id ? 'selected' : ''}`} onClick={() => selectKb(item.id)}>
      <strong><BookOpen size={16} strokeWidth={1.5} aria-hidden="true" /> {item.name}</strong><small>{item.description}</small><small>{item.owner}{skeletonView ? ` · ${item.versions.length} 个版本` : ''}</small></button>)}</div>
      {!skeletonView && <ul className="meta">{kb.entries.filter(entry => entry.status !== '已失效').map(entry => <li key={entry.title}>{entry.title}</li>)}</ul>}
    </Card>

    <SkeletonHeading skeleton={[1]} title="知识与工具的版本" description="知识、工具和 Prompt 一样有版本；Agent 版本快照只引用具体版本，上游更新不会改变线上行为。" />
    <Capability skeleton={[1]} hero={3} title={`${kb.name} · 版本与生效期`} description="每条知识带生效 / 失效时间；已失效条款仍保留在旧版本里，便于回溯当时的回答依据。">
      <div className="version-chips" role="radiogroup" aria-label="知识库版本">{kb.versions.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === version.id} className={item.id === version.id ? 'selected' : ''} onClick={() => setVersionId(item.id)}>{item.id}<small>{item.publishedAt} 发布</small></button>)}</div>
      <p className="meta">被引用：{version.usedBy.length ? version.usedBy.join('、') : '暂无 Agent 版本引用'}{kb.versions[0].id === version.id && !version.usedBy.length ? '（新版本发布后，引用旧版本的 Agent 会在构建页看到「依赖已变化」提醒）' : ''}</p>
      <div className="table-scroll"><table className="data-table entry-table"><thead><tr><th className="col-entry">知识条目</th><th className="col-time">生效时间</th><th className="col-time">失效时间</th><th className="col-state">状态</th><th className="col-used">所属版本</th></tr></thead>
        <tbody>{entries.map(entry => <tr key={entry.title}><td><span className="truncate" title={entry.title}>{entry.title}</span></td><td className="nowrap">{entry.from}</td><td className="nowrap">{entry.to ?? '长期有效'}</td><td><StatusBadge status={entryTone[entry.status]} /> <span className="meta">{entry.status}</span></td><td><span className="truncate" title={entry.versions.join('、')}>{entry.versions.join('、')}</span></td></tr>)}</tbody></table></div>
    </Capability>

    <SectionHeading eyebrow="基础能力 · 工具" title="工具" description="已登记的公司内部工具，构建页可多选接入。" />
    <Card><div className="table-scroll"><table className="data-table"><thead><tr><th>工具</th><th>接口</th><th>负责人</th></tr></thead>
      <tbody>{toolCatalog.map(tool => <tr key={tool.name}><td><strong><Wrench size={16} strokeWidth={1.5} aria-hidden="true" /> {tool.name}</strong></td><td><code>{tool.api}</code></td><td>{tool.owner}</td></tr>)}</tbody></table></div></Card>
    <Capability skeleton={[1]} title="工具版本" description="工具以「名称 + 版本」登记，接口变更必须发新版本；Agent 快照锁定所用版本。">
      <div className="table-scroll"><table className="data-table"><thead><tr><th>工具</th><th>在用版本</th><th>最新版本</th><th>被引用</th></tr></thead>
        <tbody>{toolCatalog.map(tool => <tr key={tool.name}><td>{tool.name}</td><td><VersionBadge version={tool.version} /></td><td>{tool.latest === tool.version ? <span className="meta">与在用一致</span> : <span className="warning-text"><AlertTriangle size={16} aria-hidden="true" /> {tool.latest} 已发布</span>}</td><td><span className="truncate" title={tool.usedBy}>{tool.usedBy}</span></td></tr>)}</tbody></table></div>
    </Capability>
    <Phase2Row items={[
      { skeleton: [1], title: '企业级共享市场', description: '平台统一认证的技能与工具，全公司可用。' },
      { skeleton: [1], title: '团队级共享', description: '团队内沉淀的技能与工具，团队成员可复用。' },
      { skeleton: [1], title: '个人技能', description: '个人调试中的技能，验证后可申请升级到团队级。' },
    ]} />
  </div>;
}
