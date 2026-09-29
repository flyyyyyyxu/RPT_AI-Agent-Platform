/** ① 知识库新版本草稿：编辑每条知识的生效 / 失效时间，加入待入库条目后发布。 */
import { Plus, Send } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { entryStatus, pendingFor } from '../../core/data-access/scenarioData';
import { Button } from '../../shared/components/Buttons';
import type { KbDraft } from '../../types/domain';
import { usePlaybookLock } from '../playbook/playbooks';
import { demoNow } from '../../core/rules/clock';
import { StatusBadge, type Status } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';

export const entryTone: Record<string, Status> = { 生效中: '通过', 已失效: '历史', 待生效: '待发布' };

const TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** 知识库新版本草稿：编辑每条知识的生效 / 失效时间，加入待入库条目后发布。 */
export function KbDraftEditor({ draft, onPublished }: { draft: KbDraft; onPublished: (id: string) => void }) {
  const { setKbDraft, publishKbDraft } = useDemo();
  const discardLock = usePlaybookLock('kb-discard', null);
  const pending = pendingFor(draft.kbId).filter(item => !draft.entries.some(entry => entry.title === item.title));
  const patchEntry = (index: number, value: Partial<KbDraft['entries'][number]>) => setKbDraft({ ...draft, entries: draft.entries.map((entry, i) => i === index ? { ...entry, ...value } : entry) });
  const invalid = draft.entries.find(entry => !TIME.test(entry.from) || (entry.to !== null && !TIME.test(entry.to)) || (entry.to !== null && entry.to <= entry.from));
  const reason = invalid ? `「${invalid.title}」的时间格式应为 2026-09-01 00:00，且失效时间晚于生效时间` : undefined;
  return <Capability skeleton={[1]} hero={3} demo="kb-draft" title={`新版本草稿 ${draft.nextVersion}（基于 ${draft.fromVersion}）`} description="发布后成为新的知识版本快照；已上线的 Agent 版本仍锁定旧版本，升级需创建候选版本并回归评测。">
    <div className="table-scroll"><table className="data-table entry-table kb-draft-table"><thead><tr><th className="col-entry">知识条目</th><th className="col-time">生效时间</th><th className="col-time">失效时间</th><th className="col-state">状态</th></tr></thead>
      <tbody>{draft.entries.map((entry, index) => <tr key={entry.title}><td><span className="truncate" title={entry.title}>{entry.isNew && <span className="new-tag">新增</span>}{entry.title}</span></td>
        <td><input className="time-input" aria-label={`${entry.title} 生效时间`} value={entry.from} onChange={event => patchEntry(index, { from: event.target.value })} /></td>
        <td><input className="time-input" aria-label={`${entry.title} 失效时间`} placeholder="长期有效" value={entry.to ?? ''} onChange={event => patchEntry(index, { to: event.target.value.trim() ? event.target.value : null })} /></td>
        <td><StatusBadge status={entryTone[entryStatus(entry)]} /> <span className="meta">{entryStatus(entry)}</span></td></tr>)}</tbody></table></div>
    {pending.length > 0 && <div><div className="sub-heading"><h4>待入库条目</h4><span className="meta">由知识运营提交，加入后可调整生效时间</span></div>
      <div className="redline-list">{pending.map(item => <div className="redline-item" key={item.title}><div><strong>{item.title}</strong><small className="meta">{item.submittedBy} · 建议 {item.from} 生效</small></div>
        <Button onClick={() => setKbDraft({ ...draft, entries: [...draft.entries, { title: item.title, from: item.from, to: item.to, isNew: true }] })}><Plus size={16} />加入本版本</Button></div>)}</div></div>}
    <div className="gate-footer"><span className="meta">状态按演示时钟 {demoNow()} 计算（演示数据）</span>
      <span className="inline-actions"><Button onClick={() => setKbDraft(null)} disabled={Boolean(discardLock)} reason={discardLock}>放弃草稿</Button><span data-demo="kb-publish"><Button variant="primary" disabled={Boolean(reason)} reason={reason} onClick={() => { publishKbDraft(); onPublished(draft.nextVersion); }}><Send size={16} />发布 {draft.nextVersion}</Button></span></span></div>
  </Capability>;
}
