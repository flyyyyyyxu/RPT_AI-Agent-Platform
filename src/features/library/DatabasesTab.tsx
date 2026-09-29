/**
 * 资产中心 · 数据库：结构化数据（上传表格或连接业务库），用户问数值、计算、统计类问题时由 Agent 查表回答。
 * 版本对应表结构，数据是实时查询的；保存即发布。被 Agent 版本引用时，表结构只能通过「发布新版本」修改。
 * DatabaseForm 也在构建页「添加数据库」里复用：新建后同时入库并挂到当前草稿。
 */
import { useState } from 'react';
import { Pencil, Plug, TableProperties } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { databaseRefs, latestPublished, nextAssetVersion, refText } from '../../core/data-access/assets';
import { nowStamp } from '../../core/rules/clock';
import { Button } from '../../shared/components/Buttons';
import { Card } from '../../shared/components/Content';
import { Phase2Row } from '../../shared/components/Capability';
import { Drawer } from '../../shared/components/Drawer';
import { VersionBadge } from '../../shared/components/Badges';
import { databaseSources, dataLevelOptions, teamOptions, visibilityOptions } from '../../data';
import type { AssetRecord, DatabaseContent, DbTable } from '../../types/domain';
import { AssetHeading, AssetName, Block, Chips, EditChoice, Field, FormGrid, FormSection, KV, MiniTable, ResultBox, SelectInput, Stats, type EditHow } from './assetUi';
import { icon } from '../../shared/styles/tokens';

type DbRecord = AssetRecord<DatabaseContent>;
type DrawerState = { mode: 'detail'; key: string } | { mode: 'create' } | { mode: 'edit'; key: string; how: EditHow };
const rowsText = (tables: DbTable[]) => tables.reduce((sum, table) => sum + table.rows, 0).toLocaleString('zh-CN');
/** 「使用示例表格」解析出来的表（演示数据） */
const sampleTables = (name: string): DbTable[] => [{ name: 'sheet1', fields: `${name || '记录'} ID、名称、类型、数值、更新时间`, rows: 1260 }];

export function DatabasesTab() {
  const { state } = useDemo();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const list = state.assets.databases;
  const open = (key: string) => setDrawer({ mode: 'detail', key });
  const current = drawer && drawer.mode !== 'create' ? list.find(item => item.key === drawer.key) : undefined;
  return <>
    <AssetHeading section="databases" actionLabel="创建数据库" onAction={() => setDrawer({ mode: 'create' })} demo="db-create" />
    <Card className="asset-table-card"><div className="table-scroll"><table className="data-table asset-table databases-table">
      <colgroup><col className="c-name" /><col className="c-source" /><col className="c-tables" /><col className="c-level" /><col className="c-owner" /><col className="c-refs" /></colgroup>
      <thead><tr><th>数据库</th><th>来源</th><th>表 / 行数</th><th>数据等级</th><th>负责人</th><th>被引用</th></tr></thead>
      <tbody>{list.map(item => { const latest = latestPublished(item) ?? item.versions[0]; const refs = databaseRefs(state, item.key); return <tr key={item.key}>
        <td><AssetName onOpen={() => open(item.key)} sub={item.description}>{item.name}</AssetName></td>
        <td>{latest.content.source}<small className="meta">{latest.id}</small></td>
        <td className="numeric">{latest.content.tables.length} 张 · {rowsText(latest.content.tables)} 行</td>
        <td><span className="truncate" title={latest.content.dataLevel}>{latest.content.dataLevel}</span></td>
        <td><span className="truncate" title={`${item.team} · ${item.owner}`}>{item.team}<small className="meta">{item.owner}</small></span></td>
        <td><span className="truncate" title={refText(refs)}>{refs.length ? refText(refs) : <span className="meta">暂无引用</span>}</span></td>
      </tr>; })}</tbody></table></div></Card>
    <Phase2Row items={[{ title: '自然语言问数优化', description: '按字段说明和历史查询自动生成 SQL 示例，提升问数准确率。' }]} />
    {drawer?.mode === 'detail' && current && <DatabaseDetail db={current} onClose={() => setDrawer(null)} onEdit={how => setDrawer({ mode: 'edit', key: current.key, how })} />}
    {drawer?.mode === 'create' && <DatabaseForm onClose={() => setDrawer(null)} onSaved={open} />}
    {drawer?.mode === 'edit' && current && <DatabaseForm db={current} how={drawer.how} onClose={() => open(current.key)} onSaved={open} />}
  </>;
}

