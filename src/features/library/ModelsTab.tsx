/**
 * 资产中心 · 模型：列表按「选模型时关心什么」展示；详情、接入新模型、接入新权重版本、修改规格信息。
 * 模型的版本号就是权重版本；新权重需要模型平台组审批，Agent 升级前要重新评测。
 */
import { useState } from 'react';
import { Pencil, Radio } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { latestPublished, modelRefs, pendingVersion, refText } from '../../core/data-access/assets';
import { nowStamp } from '../../core/rules/clock';
import { Button } from '../../shared/components/Buttons';
import { Card } from '../../shared/components/Content';
import { Phase2Row } from '../../shared/components/Capability';
import { Drawer } from '../../shared/components/Drawer';
import { IntegrationNote } from '../../shared/components/Badges';
import { dataLevelOptions, modelCapabilityOptions, modelChannels, teamOptions, visibilityOptions } from '../../data';
import type { AssetRecord, ModelContent } from '../../types/domain';
import { AssetHeading, AssetName, Block, Chips, EditChoice, Field, FormGrid, FormSection, KV, MiniTable, PendingBanner, ResultBox, SelectInput, Stats, type EditHow } from './assetUi';
import { icon } from '../../shared/styles/tokens';

type ModelRecord = AssetRecord<ModelContent>;
type DrawerState = { mode: 'detail'; key: string } | { mode: 'create' } | { mode: 'edit'; key: string; how: EditHow };
const EXTERNAL_LEVEL = '仅内部数据 · 需审批';
const levelTone = (level: string) => level.startsWith('可处理') ? 'tone-success' : 'tone-warning';
const agentsOf = (refs: ReturnType<typeof modelRefs>) => [...new Set(refs.map(ref => ref.agent.name))];

export function ModelsTab() {
  const { state } = useDemo();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const models = state.assets.models;
  const open = (key: string) => setDrawer({ mode: 'detail', key });
  const current = drawer && drawer.mode !== 'create' ? models.find(item => item.key === drawer.key) : undefined;
  return <>
    <AssetHeading section="models" actionLabel="接入新模型" onAction={() => setDrawer({ mode: 'create' })} demo="model-create" />
    <Card className="asset-table-card"><div className="table-scroll"><table className="data-table asset-table models-table">
      <colgroup><col className="c-name" /><col className="c-cap" /><col className="c-ctx" /><col className="c-price" /><col className="c-p95" /><col className="c-level" /><col className="c-agents" /></colgroup>
      <thead><tr><th>模型</th><th>能力</th><th className="numeric">上下文</th><th className="numeric">单价 输入 / 输出</th><th className="numeric">首字 P95</th><th>数据等级</th><th>在用 Agent</th></tr></thead>
      <tbody>{models.map(item => {
        const latest = latestPublished(item);
        const pending = pendingVersion(item);
        const c = (latest ?? item.versions[0]).content;
        const agents = agentsOf(modelRefs(state, item.key, latest?.id ?? ''));
        return <tr key={item.key}>
          <td><AssetName onOpen={() => open(item.key)} sub={<>{item.channel} · {latest?.id ?? '未上线'}{pending && <span className="status-badge tone-warning">{pending.id} 审核中</span>}</>}>{item.name}</AssetName></td>
          <td>{c.capabilities.join(' · ')}</td>
          <td className="numeric">{c.context}</td>
          <td className="numeric">¥{c.priceIn} / ¥{c.priceOut}<small className="meta">每百万 token</small></td>
          <td className="numeric">{c.p95}</td>
          <td><span className={`status-badge ${levelTone(c.dataLevel)}`}>{c.dataLevel}</span></td>
          <td><span className="truncate" title={agents.join('、')}>{agents.length ? `${agents.length} 个` : <span className="meta">—</span>}</span></td>
        </tr>;
      })}</tbody></table></div></Card>
    <Phase2Row items={[
      { title: '智能路由', description: '按任务难度和成本自动选模型，需要线上数据积累。' },
      { title: '微调与蒸馏', description: '用线上高质量样本微调小模型，降低高并发场景成本。' },
    ]} />
    {drawer?.mode === 'detail' && current && <ModelDetail model={current} onClose={() => setDrawer(null)} onEdit={how => setDrawer({ mode: 'edit', key: current.key, how })} />}
    {drawer?.mode === 'create' && <ModelForm onClose={() => setDrawer(null)} onSaved={open} />}
    {drawer?.mode === 'edit' && current && <ModelForm model={current} how={drawer.how} onClose={() => open(current.key)} onSaved={open} />}
  </>;
}

