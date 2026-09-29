/**
 * 资产中心 · 工具：列表（合并版本信息）、详情抽屉、新建 / 发布新版本 / 修改当前版本。
 * 审核规则：只对本团队可见的工具保存即发布；对全公司开放（或需审批）的新工具、新版本要经过平台安全审核。
 * Agent 版本快照锁定「工具名 vX」，所以被引用的版本只能改基本信息。
 * ToolForm 也在构建页「添加工具 → 上传工具」里复用：保存后入库，已发布的直接挂到草稿。
 */
import { useState } from 'react';
import { AlertTriangle, Pencil, Plus, TestTube2, Trash2 } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { latestPublished, needsReview, nextAssetVersion, pendingVersion, refText, toolRefs } from '../../core/data-access/assets';
import { nowStamp } from '../../core/rules/clock';
import { Button } from '../../shared/components/Buttons';
import { Card } from '../../shared/components/Content';
import { Phase2Row } from '../../shared/components/Capability';
import { Drawer } from '../../shared/components/Drawer';
import { VersionBadge } from '../../shared/components/Badges';
import { dataLevelOptions, teamOptions, toolAuthOptions, visibilityOptions } from '../../data';
import type { AssetParam, AssetRecord, ToolContent } from '../../types/domain';
import { AssetHeading, AssetName, Block, Chips, EditChoice, Field, FormGrid, FormSection, KV, MiniTable, PendingBanner, ResultBox, SelectInput, Stats, type EditHow } from './assetUi';
import { icon } from '../../shared/styles/tokens';

type ToolRecord = AssetRecord<ToolContent>;
type DrawerState = { mode: 'detail'; key: string } | { mode: 'create' } | { mode: 'edit'; key: string; how: EditHow };

const blankContent: ToolContent = { endpoint: '', protocol: 'HTTP', instruction: '', auth: toolAuthOptions[0], timeout: '800ms', qps: '200', access: '只读', dataLevel: dataLevelOptions[0], callers: '', params: [{ name: '', type: 'string', required: '是', desc: '' }], sample: '' };

export function ToolsTab() {
  const { state } = useDemo();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const tools = state.assets.tools;
  const open = (key: string) => setDrawer({ mode: 'detail', key });
  const current = drawer && drawer.mode !== 'create' ? tools.find(item => item.key === drawer.key) : undefined;

  return <>
    <AssetHeading section="tools" actionLabel="新建工具" onAction={() => setDrawer({ mode: 'create' })} demo="tool-create" />
    <Card className="asset-table-card"><div className="table-scroll"><table className="data-table asset-table tools-table">
      <colgroup><col className="c-name" /><col className="c-api" /><col className="c-owner" /><col className="c-inuse" /><col className="c-latest" /><col className="c-refs" /></colgroup>
      <thead><tr><th>工具</th><th>接口</th><th>负责人</th><th>在用版本</th><th>最新版本</th><th>被引用</th></tr></thead>
      <tbody>{tools.map(tool => {
        const latest = latestPublished(tool);
        const pending = pendingVersion(tool);
        const refs = toolRefs(state, tool.name);
        const inUse = [...new Set(refs.map(ref => ref.pinned))].sort().reverse();
        const outdated = latest && inUse.length > 0 && !inUse.includes(latest.id);
        const content = (latest ?? tool.versions[0]).content;
        return <tr key={tool.key}>
          <td><AssetName onOpen={() => open(tool.key)}>{tool.name}</AssetName></td>
          <td><code className="truncate" title={content.endpoint}>{content.endpoint}</code></td>
          <td><span className="truncate" title={`${tool.team} · ${tool.owner}`}>{tool.team}<small className="meta">{tool.owner}</small></span></td>
          <td>{inUse.length ? <span className="version-list">{inUse.map(id => <VersionBadge key={id} version={id} />)}</span> : <span className="meta">—</span>}</td>
          <td><span className="version-list">{latest ? outdated ? <span className="warning-text nowrap"><AlertTriangle size={icon.small} aria-hidden="true" /> {latest.id} 已发布</span> : <VersionBadge version={latest.id} /> : null}
            {pending && <span className="status-badge tone-warning">{pending.id} 审核中</span>}</span></td>
          <td><span className="truncate" title={refText(refs)}>{refs.length ? refText(refs) : <span className="meta">暂无引用</span>}</span></td>
        </tr>;
      })}</tbody></table></div></Card>
    <Phase2Row items={[
      { title: 'MCP 协议接入', description: '按 MCP 标准自助接入外部工具，审核后进入白名单。' },
      { title: '工具调用计费', description: '按调用量向工具提供方结算，纳入团队成本。' },
    ]} />
    {drawer?.mode === 'detail' && current && <ToolDetail tool={current} onClose={() => setDrawer(null)} onEdit={how => setDrawer({ mode: 'edit', key: current.key, how })} />}
    {drawer?.mode === 'create' && <ToolForm onClose={() => setDrawer(null)} onSaved={open} />}
    {drawer?.mode === 'edit' && current && <ToolForm tool={current} how={drawer.how} onClose={() => open(current.key)} onSaved={open} />}
  </>;
}

