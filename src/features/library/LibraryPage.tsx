/** 资产中心（横轴 · 平台共享）：知识库、工具、评测集、模型、Prompt 模板。都带版本，登记一次，任何 Agent 引用。 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, FilePlus2, Wrench } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { datasetsFor, entryStatus, knowledgeBasesFor, nextKbVersion } from '../../core/data-access/scenarioData';
import { focusVersion } from '../../core/rules/versions';
import { Button } from '../../shared/components/Buttons';
import { IntegrationNote, StatusBadge, VersionBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import { modelLocks, modelOptions, promptTemplates, toolCatalog } from '../../data';
import { entryTone, KbDraftEditor } from './KbDraftEditor';
import './library.css';
import { icon } from '../../shared/styles/tokens';

type AssetTab = 'knowledge' | 'tools' | 'evalsets' | 'models' | 'prompts';
const isTab = (value: string | null): value is AssetTab => ['knowledge', 'tools', 'evalsets', 'models', 'prompts'].includes(value ?? '');

export function LibraryPage() {
  const { state, opsOf } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: AssetTab = isTab(requested) ? requested : 'knowledge';
  const knowledgeBases = knowledgeBasesFor(state);
  const evalRows = state.agents.flatMap(agent => datasetsFor(agent, focusVersion(agent), opsOf(agent)).map(dataset => ({ agent, dataset })));
  const tabs: { id: AssetTab; label: string; count: number }[] = [
    { id: 'knowledge', label: '知识库', count: knowledgeBases.length },
    { id: 'tools', label: '工具', count: toolCatalog.length },
    { id: 'evalsets', label: '评测集', count: evalRows.length },
    { id: 'models', label: '模型', count: modelOptions.length },
    { id: 'prompts', label: 'Prompt 模板', count: promptTemplates.length },
  ];

  return <div className="page-stack">
    <div className="page-heading"><span className="eyebrow">平台共享 · 跨 Agent</span><h1>资产中心</h1><p>知识、工具、评测集、模型和 Prompt 模板都带版本，在这里登记一次，任何 Agent 在构建页和评测页直接引用；一个团队沉淀的资产，下一个团队可以复用。</p></div>
    <div className="chart-tabs asset-tabs" role="tablist" aria-label="资产类型">{tabs.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setSearchParams(item.id === 'knowledge' ? {} : { tab: item.id }, { replace: true })}>{item.label}<span className="asset-count">{item.count}</span></button>)}</div>
    {tab === 'knowledge' && <KnowledgeTab />}
    {tab === 'tools' && <ToolsTab />}
    {tab === 'evalsets' && <EvalSetsTab rows={evalRows} />}
    {tab === 'models' && <ModelsTab />}
    {tab === 'prompts' && <PromptsTab />}
  </div>;
}

function KnowledgeTab() {
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

  return <>
    <SectionHeading eyebrow="知识库" title="知识库" description="选择一个知识库查看内容。" />
    <Card><div className="kb-cards" role="radiogroup" aria-label="知识库">{knowledgeBases.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === kb.id} className={`kb-card ${item.id === kb.id ? 'selected' : ''}`} onClick={() => selectKb(item.id)}>
      <strong><BookOpen size={icon.small} aria-hidden="true" /> {item.name}</strong><small>{item.description}</small><small>{item.owner} · {item.versions.length} 个版本</small></button>)}</div>
    </Card>

    <SectionHeading eyebrow="版本管理" title="知识的版本与生效期" description="知识、工具和 Prompt 一样有版本；Agent 版本快照只引用具体版本，上游更新不会改变线上行为。" />
    <Capability title={`${kb.name} · 版本与生效期`} description="每条知识带生效 / 失效时间；已失效条款仍保留在旧版本里，便于回溯当时的回答依据。"
      actions={!draft && <span data-demo="kb-new-version"><Button onClick={startDraft}><FilePlus2 size={icon.small} />基于 {latest.id} 新建版本 {nextKbVersion(latest.id)}</Button></span>}>
      <div className="version-chips" role="radiogroup" aria-label="知识库版本">{kb.versions.map(item => <button key={item.id} type="button" role="radio" aria-checked={item.id === version.id} className={item.id === version.id ? 'selected' : ''} onClick={() => setVersionId(item.id)}>{item.id}<small>{item.publishedAt} 发布</small></button>)}</div>
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
  </>;
}

function ToolsTab() {
  return <>
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
      { title: 'MCP 协议接入', description: '按 MCP 标准自助接入外部工具，审核后进入白名单。' },
    ]} />
  </>;
}

type EvalRow = { agent: { id: string; name: string; team: string }; dataset: { id: string; name: string; description: string; cases: unknown[] } };
function EvalSetsTab({ rows }: { rows: EvalRow[] }) {
  const fromBadcase = rows.filter(row => row.dataset.id === 'badcase').length;
  return <>
    <SectionHeading eyebrow="评测集" title="评测集" description="每个 Agent 的评测页从这里选评测集；bad case 工作台加入的样本会汇成「bad case 回归集」，下一轮评测自动带上。" />
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
    <SectionHeading eyebrow="模型" title="已批准模型" description="只有登记在这里的模型可以被 Agent 选用；版本快照锁定具体权重，模型升级需要新建候选版本并重新评测。" />
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
    <SectionHeading eyebrow="Prompt 模板" title="Prompt 模板" description="从已上线 Agent 中沉淀的 Prompt 结构，新建 Agent 时套用，再按业务改写。" />
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