function ModelDetail({ model, onClose, onEdit }: { model: ModelRecord; onClose: () => void; onEdit: (how: EditHow) => void }) {
  const { state, saveAsset } = useDemo();
  const [choosing, setChoosing] = useState(false);
  const [tested, setTested] = useState(false);
  const latest = latestPublished(model);
  const pending = pendingVersion(model);
  const shown = latest ?? model.versions[0];
  const refs = modelRefs(state, model.key, shown.id);
  const c = shown.content;
  const approve = () => saveAsset('models', { ...model, versions: model.versions.map(item => item.status === '审核中' ? { ...item, status: '已发布', note: `${item.note}（模型平台组审批通过）` } : item) });
  const withdraw = latest ? () => saveAsset('models', { ...model, versions: model.versions.filter(item => item.status !== '审核中') }) : undefined;
  return <Drawer label={`模型 ${model.name}`} eyebrow={`资产中心 · 模型 · ${model.channel}`} title={<>{model.name}{latest ? <span className="status-badge tone-success">可用</span> : <span className="status-badge tone-warning">审核中</span>}<span className={`status-badge ${levelTone(c.dataLevel)}`}>{c.dataLevel}</span></>}
    meta={<>权重 {shown.id} · 经公司模型网关调用 · 负责人 {model.owner}</>} onClose={onClose} demo="model-detail"
    footer={!choosing && <><Button onClick={() => setChoosing(true)}><Pencil size={icon.small} />修改</Button><Button onClick={() => setTested(true)}><Radio size={icon.small} />连通性测试</Button><Button variant="primary" onClick={onClose}>关闭</Button></>}>
    {pending && <PendingBanner version={pending.id} reviewer="模型平台组" onApprove={approve} onWithdraw={withdraw} />}
    {choosing && <EditChoice current={shown.id} next="（新权重版本）" refs={refText(refs)} pending={pending?.id} reviewNote="接入新权重需要模型平台组审批；Agent 升级前要重新评测。" onCancel={() => setChoosing(false)} onChoose={onEdit} />}
    {tested && <ResultBox>测试请求 200 · 首字 {c.p95} · 输出正常（演示数据）</ResultBox>}
    <Stats items={[['上下文', c.context], ['单价 输入 / 输出', `¥${c.priceIn} / ¥${c.priceOut}`], ['首字 P95', c.p95], ['在用 Agent', `${agentsOf(refs).length} 个`]]} />
    <Block title="能力与适用"><KV items={[['能力', c.capabilities.join(' · ')], ['说明', model.description], ['平台限流', `${c.qps} QPS · 按团队分配`]]} /></Block>
    <Block title="数据与合规" aside={<IntegrationNote platform="模型网关" />}><KV items={[['数据等级', c.dataLevel], ['可见范围', model.visibility], ['调用方式', model.channel === '公司网关' ? '经公司网关转发到外部服务，请求内容不含用户隐私' : '公司自有算力推理，数据不出公司']]} /></Block>
    <Block title="在用 Agent"><MiniTable head={['Agent', '版本', '用途']} empty="还没有 Agent 使用这个模型" rows={refs.map(ref => [ref.agent.name, ref.version.id, '主模型'])} /></Block>
    <Block title="权重版本"><MiniTable head={['版本', '时间', '状态', '说明']} rows={model.versions.map(item => [item.id, item.at, item.status, item.note])} /></Block>
  </Drawer>;
}