function DatabaseDetail({ db, onClose, onEdit }: { db: DbRecord; onClose: () => void; onEdit: (how: EditHow) => void }) {
  const { state } = useDemo();
  const [choosing, setChoosing] = useState(false);
  const latest = latestPublished(db) ?? db.versions[0];
  const refs = databaseRefs(state, db.key);
  const c = latest.content;
  return <Drawer label={`数据库 ${db.name}`} eyebrow={`资产中心 · 数据库 · ${db.team}`} title={<>{db.name}<VersionBadge version={latest.id} /></>}
    meta={<>{c.source} · {c.access} · 负责人 {db.owner}</>} onClose={onClose} demo="db-detail"
    footer={!choosing && <><Button onClick={() => setChoosing(true)}><Pencil size={icon.small} />修改</Button><Button variant="primary" onClick={onClose}>关闭</Button></>}>
    {choosing && <EditChoice current={latest.id} next={nextAssetVersion(db.versions[0].id)} refs={refText(refs)} reviewNote="数据库保存即发布。" onCancel={() => setChoosing(false)} onChoose={onEdit} />}
    <Stats items={[['表结构版本', latest.id], ['表', `${c.tables.length} 张`], ['总行数', rowsText(c.tables)], ['被引用', `${refs.length} 个 Agent 版本`]]} />
    <Block title="表结构"><MiniTable head={['表', '字段', '行数']} rows={c.tables.map(table => [<code>{table.name}</code>, table.fields, table.rows.toLocaleString('zh-CN')])} /></Block>
    <Block title="安全与限制"><KV items={[['访问方式', `${c.access}（Agent 只能查询，不能写入）`], ['数据等级', c.dataLevel], ['可见范围', db.visibility], ['负责人', `${db.team} · ${db.owner}`]]} /></Block>
    <Block title="版本历史"><MiniTable head={['版本', '时间', '说明']} rows={db.versions.map(item => [<VersionBadge version={item.id} />, item.at, item.note])} /></Block>
    <Block title="被引用"><MiniTable head={['Agent', '版本']} empty="还没有 Agent 版本挂这个数据库" rows={refs.map(ref => [ref.agent.name, ref.version.id])} /></Block>
  </Drawer>;
}

