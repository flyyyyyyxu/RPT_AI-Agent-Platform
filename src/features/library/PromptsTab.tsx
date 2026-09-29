/**
 * 资产中心 · Prompt 模板：列表保持「模板 · 版本 · 结构 · 沉淀自 / 负责人」；类型、变量、正文放在详情和新建里。
 * 模板保存即发布；已被 Agent 套用的版本只能改基本信息，正文和变量要发新版本。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Play } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { latestPublished, nextAssetVersion } from '../../core/data-access/assets';
import { nowStamp } from '../../core/rules/clock';
import { Button } from '../../shared/components/Buttons';
import { Card } from '../../shared/components/Content';
import { Phase2Row } from '../../shared/components/Capability';
import { Drawer } from '../../shared/components/Drawer';
import { VersionBadge } from '../../shared/components/Badges';
import { promptKinds, teamOptions, visibilityOptions } from '../../data';
import type { AssetRecord, PromptContent, PromptVariable } from '../../types/domain';
import { AssetHeading, AssetName, Block, Chips, EditChoice, Field, FormGrid, FormSection, KV, MiniTable, ResultBox, SelectInput, Stats, type EditHow } from './assetUi';
import { icon } from '../../shared/styles/tokens';

type PromptRecord = AssetRecord<PromptContent>;
type DrawerState = { mode: 'detail'; key: string } | { mode: 'create' } | { mode: 'edit'; key: string; how: EditHow };
const variableSources = ['用户输入', '平台注入', '套用时填写'];
const detectVariables = (body: string) => [...new Set([...body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(match => match[1]))];

export function PromptsTab() {
  const { state } = useDemo();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const prompts = state.assets.prompts;
  const open = (key: string) => setDrawer({ mode: 'detail', key });
  const current = drawer && drawer.mode !== 'create' ? prompts.find(item => item.key === drawer.key) : undefined;
  return <>
    <AssetHeading section="prompts" actionLabel="新建 Prompt 模板" onAction={() => setDrawer({ mode: 'create' })} demo="prompt-create" />
    <Card className="asset-table-card"><div className="table-scroll"><table className="data-table asset-table prompts-table">
      <colgroup><col className="c-name" /><col className="c-ver" /><col className="c-structure" /><col className="c-owner" /></colgroup>
      <thead><tr><th>模板</th><th>版本</th><th>结构</th><th>沉淀自 / 负责人</th></tr></thead>
      <tbody>{prompts.map(item => { const latest = latestPublished(item) ?? item.versions[0]; return <tr key={item.key}>
        <td><AssetName onOpen={() => open(item.key)} sub={latest.content.scene}>{item.name}</AssetName></td>
        <td><VersionBadge version={latest.id} /></td>
        <td><span className="truncate" title={latest.content.structure}>{latest.content.structure}</span></td>
        <td><span className="truncate" title={`${(item.usedBy ?? []).join('、')} · ${item.owner}`}>{item.usedBy?.length ? item.usedBy.join('、') : <span className="meta">通用模板</span>}<small className="meta">{item.owner}</small></span></td>
      </tr>; })}</tbody></table></div></Card>
    <Phase2Row items={[{ title: '模板市场', description: '跨团队发布和评分模板，按使用量推荐。' }]} />
    {drawer?.mode === 'detail' && current && <PromptDetail prompt={current} onClose={() => setDrawer(null)} onEdit={how => setDrawer({ mode: 'edit', key: current.key, how })} />}
    {drawer?.mode === 'create' && <PromptForm onClose={() => setDrawer(null)} onSaved={open} />}
    {drawer?.mode === 'edit' && current && <PromptForm prompt={current} how={drawer.how} onClose={() => open(current.key)} onSaved={open} />}
  </>;
}

function PromptDetail({ prompt, onClose, onEdit }: { prompt: PromptRecord; onClose: () => void; onEdit: (how: EditHow) => void }) {
  const [choosing, setChoosing] = useState(false);
  const latest = latestPublished(prompt) ?? prompt.versions[0];
  const c = latest.content;
  const usedBy = prompt.usedBy ?? [];
  return <Drawer label={`Prompt 模板 ${prompt.name}`} eyebrow={`资产中心 · Prompt 模板 · ${prompt.team}`} title={<>{prompt.name}<VersionBadge version={latest.id} /></>}
    meta={<>类型：{c.kind} · 适用：{c.scene} · 更新 {latest.at}</>} onClose={onClose} demo="prompt-detail"
    footer={!choosing && <><Button onClick={() => setChoosing(true)}><Pencil size={icon.small} />修改</Button><Link className="button button-primary" to="/agents/new">套用到新 Agent</Link></>}>
    {choosing && <EditChoice current={latest.id} next={nextAssetVersion(prompt.versions[0].id)} refs={usedBy.length ? `${usedBy.join('、')} 已套用` : ''} reviewNote="模板保存即发布；已套用的 Agent 不会自动更新。" onCancel={() => setChoosing(false)} onChoose={onEdit} />}
    <Stats items={[['类型', c.kind], ['最新版本', latest.id], ['变量', `${c.variables.length} 个`], ['沉淀自', usedBy.length ? `${usedBy.length} 个 Agent` : '通用模板']]} />
    <Block title="模板正文"><pre className="asset-code">{c.body}</pre></Block>
    <Block title="变量"><MiniTable head={['变量', '说明', '来源']} rows={c.variables.map(item => [<code>{`{{${item.name}}}`}</code>, item.desc, item.source])} /></Block>
    <Block title="结构"><KV items={[['结构', c.structure], ['可见范围', prompt.visibility], ['负责人', `${prompt.team} · ${prompt.owner}`]]} /></Block>
    <Block title="版本历史"><MiniTable head={['版本', '时间', '说明']} rows={prompt.versions.map(item => [<VersionBadge version={item.id} />, item.at, item.note])} /></Block>
    <Block title="沉淀自 / 已套用"><p className="meta">{usedBy.length ? `${usedBy.join('、')}。模板套用后复制进 Agent 的版本快照，模板更新不会改变这些 Agent 的线上行为。` : '通用模板，还没有 Agent 套用。'}</p></Block>
  </Drawer>;
}

function PromptForm({ prompt, how, onClose, onSaved }: { prompt?: PromptRecord; how?: EditHow; onClose: () => void; onSaved: (key: string) => void }) {
  const { state, saveAsset } = useDemo();
  const mode = !prompt ? 'create' : how!;
  const base = prompt ? (latestPublished(prompt) ?? prompt.versions[0]) : null;
  const next = prompt ? nextAssetVersion(prompt.versions[0].id) : 'v1';
  const lockReason = mode === 'in-place' && prompt?.usedBy?.length ? `${base!.id} 已被 ${prompt.usedBy.join('、')} 套用，正文和变量要发新版本才能改` : undefined;
  const [name, setName] = useState(prompt?.name ?? '');
  const [team, setTeam] = useState(prompt?.team ?? '平台团队');
  const [owner, setOwner] = useState(prompt?.owner ?? '');
  const [visibility, setVisibility] = useState(prompt?.visibility ?? visibilityOptions[0]);
  const [content, setContent] = useState<PromptContent>(structuredClone(base?.content ?? { kind: promptKinds[0], scene: '', structure: '', body: '', variables: [] }));
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const detected = detectVariables(content.body);
  const variables: PromptVariable[] = detected.map(item => content.variables.find(v => v.name === item) ?? { name: item, desc: '', source: variableSources[0] });
  const setVariable = (name: string, value: Partial<PromptVariable>) => setContent(current => ({ ...current, variables: variables.map(item => item.name === name ? { ...item, ...value } : item) }));
  const missing = !name.trim() ? '填写模板名称' : mode === 'create' && state.assets.prompts.some(item => item.key === name.trim()) ? '已有同名模板，请在该模板上发布新版本'
    : !content.body.trim() ? '填写模板正文' : !owner.trim() ? '填写负责人' : mode === 'new-version' && !note.trim() ? '填写版本说明' : undefined;
  const submit = () => {
    const at = nowStamp();
    const finalContent = { ...content, variables };
    const meta = { team, owner: owner.trim(), visibility, description: content.structure };
    if (mode === 'create') saveAsset('prompts', { key: name.trim(), name: name.trim(), ...meta, usedBy: [], created: true, versions: [{ id: 'v1', status: '已发布', at, by: owner.trim(), note: note.trim() || '新建模板', content: finalContent }] });
    else if (mode === 'new-version') saveAsset('prompts', { ...prompt!, ...meta, versions: [{ id: next, status: '已发布', at, by: owner.trim(), note: note.trim(), content: finalContent }, ...prompt!.versions] });
    else saveAsset('prompts', { ...prompt!, ...meta, versions: prompt!.versions.map(item => item.id === base!.id ? { ...item, content: lockReason ? { ...item.content, scene: content.scene, structure: content.structure } : finalContent } : item) });
    onSaved(prompt?.key ?? name.trim());
  };
  const title = mode === 'create' ? '新建 Prompt 模板' : mode === 'new-version' ? `发布新版本 · ${prompt!.name} ${next}` : `修改 · ${prompt!.name} ${base!.id}`;
  const L = lockReason;
  return <Drawer label={title} eyebrow="资产中心 · Prompt 模板" title={title} onClose={onClose} demo="prompt-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : mode === 'create' ? '保存后生成 v1，构建页可套用' : mode === 'new-version' ? `保存即发布 ${next}；已套用的 Agent 不会自动更新` : L ? '只保存适用场景、结构和基本信息' : `直接修改 ${base!.id}`}</span>
      <Button onClick={onClose}>取消</Button>{!L && <Button onClick={() => setTried(true)}><Play size={icon.small} />试运行</Button>}
      <Button variant="primary" disabled={Boolean(missing)} onClick={submit}>{mode === 'create' ? '保存为 v1' : mode === 'new-version' ? `保存为 ${next}` : '保存修改'}</Button></>}>
    {L && <ResultBox tone="warn">{L}</ResultBox>}
    <FormSection index={1} title="基本信息">
      <FormGrid>
        <Field label="模板名称" required locked={prompt ? '名称用于追溯套用关系，创建后不能修改' : undefined}><input aria-label="模板名称" value={name} disabled={Boolean(prompt)} onChange={event => setName(event.target.value)} placeholder="例如 多轮客服对话（含转人工）" /></Field>
        <Field label="类型" locked={Boolean(L)}><SelectInput label="类型" value={content.kind} options={promptKinds} disabled={Boolean(L)} onChange={value => setContent(current => ({ ...current, kind: value }))} /></Field>
        <Field label="适用场景"><input aria-label="适用场景" value={content.scene} onChange={event => setContent(current => ({ ...current, scene: event.target.value }))} placeholder="例如 会话 + 敏感承诺拦截" /></Field>
        <Field label="可见范围"><SelectInput label="可见范围" value={visibility} options={visibilityOptions} onChange={setVisibility} /></Field>
        <Field label="所属团队"><SelectInput label="所属团队" value={team} options={teamOptions.includes(team) ? teamOptions : [team, ...teamOptions]} onChange={setTeam} /></Field>
        <Field label="负责人" required><input aria-label="负责人" value={owner} onChange={event => setOwner(event.target.value)} /></Field>
      </FormGrid>
      <Field label="结构（一句话）" wide hint="列表里展示这一句，帮助别人判断要不要套用。"><input aria-label="结构" value={content.structure} onChange={event => setContent(current => ({ ...current, structure: event.target.value }))} placeholder="例如 角色 → 会话历史 → 依据知识答复 → 不承诺、引导转人工" /></Field>
    </FormSection>
    <FormSection index={2} title="模板正文" hint="用双花括号声明变量，例如 {{question}}。">
      <Field label="正文" required wide locked={Boolean(L)}><textarea aria-label="模板正文" className="mono-input" rows={7} value={content.body} disabled={Boolean(L)} onChange={event => { setContent(current => ({ ...current, body: event.target.value })); setTried(false); }} /></Field>
      <span className="meta">已识别变量：{detected.length ? detected.map(item => <code key={item} className="var-chip">{`{{${item}}}`}</code>) : '暂无'}</span>
    </FormSection>
    <FormSection index={3} title="变量说明">
      {variables.length ? <div className="param-editor">{variables.map(item => <div className="param-row var-row" key={item.name}>
        <code>{item.name}</code>
        <input aria-label={`${item.name} 说明`} value={item.desc} disabled={Boolean(L)} onChange={event => setVariable(item.name, { desc: event.target.value })} placeholder="说明" />
        <SelectInput label={`${item.name} 来源`} value={item.source} options={variableSources} disabled={Boolean(L)} onChange={value => setVariable(item.name, { source: value })} />
      </div>)}</div> : <p className="meta">正文里还没有变量。</p>}
    </FormSection>
    {mode !== 'in-place' && <FormSection index={4} title="版本说明"><Field label="这次改了什么" required={mode === 'new-version'} wide><input aria-label="版本说明" value={note} onChange={event => setNote(event.target.value)} placeholder={mode === 'create' ? '选填' : '例如 补充转人工话术'} /></Field></FormSection>}
    {tried && <ResultBox>试运行：{variables.map(item => `${item.name}=示例值`).join('，') || '无变量'} → 输出结构符合模板要求（演示数据）</ResultBox>}
  </Drawer>;
}