function ToolDetail({ tool, onClose, onEdit }: { tool: ToolRecord; onClose: () => void; onEdit: (how: EditHow) => void }) {
  const { state, saveAsset } = useDemo();
  const [choosing, setChoosing] = useState(false);
  const [tested, setTested] = useState(false);
  const latest = latestPublished(tool);
  const pending = pendingVersion(tool);
  const shown = latest ?? tool.versions[0];
  const refs = toolRefs(state, tool.name);
  const latestRefs = refs.filter(ref => ref.pinned === shown.id);
  const approve = () => saveAsset('tools', { ...tool, versions: tool.versions.map(item => item.status === '审核中' ? { ...item, status: '已发布', note: `${item.note}（平台安全审核通过）` } : item) });
  const withdraw = latest ? () => saveAsset('tools', { ...tool, versions: tool.versions.filter(item => item.status !== '审核中') }) : undefined;
  const c = shown.content;
  return <Drawer label={`工具 ${tool.name}`} eyebrow={`资产中心 · 工具 · ${tool.team}`} title={<>{tool.name}<VersionBadge version={shown.id} />{latest ? <span className="status-badge tone-success">已上线</span> : <span className="status-badge tone-warning">审核中</span>}</>}
    meta={<><code>{c.endpoint}</code> · {c.protocol} · {c.access} · 负责人 {tool.owner}</>} onClose={onClose} demo="tool-detail"
    footer={!choosing && <><Button onClick={() => setChoosing(true)}><Pencil size={icon.small} />修改</Button><Button onClick={() => setTested(true)}><TestTube2 size={icon.small} />测试调用</Button><Button variant="primary" onClick={onClose}>关闭</Button></>}>
    {pending && latest && <PendingBanner version={pending.id} reviewer="平台安全" onApprove={approve} onWithdraw={withdraw} />}
    {pending && !latest && <PendingBanner version={pending.id} reviewer="平台安全" onApprove={approve} />}
    {choosing && <EditChoice current={shown.id} next={nextAssetVersion(tool.versions[0].id)} refs={refText(latestRefs)} pending={pending?.id} reviewNote={needsReview(tool.visibility) ? '对全公司开放的工具，新版本需要平台安全审核。' : '仅本团队可见，保存即发布。'} onCancel={() => setChoosing(false)} onChoose={onEdit} />}
    {tested && <ResultBox>测试调用 {c.sample || `${c.params[0]?.name ?? 'input'}=示例值 → 200 · 92ms`}（演示数据）</ResultBox>}
    <Stats items={[['最新版本', latest?.id ?? '—'], ['在用版本', [...new Set(refs.map(ref => ref.pinned))].join('、') || '—'], ['被引用', `${refs.length} 个 Agent 版本`], ['超时 / QPS', `${c.timeout} / ${c.qps}`]]} />
    <Block title="调用说明（模型据此决定何时调用）"><p className="asset-quote">{c.instruction}</p></Block>
    <Block title="参数"><MiniTable head={['字段', '类型', '必填', '说明']} rows={c.params.map(item => [<code>{item.name}</code>, item.type, item.required, item.desc])} /></Block>
    <Block title="安全与限制"><KV items={[['读写类型', c.access], ['数据等级', c.dataLevel], ['可调用团队', c.callers || '全公司'], ['鉴权', c.auth], ['可见范围', tool.visibility]]} /></Block>
    <Block title="版本历史"><MiniTable head={['版本', '时间', '状态', '说明']} rows={tool.versions.map(item => [<VersionBadge version={item.id} />, item.at, item.status, item.note])} /></Block>
    <Block title="被引用"><MiniTable head={['Agent', '版本', '锁定工具版本']} empty="还没有 Agent 版本引用这个工具" rows={refs.map(ref => [ref.agent.name, ref.version.id, ref.pinned])} /></Block>
  </Drawer>;
}