/** defaults：在构建页创建时预填团队和可见范围 */
export function DatabaseForm({ db, how, defaults, onClose, onSaved }: { db?: DbRecord; how?: EditHow; defaults?: { team: string; owner: string }; onClose: () => void; onSaved: (key: string) => void }) {
  const { state, saveAsset } = useDemo();
  const mode = !db ? 'create' : how!;
  const base = db ? (latestPublished(db) ?? db.versions[0]) : null;
  const next = db ? nextAssetVersion(db.versions[0].id) : 'v1';
  const refs = db ? databaseRefs(state, db.key) : [];
  const lockReason = mode === 'in-place' && refs.length ? `${base!.id} 已被 ${refText(refs)} 引用，表结构要发布新版本才能改` : undefined;
  const [name, setName] = useState(db?.name ?? '');
  const [team, setTeam] = useState(db?.team ?? defaults?.team ?? teamOptions[0]);
  const [owner, setOwner] = useState(db?.owner ?? defaults?.owner ?? '');
  const [description, setDescription] = useState(db?.description ?? '');
  const [visibility, setVisibility] = useState(db?.visibility ?? '本团队');
  const [content, setContent] = useState<DatabaseContent>(structuredClone(base?.content ?? { source: '上传表格', tables: [], dataLevel: dataLevelOptions[0], access: '只读' }));
  const [note, setNote] = useState('');
  const [connected, setConnected] = useState(Boolean(db));
  const L = lockReason;
  const missing = !name.trim() ? '填写数据库名称' : !db && state.assets.databases.some(item => item.key === name.trim()) ? '已有同名数据库' : !owner.trim() ? '填写负责人'
    : !content.tables.length ? (content.source === '上传表格' ? '上传表格' : '测试连接并选择表') : mode === 'new-version' && !note.trim() ? '填写版本说明' : undefined;
  const submit = () => {
    const at = nowStamp();
    const meta = { team, owner: owner.trim(), description: description.trim() || `${team}的数据库`, visibility };
    if (mode === 'create') saveAsset('databases', { key: name.trim(), name: name.trim(), ...meta, created: true, versions: [{ id: 'v1', status: '已发布', at, by: owner.trim(), note: note.trim() || '新建数据库', content }] });
    else if (mode === 'new-version') saveAsset('databases', { ...db!, ...meta, versions: [{ id: next, status: '已发布', at, by: owner.trim(), note: note.trim(), content }, ...db!.versions] });
    else saveAsset('databases', { ...db!, ...meta, versions: db!.versions.map(item => item.id === base!.id && !L ? { ...item, content } : item) });
    onSaved(db?.key ?? name.trim());
  };
  const title = mode === 'create' ? '创建数据库' : mode === 'new-version' ? `发布新版本 · ${db!.name} ${next}` : `修改 · ${db!.name} ${base!.id}`;
  return <Drawer label={title} eyebrow="资产中心 · 数据库" title={title} onClose={onClose} demo="db-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : mode === 'create' ? '保存即发布 v1，入库到资产中心' : mode === 'new-version' ? `保存即发布 ${next}；已引用的 Agent 版本仍按原表结构查询` : L ? '只保存基本信息' : `直接修改 ${base!.id}`}</span>
      <Button onClick={onClose}>取消</Button><Button variant="primary" disabled={Boolean(missing)} onClick={submit}>{mode === 'create' ? '创建并发布 v1' : mode === 'new-version' ? `发布 ${next}` : '保存修改'}</Button></>}>
    {L && <ResultBox tone="warn">{L}</ResultBox>}
    <FormSection index={1} title="基本信息">
      <FormGrid>
        <Field label="数据库名称" required locked={db ? '名称是 Agent 引用数据库的标识，创建后不能修改' : undefined}><input aria-label="数据库名称" value={name} disabled={Boolean(db)} onChange={event => setName(event.target.value)} placeholder="例如 尺码对照表" /></Field>
        <Field label="所属团队"><SelectInput label="所属团队" value={team} options={teamOptions.includes(team) ? teamOptions : [team, ...teamOptions]} onChange={setTeam} /></Field>
        <Field label="负责人" required><input aria-label="负责人" value={owner} onChange={event => setOwner(event.target.value)} /></Field>
        <Field label="可见范围"><SelectInput label="可见范围" value={visibility} options={visibilityOptions} onChange={setVisibility} /></Field>
      </FormGrid>
      <Field label="描述" wide hint="写清楚能回答哪类问题，模型据此决定是否查表。"><input aria-label="描述" value={description} onChange={event => setDescription(event.target.value)} placeholder="例如 各品类尺码与身高体重对照" /></Field>
    </FormSection>
    <FormSection index={2} title="数据来源">
      <Chips label="数据来源" options={databaseSources} value={[content.source]} single disabled={Boolean(L)} onChange={value => { setContent(current => ({ ...current, source: value[0] as DatabaseContent['source'], tables: [] })); setConnected(false); }} />
      {content.source === '上传表格'
        ? <div className="upload-row"><Button disabled={Boolean(L)} onClick={() => setContent(current => ({ ...current, tables: sampleTables(name.trim()) }))}><TableProperties size={icon.small} />使用示例表格</Button><span className="meta">支持 .xlsx / .csv，每个工作表生成一张表</span></div>
        : <div className="upload-row"><Button disabled={Boolean(L)} onClick={() => { setConnected(true); setContent(current => ({ ...current, tables: sampleTables(name.trim()) })); }}><Plug size={icon.small} />测试连接（只读账号）</Button><span className="meta">{connected ? '连接成功，已选择 1 张表的只读视图' : '只能连接公司数据平台登记过的只读视图'}</span></div>}
      {content.tables.length > 0 && <MiniTable head={['表', '字段', '行数']} rows={content.tables.map(table => [<code>{table.name}</code>, table.fields, table.rows.toLocaleString('zh-CN')])} />}
      <FormGrid><Field label="数据等级" locked={Boolean(L)}><SelectInput label="数据等级" value={content.dataLevel} options={dataLevelOptions} disabled={Boolean(L)} onChange={value => setContent(current => ({ ...current, dataLevel: value }))} /></Field></FormGrid>
    </FormSection>
    {mode !== 'in-place' && <FormSection index={3} title="版本说明"><Field label="这次改了什么" required={mode === 'new-version'} wide><input aria-label="版本说明" value={note} onChange={event => setNote(event.target.value)} placeholder={mode === 'create' ? '选填' : '例如 新增适合身材字段'} /></Field></FormSection>}
  </Drawer>;
}
