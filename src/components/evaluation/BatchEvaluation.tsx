import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Download, FileSpreadsheet, Info, Play, RotateCcw, Upload } from 'lucide-react';
import { batchPresets } from '../../data/mock';
import type { Agent } from '../../types/domain';
import { Button } from '../actions/Buttons';
import { StatusBadge, VersionBadge } from '../badges/Badges';
import { Capability } from '../skeleton/Skeleton';

type FileInfo = { name: string; rows: number };

/** 批量评测：只在前端读取文件名和行数，进度与结果均为预设数据。 */
export function BatchEvaluation({ agent, versionId }: { agent: Agent; versionId: string }) {
  const preset = batchPresets[agent.profile] ?? batchPresets.general;
  const [file, setFile] = useState<FileInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const choose = (info: FileInfo) => { setFile(info); setStatus('idle'); setProgress(0); setError(null); };
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result ?? '').split(/\r?\n/).filter(line => line.trim()).length;
      if (lines < 2) { setError('文件为空或只有表头，请检查后重新上传。'); return; }
      choose({ name: picked.name, rows: /\.csv$/i.test(picked.name) ? lines - 1 : lines });
    };
    reader.onerror = () => setError('文件读取失败，请重新上传。');
    reader.readAsText(picked);
  };
  const run = () => {
    if (!file) return;
    timers.current.forEach(window.clearTimeout);
    setStatus('running'); setProgress(0);
    timers.current = [15, 38, 64, 86, 100].map((value, index) => window.setTimeout(() => { setProgress(value); if (value === 100) setStatus('done'); }, 280 * (index + 1)));
  };
  const exportCsv = () => {
    const header = 'input,output,score,result';
    const escape = (text: string | number) => `"${String(text).replace(/"/g, '""')}"`;
    const body = preset.rows.map(row => [row.input, row.output, row.score, row.result].map(escape).join(','));
    const blob = new Blob([`﻿${[header, ...body].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${agent.name}-${versionId}-批量评测结果.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const shards = file ? Math.max(1, Math.ceil(file.rows / 500)) : 0;
  const doneShards = Math.round((progress / 100) * shards);

  return <Capability skeleton={[2, 7]} title="批量评测" description={<>上传数据集，在隔离环境对 <VersionBadge version={versionId} /> 跑批；结果为预设演示数据。</>}>
    <p className="shared-note"><Info size={16} aria-hidden="true" />批量评测与「执行模式 · 批量」的线上批量任务共用同一套批处理能力（分片、限流、失败重试、断点续跑），评测跑通的配置可直接用于生产跑批。</p>
    <div className="upload-zone"><FileSpreadsheet size={20} strokeWidth={1.5} aria-hidden="true" /><div>{file ? <><strong>{file.name}</strong><p className="meta">{file.rows.toLocaleString('zh-CN')} 条样本 · 分 {shards} 片，每片 500 条</p></> : <><strong>上传评测数据集</strong><p className="meta">支持 CSV / JSONL，只读取文件名和行数</p></>}</div>
      <label className="button button-secondary upload-label"><Upload size={16} />{file ? '重新上传' : '上传文件'}<input type="file" accept=".csv,.jsonl,.txt" onChange={onFile} /></label>
      {!file && <Button onClick={() => choose({ name: `${agent.name}-回归样本-2026-09.csv`, rows: 2000 })}>使用示例数据集</Button>}
      <Button variant="primary" onClick={run} disabled={!file || status === 'running'} reason={!file ? '请先上传数据集' : undefined}>{status === 'running' ? <RotateCcw size={16} className="spin" /> : <Play size={16} />}{status === 'running' ? '跑批中' : status === 'done' ? '重新跑批' : '开始跑批'}</Button></div>
    {error && <p className="span-error" role="alert">{error}</p>}
    {file && status !== 'idle' && <div className="batch-progress"><div className="batch-progress-row"><div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="跑批进度"><span style={{ width: `${progress}%` }} /></div><span className="progress-value">{progress}%</span></div>
      <span className="meta">已完成 {doneShards} / {shards} 片 · {Math.round((progress / 100) * file.rows).toLocaleString('zh-CN')} / {file.rows.toLocaleString('zh-CN')} 条</span></div>}
    {status === 'done' && <>
      <div className="batch-metrics">{preset.metrics.map(metric => <div className="batch-metric" key={metric.label}><span className="meta">{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>输入</th><th>输出</th><th className="numeric">得分</th><th>结果</th></tr></thead>
        <tbody>{preset.rows.map(row => <tr key={row.input}><td><span className="truncate" title={row.input}>{row.input}</span></td><td><span className="truncate" title={row.output}>{row.output}</span></td><td className="numeric">{row.score}</td><td><StatusBadge status={row.result === '通过' ? '通过' : '失败'} /></td></tr>)}</tbody></table></div>
      <div className="flow-next"><Button onClick={exportCsv}><Download size={16} />导出 CSV</Button></div>
    </>}
  </Capability>;
}
