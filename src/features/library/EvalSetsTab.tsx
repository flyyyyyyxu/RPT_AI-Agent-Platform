/**
 * 资产中心 · 评测集：列表、详情抽屉、新建 / 发布新版本（追加样本）/ 修改当前版本。
 * 评测集保存即发布；跑过评测的版本不能改样本（评测记录要能追溯），只能发新版本。
 * 新建或追加的样本会出现在对应 Agent 的评测页里。
 */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, FileUp, Pencil } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { datasetsFor } from '../../core/data-access/scenarioData';
import { evalsetKey, evalsetRows, evalsetUsage, latestPublished, nextAssetVersion, refText } from '../../core/data-access/assets';
import { focusVersion } from '../../core/rules/versions';
import { nowStamp } from '../../core/rules/clock';
import { Button } from '../../shared/components/Buttons';
import { Card } from '../../shared/components/Content';
import { Phase2Row } from '../../shared/components/Capability';
import { Drawer } from '../../shared/components/Drawer';
import { VersionBadge } from '../../shared/components/Badges';
import { baseOf, datasetProfiles, evalDimensionOptions, evalScoringOptions, importSampleName, toImported } from '../../data';
import type { Agent, AssetRecord, EvalCase, EvalDataset, EvalsetContent } from '../../types/domain';
import { AssetHeading, AssetName, Block, Chips, EditChoice, Field, FormGrid, FormSection, KV, MiniTable, ResultBox, SelectInput, Stats, type EditHow } from './assetUi';
import { icon } from '../../shared/styles/tokens';

type Row = { agent: Agent; dataset: EvalDataset; record: AssetRecord<EvalsetContent> };
type DrawerState = { mode: 'detail'; key: string } | { mode: 'create' } | { mode: 'edit'; key: string; how: EditHow };
const sourceOf = (row: Row) => row.dataset.id === 'badcase' ? 'bad case 回流' : row.record.created ? '新建' : row.record.versions.length > 1 ? '预置 + 追加' : '预置';

function useRows() {
  const { state, opsOf } = useDemo();
  return evalsetRows(state, agent => datasetsFor(agent, focusVersion(agent), opsOf(agent), state.assets));
}