function ModelForm({ model, how, onClose, onSaved }: { model?: ModelRecord; how?: EditHow; onClose: () => void; onSaved: (key: string) => void }) {
  const { state, saveAsset } = useDemo();
  const base = model ? (latestPublished(model) ?? model.versions[0]) : null;
  const refs = model && base ? modelRefs(state, model.key, base.id) : [];
  const mode = !model ? 'create' : how!;
  const lockReason = mode === 'in-place' && refs.length ? `当前权重已被 ${refText(refs)} 使用，能力相关的信息不能改；换权重请接入新版本` : undefined;
  const [channel, setChannel] = useState(model?.channel ?? modelChannels[0]);
  const [name, setName] = useState(model?.name ?? '');
  const [weights, setWeights] = useState(mode === 'in-place' ? base!.id : '');
  const [team, setTeam] = useState(model?.team ?? '模型平台组');
  const [owner, setOwner] = useState(model?.owner ?? '');
  const [description, setDescription] = useState(model?.description ?? '');
  const [visibility, setVisibility] = useState(model?.visibility ?? visibilityOptions[0]);
  const [content, setContent] = useState<ModelContent>(structuredClone(base?.content ?? { capabilities: ['文本'], context: '32K', priceIn: '', priceOut: '', p95: '—', dataLevel: dataLevelOptions[0], qps: '500' }));
  const [note, setNote] = useState('');
  const [tested, setTested] = useState(false);
  const external = channel === '公司网关';
  const patch = (value: Partial<ModelContent>, behavior = true) => { setContent(current => ({ ...current, ...value })); if (behavior) setTested(false); };
  const key = `${name.trim()} · ${channel}`;
  const needsTest = mode !== 'in-place';
  const missing = !name.trim() ? '填写模型名称' : mode === 'create' && state.assets.models.some(item => item.key === key) ? '已有同名模型，请在该模型上接入新权重版本'
    : mode !== 'in-place' && !weights.trim() ? '填写权重版本' : mode === 'new-version' && model!.versions.some(item => item.id === weights.trim()) ? '这个权重版本已存在'
    : !content.priceIn || !content.priceOut ? '填写单价' : !owner.trim() ? '填写负责人' : mode === 'new-version' && !note.trim() ? '填写版本说明' : needsTest && !tested ? '先做连通性测试' : undefined;
  const submit = () => {
    const at = nowStamp();
    const finalContent = { ...content, dataLevel: external ? EXTERNAL_LEVEL : content.dataLevel };
    const meta = { team, owner: owner.trim(), description: description.trim(), visibility: external ? '需审批' : visibility };
    if (mode === 'create') saveAsset('models', { key, name: name.trim(), channel, ...meta, created: true, versions: [{ id: weights.trim(), status: '审核中', at, by: owner.trim(), note: note.trim() || '接入新模型', content: finalContent }] });
    else if (mode === 'new-version') saveAsset('models', { ...model!, ...meta, versions: [{ id: weights.trim(), status: '审核中', at, by: owner.trim(), note: note.trim(), content: finalContent }, ...model!.versions] });
    else saveAsset('models', { ...model!, ...meta, versions: model!.versions.map(item => item.id === base!.id ? { ...item, content: lockReason ? { ...item.content, priceIn: content.priceIn, priceOut: content.priceOut, qps: content.qps } : finalContent } : item) });
    onSaved(model?.key ?? key);
  };
  const title = mode === 'create' ? '接入新模型' : mode === 'new-version' ? `接入新权重版本 · ${model!.name}` : `修改 · ${model!.name} ${base!.id}`;
  const L = lockReason;
  return <Drawer label={title} eyebrow="资产中心 · 模型" title={title} onClose={onClose} demo="model-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : mode === 'in-place' ? lockReason ? '只保存价格、限流和基本信息' : `直接修改 ${base!.id} 的信息` : '审批通过后先对「原型」级 Agent 开放；评测达标后再对生产 Agent 开放'}</span><Button onClick={onClose}>取消</Button>
      {needsTest && <Button onClick={() => { setTested(true); if (content.p95 === '—') patch({ p95: '610ms' }, false); }}><Radio size={icon.small} />连通性测试</Button>}
      <Button variant="primary" disabled={Boolean(missing)} onClick={submit}>{mode === 'in-place' ? '保存修改' : '提交接入审批'}</Button></>}>
    {L && <ResultBox tone="warn">{L}</ResultBox>}
    <FormSection index={1} title="模型来源">
      <Chips label="模型来源" options={modelChannels} value={[channel]} single disabled={Boolean(model)} onChange={value => { setChannel(value[0]); setTested(false); }} />
      {external && <ResultBox tone="warn">外部商业模型经公司网关调用，只能处理内部数据，需要信息安全评审。</ResultBox>}
    </FormSection>
    <FormSection index={2} title="基本信息">
      <FormGrid>
        <Field label="模型名称" required locked={model ? 'Agent 按名称引用模型，接入后不能修改' : undefined}><input aria-label="模型名称" value={name} disabled={Boolean(model)} onChange={event => setName(event.target.value)} placeholder="例如 Qwen2.5-VL-72B" /></Field>
        <Field label="权重版本" required locked={mode === 'in-place' ? '权重版本就是模型的版本号；换权重请接入新版本' : undefined} hint={mode === 'new-version' ? `当前 ${base!.id}` : undefined}><input aria-label="权重版本" value={weights} disabled={mode === 'in-place'} onChange={event => { setWeights(event.target.value); setTested(false); }} placeholder="例如 2026-09-20" /></Field>
        <Field label="维护团队"><SelectInput label="维护团队" value={team} options={[team, ...teamOptions.filter(item => item !== team)]} onChange={setTeam} /></Field>
        <Field label="负责人" required><input aria-label="负责人" value={owner} onChange={event => setOwner(event.target.value)} placeholder="例如 韩叙" /></Field>
      </FormGrid>
      <Field label="能力" locked={Boolean(L)}><Chips label="能力" options={modelCapabilityOptions} value={content.capabilities} disabled={Boolean(L)} onChange={value => patch({ capabilities: value })} /></Field>
      <Field label="说明" wide><input aria-label="说明" value={description} onChange={event => setDescription(event.target.value)} placeholder="适合什么场景、不适合什么场景" /></Field>
    </FormSection>
    <FormSection index={3} title="规格与价格">
      <FormGrid>
        <Field label="上下文长度" locked={Boolean(L)}><input aria-label="上下文长度" value={content.context} disabled={Boolean(L)} onChange={event => patch({ context: event.target.value })} /></Field>
        <Field label="平台限流（QPS）"><input aria-label="平台限流" value={content.qps} onChange={event => patch({ qps: event.target.value }, false)} /></Field>
        <Field label="输入单价（元 / 百万 token）" required><input aria-label="输入单价" value={content.priceIn} onChange={event => patch({ priceIn: event.target.value }, false)} placeholder="例如 3" /></Field>
        <Field label="输出单价（元 / 百万 token）" required><input aria-label="输出单价" value={content.priceOut} onChange={event => patch({ priceOut: event.target.value }, false)} placeholder="例如 9" /></Field>
      </FormGrid>
    </FormSection>
    <FormSection index={4} title="数据与合规">
      <FormGrid>
        <Field label="数据等级" locked={L ? true : external ? '外部模型固定为「仅内部数据 · 需审批」' : undefined}><SelectInput label="数据等级" value={external ? EXTERNAL_LEVEL : content.dataLevel} options={external ? [EXTERNAL_LEVEL] : dataLevelOptions} disabled={Boolean(L) || external} onChange={value => patch({ dataLevel: value })} /></Field>
        <Field label="可见范围"><SelectInput label="可见范围" value={external ? '需审批' : visibility} options={visibilityOptions} disabled={external} onChange={setVisibility} /></Field>
      </FormGrid>
    </FormSection>
    {mode !== 'in-place' && <FormSection index={5} title="版本说明"><Field label="这次接入 / 升级的原因" required={mode === 'new-version'} wide><input aria-label="版本说明" value={note} onChange={event => setNote(event.target.value)} placeholder="例如 多模态能力，支撑图片理解" /></Field></FormSection>}
    {needsTest && <FormSection index={6} title="连通性测试">{tested ? <ResultBox>测试请求 200 · 首字 {content.p95 === '—' ? '610ms' : content.p95} · 输出正常（演示数据）</ResultBox> : <p className="meta">点底部「连通性测试」，发一条测试请求；通过后才能提交审批。</p>}</FormSection>}
  </Drawer>;
}
