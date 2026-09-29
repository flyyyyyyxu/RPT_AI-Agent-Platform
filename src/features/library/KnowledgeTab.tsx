/**
 * 资产中心 · 知识库：左侧知识库目录（团队 → 知识库 → 版本），右侧选中版本的条目与生效期；页头「新建知识库」。
 * 知识库的修改走版本草稿：基于最新版本新建版本 → 调整条目和生效期 → 发布（见 KbDraftEditor）。
 */
import { useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, FilePlus2, FileUp, Folder, Search } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { entryStatus, knowledgeBasesFor, nextKbVersion } from '../../core/data-access/scenarioData';
import { nowStamp } from '../../core/rules/clock';
import { Button } from '../../shared/components/Buttons';
import { StatusBadge } from '../../shared/components/Badges';
import { Card } from '../../shared/components/Content';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import { Drawer } from '../../shared/components/Drawer';
import { teamOptions, visibilityOptions } from '../../data';
import type { KnowledgeBase } from '../../types/domain';
import { entryTone, KbDraftEditor } from './KbDraftEditor';
import { AssetHeading, Chips, Field, FormGrid, FormSection, MiniTable, ResultBox, SelectInput } from './assetUi';
import { icon } from '../../shared/styles/tokens';

const teamOf = (kb: KnowledgeBase) => kb.owner.split(' · ')[0];