export function ToolForm({ tool, how, defaults, onClose, onSaved }: { tool?: ToolRecord; how?: EditHow; defaults?: { team: string; owner: string; visibility: string }; onClose: () => void; onSaved: (key: string, status: '已发布' | '审核中') => void }) {
  const { state, saveAsset } = useDemo();
  const base = tool ? (latestPublished(tool) ?? tool.versions[0]) : null;
  const next = tool ? nextAssetVersion(tool.versions[0].id) : 'v1';
  const refs = tool && base ? toolRefs(state, tool.name).filter(ref => ref.pinned === base.id) : [];
  const lockReason = how === 'in-place' && refs.length ? `${base!.id} 已被 ${refText(refs)} 引用，改这里会改变线上行为；请发布新版本` : undefined;
  const [name, setName] = useState(tool?.name ?? '');
  const [team, setTeam] = useState(tool?.team ?? defaults?.team ?? teamOptions[0]);
  const [owner, setOwner] = useState(tool?.owner ?? defaults?.owner ?? '');
  const [description, setDescription] = useState(tool?.description ?? '');
  const [visibility, setVisibility] = useState(tool?.visibility ?? defaults?.visibility ?? visibilityOptions[0]);
  const [content, setContent] = useState<ToolContent>(structuredClone(base?.content ?? blankContent));
  const [note, setNote] = useState('');
  const [tested, setTested] = useState(false);
  const patch = (value: Partial<ToolContent>) => { setContent(current => ({ ...current, ...value })); setTested(false); };
  const setParam = (index: number, value: Partial<AssetParam>) => patch({ params: content.params.map((item, i) => i === index ? { ...item, ...value } : item) });
  const mode = !tool ? 'create' : how!;
  const needsTest = mode !== 'in-place' || !lockReason;
  const missing = !name.trim() ? '填写工具名称' : !tool && state.assets.tools.some(item => item.key === name.trim()) ? '已有同名工具，请换一个名称或在该工具上发布新版本'
    : !content.endpoint.trim() ? '填写接口标识' : !content.instruction.trim() ? '填写调用说明' : !owner.trim() ? '填写负责人'
    : mode === 'new-version' && !note.trim() ? '填写版本说明' : needsTest && !tested ? '先测试调用，确认接口可用' : undefined;
  const review = needsReview(visibility);
  const status = review ? '审核中' as const : '已发布' as const;
  const submit = () => {
    const at = nowStamp();
    const meta = { team, owner: owner.trim(), description: description.trim(), visibility };
    if (mode === 'create') saveAsset('tools', { key: name.trim(), name: name.trim(), ...meta, created: true, versions: [{ id: 'v1', status, at, by: owner.trim(), note: note.trim() || '新建工具', content }] });
    else if (mode === 'new-version') saveAsset('tools', { ...tool!, ...meta, versions: [{ id: next, status, at, by: owner.trim(), note: note.trim(), content }, ...tool!.versions] });
    else saveAsset('tools', { ...tool!, ...meta, versions: tool!.versions.map(item => item.id === base!.id && !lockReason ? { ...item, content } : item) });
    onSaved(tool?.key ?? name.trim(), mode === 'in-place' ? '已发布' : status);
  };
  const title = mode === 'create' ? '新建工具' : mode === 'new-version' ? `发布新版本 · ${tool!.name} ${next}` : `修改 · ${tool!.name} ${base!.id}`;
  const footNote = mode === 'create' ? (review ? '对全公司开放：提交后由平台安全审核，通过后以 v1 上线' : '仅本团队可见：保存即发布 v1') : mode === 'new-version' ? (review ? `提交后 ${next} 进入审核；${base!.id} 照常可用` : `仅本团队可见：保存即发布 ${next}`) : lockReason ? '只保存基本信息，不产生新版本' : `直接修改 ${base!.id}，不产生新版本`;
  const L = lockReason;
  return <Drawer label={title} eyebrow="资产中心 · 工具" title={title} onClose={onClose} demo="tool-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : footNote}</span><Button onClick={onClose}>取消</Button>{needsTest && <Button onClick={() => setTested(true)}><TestTube2 size={icon.small} />测试调用</Button>}
      <Button variant="primary" disabled={Boolean(missing)} onClick={submit}>{mode === 'in-place' ? '保存修改' : review ? '提交审核' : `发布 ${next}`}</Button></>}>
    {L && <ResultBox tone="warn">{L}</ResultBox>}
    <FormSection index={1} title="基本信息">
      <FormGrid>
        <Field label="工具名称" required locked={tool ? '名称是 Agent 引用工具的标识，创建后不能修改' : undefined}><input aria-label="工具名称" value={name} disabled={Boolean(tool)} onChange={event => setName(event.target.value)} placeholder="例如 退款进度查询" /></Field>
        <Field label="接口标识" required locked={Boolean(L)}><input aria-label="接口标识" value={content.endpoint} disabled={Boolean(L)} onChange={event => patch({ endpoint: event.target.value })} placeholder="例如 refund.progress.get" /></Field>
        <Field label="所属团队"><SelectInput label="所属团队" value={team} options={teamOptions.includes(team) ? teamOptions : [team, ...teamOptions]} onChange={setTeam} /></Field>
        <Field label="负责人" required><input aria-label="负责人" value={owner} onChange={event => setOwner(event.target.value)} placeholder="例如 王宁" /></Field>
      </FormGrid>
      <Field label="描述" wide><input aria-label="描述" value={description} onChange={event => setDescription(event.target.value)} placeholder="一句话说明工具能做什么" /></Field>
      <Field label="调用说明（给模型看）" required wide locked={Boolean(L)} hint="模型根据这段说明决定是否调用，写清适用和不适用的场景。"><textarea aria-label="调用说明" rows={3} value={content.instruction} disabled={Boolean(L)} onChange={event => patch({ instruction: event.target.value })} /></Field>
    </FormSection>
    <FormSection index={2} title="接口">
      <Chips label="协议" options={['HTTP', '内部 RPC']} value={[content.protocol]} single disabled={Boolean(L)} onChange={value => patch({ protocol: value[0] as ToolContent['protocol'] })} />
      <FormGrid>
        <Field label="鉴权" locked={Boolean(L)}><SelectInput label="鉴权" value={content.auth} options={toolAuthOptions} disabled={Boolean(L)} onChange={value => patch({ auth: value })} /></Field>
        <Field label="超时" locked={Boolean(L)}><input aria-label="超时" value={content.timeout} disabled={Boolean(L)} onChange={event => patch({ timeout: event.target.value })} /></Field>
        <Field label="限流（QPS）" locked={Boolean(L)}><input aria-label="限流" value={content.qps} disabled={Boolean(L)} onChange={event => patch({ qps: event.target.value })} /></Field>
      </FormGrid>
    </FormSection>
    <FormSection index={3} title="参数" hint="出参字段以「→」开头；平台注入的参数（如当前用户）不需要模型填写。">
      <div className="param-editor">{content.params.map((item, index) => <div className="param-row" key={index}>
        <input aria-label="字段名" value={item.name} disabled={Boolean(L)} onChange={event => setParam(index, { name: event.target.value })} placeholder="字段名" />
        <input aria-label="类型" value={item.type} disabled={Boolean(L)} onChange={event => setParam(index, { type: event.target.value })} placeholder="类型" />
        <SelectInput label="必填" value={item.required} options={['是', '否', '平台注入', '—']} disabled={Boolean(L)} onChange={value => setParam(index, { required: value })} />
        <input aria-label="说明" value={item.desc} disabled={Boolean(L)} onChange={event => setParam(index, { desc: event.target.value })} placeholder="说明" />
        <button type="button" className="icon-button" disabled={Boolean(L) || content.params.length === 1} onClick={() => patch({ params: content.params.filter((_, i) => i !== index) })} aria-label="删除参数"><Trash2 size={icon.small} /></button>
      </div>)}</div>
      {!L && <Button onClick={() => patch({ params: [...content.params, { name: '', type: 'string', required: '否', desc: '' }] })}><Plus size={icon.small} />添加参数</Button>}
    </FormSection>
    <FormSection index={4} title="权限与安全">
      <Chips label="读写类型" options={['只读', '写操作']} value={[content.access]} single disabled={Boolean(L)} onChange={value => patch({ access: value[0] as ToolContent['access'] })} />
      {content.access === '写操作' && <ResultBox tone="warn">写操作工具（如退款、改地址）上线需要业务负责人和平台安全共同审批，并在 Agent 设置里开启人工确认。</ResultBox>}
      <FormGrid>
        <Field label="数据等级" locked={Boolean(L)}><SelectInput label="数据等级" value={content.dataLevel} options={dataLevelOptions} disabled={Boolean(L)} onChange={value => patch({ dataLevel: value })} /></Field>
        <Field label="可调用团队" hint="留空表示全公司"><input aria-label="可调用团队" value={content.callers} onChange={event => setContent(current => ({ ...current, callers: event.target.value }))} placeholder="例如 客户服务" /></Field>
        <Field label="可见范围" hint="仅本团队可见时保存即发布；对全公司开放需平台审核"><SelectInput label="可见范围" value={visibility} options={visibilityOptions.includes(visibility) ? visibilityOptions : [visibility, ...visibilityOptions]} onChange={setVisibility} /></Field>
      </FormGrid>
    </FormSection>
    {mode !== 'in-place' && <FormSection index={5} title="版本说明"><Field label="这次改了什么" required={mode === 'new-version'} wide><input aria-label="版本说明" value={note} onChange={event => setNote(event.target.value)} placeholder={mode === 'create' ? '选填，例如 初始版本' : '例如 新增退款原因字段'} /></Field></FormSection>}
    {needsTest && <FormSection index={mode === 'in-place' ? 5 : 6} title="测试调用">{tested ? <ResultBox>{content.params[0]?.name || 'input'}=示例值 → 200 · 92ms · 返回结构与出参定义一致（演示数据）</ResultBox> : <p className="meta">点底部「测试调用」，用示例参数请求一次接口；通过后才能提交。</p>}</FormSection>}
  </Drawer>;
}