export function EvalSetsTab() {
  const rows = useRows();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const open = (key: string) => setDrawer({ mode: 'detail', key });
  const current = drawer && drawer.mode !== 'create' ? rows.find(row => row.record.key === drawer.key) : undefined;
  const fromBadcase = rows.filter(row => row.dataset.id === 'badcase').length;
  return <>
    <AssetHeading section="evalsets" actionLabel="新建评测集" onAction={() => setDrawer({ mode: 'create' })} demo="evalset-create" />
    <Card className="asset-table-card"><p className="meta asset-caption">共 {rows.length} 个评测集，覆盖 {new Set(rows.map(row => row.agent.id)).size} 个 Agent{fromBadcase ? `；其中 ${fromBadcase} 个来自 bad case 回流` : ''}。</p>
      <div className="table-scroll"><table className="data-table asset-table evalset-table">
        <colgroup><col className="c-set" /><col className="c-owner" /><col className="c-count" /><col className="c-dim" /><col className="c-source" /><col className="c-go" /></colgroup>
        <thead><tr><th>评测集</th><th>归属 Agent</th><th className="center">样本数</th><th>评测维度</th><th>来源</th><th className="center">进入 Agent 配置</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.record.key}>
          <td><AssetName onOpen={() => open(row.record.key)}>{row.record.name}</AssetName></td>
          <td><span className="truncate" title={`${row.agent.name} · ${row.agent.team}`}>{row.agent.name}<small className="meta">{row.agent.team}</small></span></td>
          <td className="center">{row.dataset.cases.length}</td>
          <td><span className="truncate" title={row.dataset.description}>{row.dataset.description}</span></td>
          <td>{row.dataset.id === 'badcase' ? <span className="status-badge tone-progress">bad case 回流</span> : <span className="meta">{sourceOf(row)}</span>}</td>
          <td className="center"><Link className="row-link" to={`/agents/${row.agent.id}/evaluation`} aria-label={`进入 ${row.agent.name} 的评测页`} title="进入该 Agent 的评测页"><ArrowRight size={icon.small} /></Link></td>
        </tr>)}</tbody></table></div></Card>
    <Phase2Row items={[
      { title: '跨团队评测集模板', description: '把「过期知识」「承诺类话术」这类通用检查沉淀成模板，新 Agent 直接套用。' },
      { title: '自动扩充样本', description: '按线上 bad case 聚类自动生成对抗样本，人工确认后入库。' },
    ]} />
    {drawer?.mode === 'detail' && current && <EvalsetDetail row={current} onClose={() => setDrawer(null)} onEdit={how => setDrawer({ mode: 'edit', key: current.record.key, how })} />}
    {drawer?.mode === 'create' && <EvalsetForm onClose={() => setDrawer(null)} onSaved={open} />}
    {drawer?.mode === 'edit' && current && <EvalsetForm row={current} how={drawer.how} onClose={() => open(current.record.key)} onSaved={open} />}
  </>;
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
function exportCsv(name: string, cases: EvalCase[]) {
  const csv = ['name,input,expected', ...cases.map(item => [item.name, item.input, item.expected].map(csvCell).join(','))].join('\n');
  try {
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${name}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { /* 下载不可用时忽略 */ }
}

function EvalsetDetail({ row, onClose, onEdit }: { row: Row; onClose: () => void; onEdit: (how: EditHow) => void }) {
  const { state } = useDemo();
  const [choosing, setChoosing] = useState(false);
  const { agent, dataset, record } = row;
  const latest = latestPublished(record) ?? record.versions[0];
  const usage = evalsetUsage(state, agent.id, dataset.id);
  const auto = dataset.id === 'badcase';
  return <Drawer label={`评测集 ${record.name}`} eyebrow={`资产中心 · 评测集 · ${agent.name}`} title={<>{record.name}<VersionBadge version={latest.id} /></>}
    meta={<>{dataset.description} · 来源：{sourceOf(row)} · 负责人 {record.owner}</>} onClose={onClose} demo="evalset-detail"
    footer={!choosing && <><Button onClick={() => setChoosing(true)} disabled={auto} reason={auto ? '由 bad case 工作台自动维护' : undefined}><Pencil size={icon.small} />修改</Button>
      <Button onClick={() => exportCsv(record.name, dataset.cases)}><Download size={icon.small} />导出 CSV</Button>
      <Link className="button button-primary" to={`/agents/${agent.id}/evaluation`}>去 Agent 评测页</Link></>}>
    {choosing && <EditChoice current={latest.id} next={nextAssetVersion(record.versions[0].id)} refs={usage.length ? `${refText(usage)} 跑过评测` : ''} reviewNote="评测集保存即发布，下一次评测自动使用最新版本。" onCancel={() => setChoosing(false)} onChoose={onEdit} />}
    {auto && <ResultBox tone="info">这个评测集由 bad case 工作台维护：在该 Agent 的「观测 · Trace 与 bad case」里把样本加入或移出。</ResultBox>}
    <Stats items={[['样本数', String(dataset.cases.length)], ['最新版本', latest.id], ['最近评测', usage.length ? `${usage[0].version.id}` : '还未使用'], ['评分方式', latest.content.scoring.join('、')]]} />
    <Block title="样本"><MiniTable head={['名称', '输入', '期望输出']} rows={dataset.cases.map(item => [item.name, item.input, item.expected])} /></Block>
    <Block title="评测维度"><KV items={[['维度', latest.content.dimensions.join('、')], ['说明', dataset.description], ['归属', `${agent.name} · ${agent.team}`]]} /></Block>
    <Block title="版本历史"><MiniTable head={['版本', '时间', '说明', '样本变化']} rows={record.versions.map(item => [<VersionBadge version={item.id} />, item.at, item.note, item.content.addedCases.length ? `追加 ${item.content.addedCases.length} 条（累计）` : '原始样本'])} /></Block>
    <Block title="使用记录"><MiniTable head={['Agent 版本', '状态', '说明']} empty="还没有 Agent 版本用它跑过评测" rows={usage.map(item => [`${item.agent.name} ${item.version.id}`, item.version.status, item.version.note])} /></Block>
  </Drawer>;
}

function EvalsetForm({ row, how, onClose, onSaved }: { row?: Row; how?: EditHow; onClose: () => void; onSaved: (key: string) => void }) {
  const { state, saveAsset } = useDemo();
  const mode = !row ? 'create' : how!;
  const record = row?.record;
  const base = record ? (latestPublished(record) ?? record.versions[0]) : null;
  const next = record ? nextAssetVersion(record.versions[0].id) : 'v1';
  const usage = row ? evalsetUsage(state, row.agent.id, row.dataset.id) : [];
  const lockReason = mode === 'in-place' && usage.length ? `${base!.id} 已被 ${refText(usage)} 用来跑评测，改样本会让评测记录对不上；请发布新版本` : undefined;
  const [agentId, setAgentId] = useState(row?.agent.id ?? state.agents[0].id);
  const agent = state.agents.find(item => item.id === agentId)!;
  const [name, setName] = useState(record?.name ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [owner, setOwner] = useState(record?.owner ?? agent.owner);
  const [dimensions, setDimensions] = useState<string[]>(base?.content.dimensions ?? ['答案正确性']);
  const [scoring, setScoring] = useState<string[]>(base?.content.scoring ?? ['规则打分']);
  const [source, setSource] = useState('上传 CSV');
  const [imported, setImported] = useState<{ file: string; rows: number; cases: EvalCase[] } | null>(null);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const presetCases = () => toImported(datasetProfiles[baseOf(agent.profile)].flatMap(item => item.cases)).map(item => mode === 'new-version' ? { ...item, name: item.name.replace('（导入）', `（${next} 追加）`) } : item);
  const onFile = (file: File | undefined) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { const lines = String(reader.result ?? '').split(/\r?\n/).filter(Boolean).length; setImported({ file: file.name, rows: Math.max(0, lines - 1), cases: presetCases() }); }; reader.onerror = () => setImported({ file: file.name, rows: 0, cases: presetCases() }); reader.readAsText(file); };
  const useSample = () => { const cases = presetCases(); setImported({ file: importSampleName(agent.name), rows: cases.length, cases }); };
  const needsImport = mode !== 'in-place';
  const missing = !name.trim() ? '填写评测集名称' : !owner.trim() ? '填写负责人' : !dimensions.length ? '至少选一个评测维度' : !scoring.length ? '至少选一种评分方式'
    : needsImport && !imported ? (mode === 'create' ? '先导入样本' : '先导入要追加的样本') : mode === 'new-version' && !note.trim() ? '填写版本说明' : undefined;
  const submit = () => {
    const at = nowStamp();
    if (mode === 'create') {
      const datasetId = `custom-${state.assets.evalsets.filter(item => item.created).length + 1}`;
      const key = evalsetKey(agent.id, datasetId);
      saveAsset('evalsets', { key, agentId: agent.id, datasetId, name: name.trim(), description: description.trim() || dimensions.join('、'), team: agent.team, owner: owner.trim(), visibility: '本团队', created: true,
        versions: [{ id: 'v1', status: '已发布', at, by: owner.trim(), note: note.trim() || '新建评测集', content: { dimensions, scoring, addedCases: imported!.cases } }] });
      onSaved(key);
      return;
    }
    const meta = { description: description.trim() || row!.dataset.description, owner: owner.trim() };
    if (mode === 'new-version') saveAsset('evalsets', { ...record!, ...meta, versions: [{ id: next, status: '已发布', at, by: owner.trim(), note: note.trim(), content: { dimensions, scoring, addedCases: [...base!.content.addedCases, ...imported!.cases] } }, ...record!.versions] });
    else saveAsset('evalsets', { ...record!, ...meta, versions: record!.versions.map(item => item.id === base!.id ? { ...item, content: lockReason ? { ...item.content, dimensions } : { dimensions, scoring, addedCases: imported ? imported.cases : item.content.addedCases } } : item) });
    onSaved(record!.key);
  };
  const title = mode === 'create' ? '新建评测集' : mode === 'new-version' ? `发布新版本 · ${record!.name} ${next}` : `修改 · ${record!.name} ${base!.id}`;
  const L = lockReason;
  return <Drawer label={title} eyebrow="资产中心 · 评测集" title={title} onClose={onClose} demo="evalset-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：${missing}` : mode === 'create' ? '保存后生成 v1，对应 Agent 的评测页可直接选用' : mode === 'new-version' ? `保存即发布 ${next}；下一次评测自动使用` : L ? '只保存维度和基本信息' : `直接修改 ${base!.id}`}</span>
      <Button onClick={onClose}>取消</Button><Button variant="primary" disabled={Boolean(missing)} onClick={submit}>{mode === 'create' ? '保存为 v1' : mode === 'new-version' ? `保存为 ${next}` : '保存修改'}</Button></>}>
    {L && <ResultBox tone="warn">{L}</ResultBox>}
    <FormSection index={1} title="基本信息">
      <FormGrid>
        <Field label="评测集名称" required locked={record ? '名称在评测报告里用于追溯，创建后不能修改' : undefined}><input aria-label="评测集名称" value={name} disabled={Boolean(record)} onChange={event => setName(event.target.value)} placeholder="例如 大促售后样本集" /></Field>
        <Field label="归属 Agent" required locked={row ? '评测集属于一个 Agent，创建后不能更换' : undefined}><SelectInput label="归属 Agent" value={agent.name} options={state.agents.map(item => item.name)} disabled={Boolean(row)} onChange={value => { const target = state.agents.find(item => item.name === value)!; setAgentId(target.id); setOwner(target.owner); setImported(null); }} /></Field>
        <Field label="负责人" required><input aria-label="负责人" value={owner} onChange={event => setOwner(event.target.value)} /></Field>
        <Field label="维度说明"><input aria-label="维度说明" value={description} onChange={event => setDescription(event.target.value)} placeholder="例如 大促规则、失效政策" /></Field>
      </FormGrid>
      <Field label="评测维度" required><Chips label="评测维度" options={evalDimensionOptions} value={dimensions} onChange={setDimensions} /></Field>
    </FormSection>
    <FormSection index={2} title={mode === 'new-version' ? '追加样本' : '样本'} hint={L ? L : mode === 'in-place' ? '可重新导入，替换这个版本追加的样本。' : undefined}>
      <Chips label="样本来源" options={['上传 CSV', '从 Trace 选取', '从 bad case 加入', '手动录入']} value={[source]} single disabled={Boolean(L)} onChange={value => setSource(value[0])} />
      {source === '上传 CSV' && !L && <div className="upload-row"><input ref={fileRef} type="file" accept=".csv" hidden onChange={event => onFile(event.target.files?.[0])} />
        <Button onClick={() => fileRef.current?.click()}><FileUp size={icon.small} />选择 CSV 文件</Button><Button onClick={useSample}>使用示例文件</Button></div>}
      {source === '从 Trace 选取' && <ResultBox tone="info">在该 Agent 的「观测 · Trace 与 bad case」里勾选 bad case，点「加入回归集」：原话和期望输出作为样本汇入「bad case 回归集」。</ResultBox>}
      {source === '从 bad case 加入' && <ResultBox tone="info">bad case 标注问题环节后可直接加入；未指定评测集时进入「bad case 回归集」。</ResultBox>}
      {source === '手动录入' && <ResultBox tone="info">保存后在详情里逐条添加样本（演示中请用「上传 CSV」）。</ResultBox>}
      {imported && <>
        <MiniTable head={['评测字段', 'CSV 列']} rows={[['输入', 'input'], ['期望输出', 'expected'], ['标签', 'tag'], ['红线样本', 'is_redline']]} />
        <ResultBox>{imported.file} · {imported.rows} 行可用 · 缺少期望输出 0 行；演示中按预设生成 {imported.cases.length} 条样本</ResultBox>
        <MiniTable head={['名称', '输入', '期望输出']} rows={imported.cases.slice(0, 3).map(item => [item.name, item.input, item.expected])} />
      </>}
    </FormSection>
    <FormSection index={3} title="评分方式">
      <Chips label="评分方式" options={evalScoringOptions} value={scoring} disabled={Boolean(L)} onChange={setScoring} />
      {scoring.some(item => item.startsWith('LLM')) && <ResultBox tone="warn">LLM 评委要先用人工评分数据校准，高准确场景（如生态守护 Agent）不能单独使用。</ResultBox>}
    </FormSection>
    {mode !== 'in-place' && <FormSection index={4} title="版本说明"><Field label="这次加了什么样本" required={mode === 'new-version'} wide><input aria-label="版本说明" value={note} onChange={event => setNote(event.target.value)} placeholder={mode === 'create' ? '选填' : '例如 补充双 11 价保样本'} /></Field></FormSection>}
  </Drawer>;
}
