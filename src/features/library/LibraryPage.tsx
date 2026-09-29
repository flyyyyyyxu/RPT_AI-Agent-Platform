/** 资产中心（横轴 · 平台共享）：知识库、工具、评测集、模型、Prompt 模板五个二级目录，地址为 #/assets/:tab。都带版本，登记一次，任何 Agent 引用。 */
import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, ChevronDown, ChevronRight, FilePlus2, Folder, Search, Wrench } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { datasetsFor, entryStatus, knowledgeBasesFor, nextKbVersion } from '../../core/data-access/scenarioData';
import { focusVersion } from '../../core/rules/versions';
import { Button } from '../../shared/components/Buttons';
import { IntegrationNote, StatusBadge, VersionBadge } from '../../shared/components/Badges';
import { Card } from '../../shared/components/Content';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import { assetSections, modelLocks, modelOptions, promptTemplates, toolCatalog, type AssetSectionId } from '../../data';
import type { KnowledgeBase } from '../../types/domain';
import { entryTone, KbDraftEditor } from './KbDraftEditor';
import './library.css';
import { icon } from '../../shared/styles/tokens';

const isTab = (value: string | null | undefined): value is AssetSectionId => assetSections.some(item => item.id === value);

/** 旧地址 #/assets 和 #/assets?tab=xx：跳到对应二级目录 */
export function AssetsIndex() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  return <Navigate to={`/assets/${isTab(tab) ? tab : 'knowledge'}`} replace />;
}

export function LibraryPage() {
  const { tab } = useParams();
  if (!isTab(tab)) return <Navigate to="/assets/knowledge" replace />;
  const section = assetSections.find(item => item.id === tab)!;
  return <div className="page-stack">
    <div className="page-heading"><span className="eyebrow">资产中心</span><h1>{section.label}</h1><p>{section.description}</p></div>
    {tab === 'knowledge' && <KnowledgeTab />}
    {tab === 'tools' && <ToolsTab />}
    {tab === 'evalsets' && <EvalSetsTab />}
    {tab === 'models' && <ModelsTab />}
    {tab === 'prompts' && <PromptsTab />}
  </div>;
}

const teamOf = (kb: KnowledgeBase) => kb.owner.split(' · ')[0];

/** 知识库：左侧知识库目录（团队 → 知识库 → 版本），右侧选中版本的条目与生效期。 */
function KnowledgeTab() {
  const { state, setKbDraft } = useDemo();
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

  return <div className="kb-layout">
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
  </div>;
}

function ToolsTab() {
  return <>
    <Card><div className="table-scroll"><table className="data-table"><thead><tr><th>工具</th><th>接口</th><th>负责人</th></tr></thead>
      <tbody>{toolCatalog.map(tool => <tr key={tool.name}><td><strong><Wrench size={icon.small} aria-hidden="true" /> {tool.name}</strong></td><td><code>{tool.api}</code></td><td>{tool.owner}</td></tr>)}</tbody></table></div></Card>
    <Capability title="工具版本" description="工具以「名称 + 版本」登记，接口变更必须发新版本；Agent 快照锁定所用版本。">
      <div className="table-scroll"><table className="data-table"><thead><tr><th>工具</th><th>在用版本</th><th>最新版本</th><th>被引用</th></tr></thead>
        <tbody>{toolCatalog.map(tool => <tr key={tool.name}><td>{tool.name}</td><td><VersionBadge version={tool.version} /></td><td>{tool.latest === tool.version ? <span className="meta">与在用一致</span> : <span className="warning-text"><AlertTriangle size={icon.small} aria-hidden="true" /> {tool.latest} 已发布</span>}</td><td><span className="truncate" title={tool.usedBy}>{tool.usedBy}</span></td></tr>)}</tbody></table></div>
    </Capability>
    <Phase2Row items={[
      { title: '企业级共享市场', description: '平台统一认证的技能与工具，全公司可用。' },
      { title: '团队级共享', description: '团队内沉淀的技能与工具，团队成员可复用。' },
      { title: 'MCP 协议接入', description: '按 MCP 标准自助接入外部工具，审核后进入白名单。' },
    ]} />
  </>;
}