/** 知识库：左侧知识库目录（团队 → 知识库 → 版本），右侧选中版本的条目与生效期。 */
export function KnowledgeTab() {
  const { state, setKbDraft } = useDemo();
  const [creating, setCreating] = useState(false);
  const knowledgeBases = knowledgeBasesFor(state);
  const [kbId, setKbId] = useState(state.kbDraft?.kbId ?? (state.playbook?.id === 'c' ? 'aftersale' : knowledgeBases[0].id));
  const kb = knowledgeBases.find(item => item.id === kbId) ?? knowledgeBases[0];
  const [versionId, setVersionId] = useState(kb.versions[0].id);
  const version = kb.versions.find(item => item.id === versionId) ?? kb.versions[0];
  const [query, setQuery] = useState('');
  const [closedTeams, setClosedTeams] = useState<string[]>([]);
  const entries = kb.entries.filter(entry => entry.versions.includes(version.id));
  const selectKb = (id: string, vid?: string) => { const next = knowledgeBases.find(item => item.id === id) ?? knowledgeBases[0]; setKbId(next.id); setVersionId(vid ?? next.versions[0].id); };
  const refsOf = (name: string, vid: string) => state.agents.flatMap(agent => agent.versions.filter(item => item.config.knowledge === `${name} ${vid}`).map(item => ({ agent, version: item })));
  const useLabel = (name: string, vid: string) => { const refs = refsOf(name, vid); return refs.some(ref => ref.agent.productionVersion === ref.version.id) ? '线上在用' : refs.length ? `${refs.length} 个版本引用` : '未引用'; };
  const usedBy = refsOf(kb.name, version.id).map(ref => `${ref.agent.name} ${ref.version.id}`);
  const latest = kb.versions[0];
  const draft = state.kbDraft;
  const startDraft = () => setKbDraft({ kbId: kb.id, fromVersion: latest.id, nextVersion: nextKbVersion(latest.id), entries: kb.entries.filter(entry => entry.versions.includes(latest.id)).map(entry => ({ title: entry.title, from: entry.from, to: entry.to })) });
  const keyword = query.trim();
  const visible = knowledgeBases.filter(item => !keyword || [item.name, teamOf(item), item.description].some(text => text.includes(keyword)));
  const teams = [...new Set(knowledgeBases.map(teamOf))];
  const toggleTeam = (team: string) => setClosedTeams(list => list.includes(team) ? list.filter(item => item !== team) : [...list, team]);

  const onCreated = (id: string) => { setCreating(false); setKbId(id); setVersionId('v1'); setClosedTeams([]); setQuery(''); };
  return <><AssetHeading section="knowledge" actionLabel="新建知识库" onAction={() => setCreating(true)} demo="kb-create" /><div className="kb-layout">
    <aside className="card kb-tree" aria-label="知识库目录">
      <div className="kb-tree-head"><strong>知识库目录</strong><span className="meta">{knowledgeBases.length} 个知识库</span></div>
      <label className="kb-search"><Search size={icon.small} aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索知识库或团队" aria-label="搜索知识库或团队" /></label>
      {visible.length ? <ul className="kb-tree-list" role="tree">{teams.filter(team => visible.some(item => teamOf(item) === team)).map(team => {
        const open = Boolean(keyword) || !closedTeams.includes(team);
        return <li key={team} role="treeitem" aria-expanded={open}>
          <button type="button" className="tree-row tree-team" onClick={() => toggleTeam(team)}>{open ? <ChevronDown size={icon.small} aria-hidden="true" /> : <ChevronRight size={icon.small} aria-hidden="true" />}<Folder size={icon.small} aria-hidden="true" /><span>{team}</span></button>
          {open && <ul role="group">{visible.filter(item => teamOf(item) === team).map(item => {
            const current = item.id === kb.id;
            return <li key={item.id} role="treeitem" aria-expanded={current}>
              <button type="button" className={`tree-row tree-kb ${current ? 'current' : ''}`} onClick={() => selectKb(item.id)}><BookOpen size={icon.small} aria-hidden="true" /><span>{item.name}</span><small>{item.versions.length}</small></button>
              {current && <ul role="group">{item.versions.map(v => <li key={v.id} role="treeitem" aria-selected={v.id === version.id}>
                <button type="button" className={`tree-row tree-version ${v.id === version.id ? 'selected' : ''}`} onClick={() => setVersionId(v.id)}><code>{v.id}</code><small>{useLabel(item.name, v.id)}</small></button></li>)}</ul>}
            </li>;
          })}</ul>}
        </li>;
      })}</ul> : <p className="meta kb-tree-empty">没有匹配「{keyword}」的知识库</p>}
    </aside>
    <label className="kb-select field-label">知识库与版本<span className="select-field"><select value={`${kb.id}|${version.id}`} onChange={event => { const [id, vid] = event.target.value.split('|'); selectKb(id, vid); }}>
      {teams.map(team => <optgroup key={team} label={team}>{knowledgeBases.filter(item => teamOf(item) === team).flatMap(item => item.versions.map(v => <option key={`${item.id}|${v.id}`} value={`${item.id}|${v.id}`}>{item.name} · {v.id}（{useLabel(item.name, v.id)}）</option>))}</optgroup>)}
    </select><ChevronDown size={icon.small} aria-hidden="true" /></span></label>

    <div className="kb-main">
      <Card className="kb-summary"><div className="kb-summary-head"><div><span className="eyebrow">{teamOf(kb)}</span><h2>{kb.name}</h2><p>{kb.description}</p><p className="meta">负责人 {kb.owner.split(' · ')[1] ?? kb.owner} · {kb.versions.length} 个版本 · 最新 {latest.id}（{latest.publishedAt} 发布）</p></div>
        {!draft && <span data-demo="kb-new-version"><Button onClick={startDraft}><FilePlus2 size={icon.small} />基于 {latest.id} 新建版本 {nextKbVersion(latest.id)}</Button></span>}</div></Card>
      <Capability title={`${version.id} · 条目与生效期`} description="每条知识带生效 / 失效时间；已失效条款仍保留在旧版本里，便于回溯当时的回答依据。">
        <p className="meta">{version.note ? `版本说明：${version.note} · ` : ''}被引用：{usedBy.length ? usedBy.join('、') : '暂无 Agent 版本引用'}{latest.id === version.id && !usedBy.length ? '（引用旧版本的 Agent 会在构建页看到「依赖已变化」提醒）' : ''}</p>
        <div className="table-scroll"><table className="data-table entry-table"><thead><tr><th className="col-entry">知识条目</th><th className="col-time">生效时间</th><th className="col-time">失效时间</th><th className="col-state">状态</th><th className="col-used">所属版本</th></tr></thead>
          <tbody>{entries.map(entry => <tr key={entry.title}><td><span className="truncate" title={entry.title}>{entry.title}</span></td><td className="nowrap">{entry.from}</td><td className="nowrap">{entry.to ?? '长期有效'}</td><td><StatusBadge status={entryTone[entryStatus(entry)]} /> <span className="meta">{entryStatus(entry)}</span></td><td><span className="truncate" title={entry.versions.join('、')}>{entry.versions.join('、')}</span></td></tr>)}</tbody></table></div>
      </Capability>

      {draft && draft.kbId === kb.id && <KbDraftEditor draft={draft} onPublished={setVersionId} />}
      {draft && draft.kbId !== kb.id && <p className="meta">另有一个「{knowledgeBases.find(item => item.id === draft.kbId)?.name}」的新版本草稿未发布。</p>}
      <Phase2Row items={[
        { title: '增量自动同步', description: '从业务知识源定时同步变更，自动生成新版本草稿。' },
        { title: '跨团队共享知识库', description: '其他团队申请只读引用，按版本计费和审计。' },
      ]} />
    </div>
  </div>
    {creating && <KnowledgeCreate onClose={() => setCreating(false)} onCreated={onCreated} />}</>;
}

const chunkOptions = ['按标题层级', '按段落', '固定长度'];
const effectOptions = ['版本发布即生效', '按文档里的生效日期'];
/** 新建知识库：上传文档解析后直接发布 v1（还没有 Agent 引用，之后的修改走版本草稿） */
/** 构建页「添加知识库 → 上传文档」也复用这里：defaults 预填团队和负责人，onCreated 同时给出「名称 v1」供挂到草稿 */
export function KnowledgeCreate({ onClose, onCreated, defaults }: { onClose: () => void; onCreated: (id: string, label: string) => void; defaults?: { team: string; owner: string } }) {
  const { state, createKnowledgeBase } = useDemo();
  const [name, setName] = useState('');
  const [team, setTeam] = useState(defaults?.team ?? teamOptions[0]);
  const [owner, setOwner] = useState(defaults?.owner ?? '');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('本团队');
  const [source, setSource] = useState('上传文档');
  const [files, setFiles] = useState<string[]>([]);
  const [chunk, setChunk] = useState(chunkOptions[0]);
  const [effect, setEffect] = useState(effectOptions[0]);
  const fileRef = useRef<HTMLInputElement>(null);
  const existing = knowledgeBasesFor(state);
  const missing = !name.trim() ? '填写知识库名称' : existing.some(kb => kb.name === name.trim()) ? '已有同名知识库' : !owner.trim() ? '填写负责人' : !files.length ? '先上传文档' : undefined;
  const submit = () => {
    const at = nowStamp();
    const id = `kb-${Object.keys(state.knowledge).length + 1}-${existing.length + 1}`;
    const titles = files.flatMap(file => [`《${file.replace(/\.[^.]+$/, '')}》第 1 章`, `《${file.replace(/\.[^.]+$/, '')}》第 2 章`]);
    const kb: KnowledgeBase = { id, name: name.trim(), owner: `${team} · ${owner.trim()}`, description: description.trim() || `${team}的知识库`,
      versions: [{ id: 'v1', publishedAt: at, usedBy: [], note: `由 ${files.length} 份文档解析生成（${chunk}）` }],
      entries: titles.map(title => ({ title, versions: ['v1'], from: at, to: null })) };
    createKnowledgeBase(kb);
    onCreated(id, `${kb.name} v1`);
  };
  return <Drawer label="新建知识库" eyebrow="资产中心 · 知识库" title="新建知识库" onClose={onClose} demo="kb-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : '文档解析后生成 v1；之后的修改通过「基于 v1 新建版本」进行'}</span><Button onClick={onClose}>取消</Button><Button variant="primary" disabled={Boolean(missing)} onClick={submit}>创建并发布 v1</Button></>}>
    <FormSection index={1} title="基本信息">
      <FormGrid>
        <Field label="知识库名称" required><input aria-label="知识库名称" value={name} onChange={event => setName(event.target.value)} placeholder="例如 售后知识 · 海外站" /></Field>
        <Field label="所属团队" required><SelectInput label="所属团队" value={team} options={teamOptions} onChange={setTeam} /></Field>
        <Field label="负责人" required><input aria-label="负责人" value={owner} onChange={event => setOwner(event.target.value)} placeholder="例如 王宁" /></Field>
        <Field label="可见范围" hint="其他团队引用需要申请"><SelectInput label="可见范围" value={visibility} options={visibilityOptions} onChange={setVisibility} /></Field>
      </FormGrid>
      <Field label="描述" wide><input aria-label="描述" value={description} onChange={event => setDescription(event.target.value)} placeholder="例如 海外站退换货、关税与跨境物流政策" /></Field>
    </FormSection>
    <FormSection index={2} title="内容来源">
      <Chips label="内容来源" options={['上传文档', '公司文档空间同步', '数据表导入']} value={[source]} single onChange={value => setSource(value[0])} />
      {source === '上传文档' ? <><div className="upload-row"><input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.md,.txt" hidden onChange={event => setFiles(Array.from(event.target.files ?? []).map(file => file.name))} />
        <Button onClick={() => fileRef.current?.click()}><FileUp size={icon.small} />选择文档</Button><Button onClick={() => setFiles(['海外退货政策-2026.pdf', '关税说明.md'])}>使用示例文档</Button></div>
        {files.length > 0 && <MiniTable head={['文档', '解析结果']} rows={files.map(file => [file, '解析成功 · 预计 2 个条目（演示数据）'])} />}</>
        : <ResultBox tone="info">{source}需要对应平台授权，演示中请用「上传文档」。</ResultBox>}
    </FormSection>
    <FormSection index={3} title="处理方式" hint="向量化由平台统一处理，无需选择模型。">
      <FormGrid>
        <Field label="切分方式"><SelectInput label="切分方式" value={chunk} options={chunkOptions} onChange={setChunk} /></Field>
        <Field label="条目默认生效" hint="每条知识仍可单独设置生效 / 失效时间"><SelectInput label="条目默认生效" value={effect} options={effectOptions} onChange={setEffect} /></Field>
      </FormGrid>
    </FormSection>
  </Drawer>;
}