function EvalSetsTab() {
  const { state, opsOf } = useDemo();
  const rows = state.agents.flatMap(agent => datasetsFor(agent, focusVersion(agent), opsOf(agent)).map(dataset => ({ agent, dataset })));
  const fromBadcase = rows.filter(row => row.dataset.id === 'badcase').length;
  return <>
    <Capability title="全部评测集" description={`共 ${rows.length} 个评测集，覆盖 ${new Set(rows.map(row => row.agent.id)).size} 个 Agent${fromBadcase ? `；其中 ${fromBadcase} 个来自 bad case 回流` : ''}。`}>
      <div className="table-scroll"><table className="data-table evalset-table"><thead><tr><th className="col-set">评测集</th><th className="col-owner">归属 Agent</th><th className="numeric col-count">样本数</th><th>评测维度</th><th className="col-source">来源</th><th className="col-go" aria-label="操作" /></tr></thead>
        <tbody>{rows.map(({ agent, dataset }) => <tr key={`${agent.id}-${dataset.id}`}>
          <td><strong className="truncate" title={dataset.name}>{dataset.name}</strong></td>
          <td><span className="truncate" title={`${agent.name} · ${agent.team}`}>{agent.name}<span className="meta"> · {agent.team}</span></span></td>
          <td className="numeric">{dataset.cases.length}</td>
          <td><span className="truncate" title={dataset.description}>{dataset.description}</span></td>
          <td>{dataset.id === 'badcase' ? <span className="status-badge tone-progress">bad case 回流</span> : <span className="meta">预置</span>}</td>
          <td><Link className="row-link" to={`/agents/${agent.id}/evaluation`} aria-label={`去 ${agent.name} 评测页`}><ArrowRight size={icon.small} /></Link></td>
        </tr>)}</tbody></table></div>
    </Capability>
    <Phase2Row items={[
      { title: '评测集版本对比', description: '样本增删改留痕，评测报告标注使用的评测集版本。' },
      { title: '跨团队评测集模板', description: '把「过期知识」「承诺类话术」这类通用检查沉淀成模板，新 Agent 直接套用。' },
      { title: '自动扩充样本', description: '按线上 bad case 聚类自动生成对抗样本，人工确认后入库。' },
    ]} />
  </>;
}

function ModelsTab() {
  const { state } = useDemo();
  const usedBy = (model: string) => state.agents.flatMap(agent => agent.versions.filter(item => item.config.model === model && item.status !== '历史').map(item => `${agent.name} ${item.id}`));
  return <>
    <Capability title="模型目录" description="统一经公司模型网关调用，鉴权、限流和计费由网关负责。" actions={<IntegrationNote platform="模型网关" />}>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>模型</th><th>锁定的权重版本</th><th>接入方式</th><th>被引用（非历史版本）</th></tr></thead>
        <tbody>{modelOptions.map(model => { const users = usedBy(model); const [name, channel] = model.split(' · '); return <tr key={model}>
          <td><strong>{name}</strong></td><td><code>{modelLocks[model] ?? '—'}</code></td><td>{channel}</td>
          <td><span className="truncate" title={users.join('、')}>{users.length ? users.join('、') : <span className="meta">暂无</span>}</span></td></tr>; })}</tbody></table></div>
    </Capability>
    <Phase2Row items={[
      { title: '智能路由', description: '按任务难度和成本自动选模型，需要线上数据积累。' },
      { title: '微调与蒸馏', description: '用线上高质量样本微调小模型，降低高并发场景成本。' },
    ]} />
  </>;
}

function PromptsTab() {
  return <>
    <Capability title="模板目录" description="模板有版本；Agent 套用后复制进自己的版本快照，模板后续更新不会影响已上线版本。">
      <div className="table-scroll"><table className="data-table"><thead><tr><th className="col-set">模板</th><th className="col-count">版本</th><th>结构</th><th className="col-owner">沉淀自 / 负责人</th></tr></thead>
        <tbody>{promptTemplates.map(item => <tr key={item.name}>
          <td><strong className="truncate" title={item.name}>{item.name}</strong><small className="meta truncate" title={item.scene}>{item.scene}</small></td>
          <td><VersionBadge version={item.version} /></td>
          <td><span className="truncate" title={item.structure}>{item.structure}</span></td>
          <td><span className="truncate" title={`${item.usedBy.join('、')} · ${item.owner}`}>{item.usedBy.join('、')}<span className="meta"> · {item.owner}</span></span></td></tr>)}</tbody></table></div>
    </Capability>
    <Phase2Row items={[
      { title: '模板市场', description: '跨团队发布和评分模板，按使用量推荐。' },
    ]} />
  </>;
}
