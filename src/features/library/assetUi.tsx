/**
 * 资产中心共用的界面零件：页头（带新建按钮）、名称链接、详情里的数字与信息块、表单字段、修改方式选择。
 */
import { useState, type ReactNode } from 'react';
import { CheckCircle2, ChevronDown, GitBranchPlus, Lock, PencilLine, Plus } from 'lucide-react';
import { Button } from '../../shared/components/Buttons';
import { assetSections, type AssetSectionId } from '../../data';
import { icon } from '../../shared/styles/tokens';

export function AssetHeading({ section, actionLabel, onAction, demo }: { section: AssetSectionId; actionLabel: string; onAction: () => void; demo?: string }) {
  const meta = assetSections.find(item => item.id === section)!;
  return <div className="asset-heading"><div className="page-heading"><span className="eyebrow">资产中心</span><h1>{meta.label}</h1><p>{meta.description}</p></div>
    <span data-demo={demo}><Button variant="primary" onClick={onAction}><Plus size={icon.small} />{actionLabel}</Button></span></div>;
}

/** 列表里的资产名称：点击打开详情抽屉 */
export function AssetName({ children, onOpen, sub }: { children: ReactNode; onOpen: () => void; sub?: ReactNode }) {
  return <><button type="button" className="asset-name" onClick={onOpen}>{children}</button>{sub && <small className="meta asset-sub">{sub}</small>}</>;
}

export function Stats({ items }: { items: [string, ReactNode][] }) {
  return <div className="asset-stats">{items.map(([label, value]) => <div key={label}><span className="meta">{label}</span><strong>{value}</strong></div>)}</div>;
}

export function Block({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="asset-block"><div className="asset-block-head"><h3>{title}</h3>{aside}</div>{children}</section>;
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return <dl className="asset-kv">{items.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>;
}

export function MiniTable({ head, rows, empty = '暂无' }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="meta">{empty}</p>;
  return <div className="table-scroll"><table className="data-table mini-table"><thead><tr>{head.map(item => <th key={item}>{item}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}><span className="truncate" title={typeof cell === 'string' ? cell : undefined}>{cell}</span></td>)}</tr>)}</tbody></table></div>;
}

export function ResultBox({ children, tone = 'ok' }: { children: ReactNode; tone?: 'ok' | 'warn' | 'info' }) {
  return <div className={`asset-result tone-box-${tone}`}>{tone === 'ok' && <CheckCircle2 size={icon.small} aria-hidden="true" />}<span>{children}</span></div>;
}

/* ---------------- 表单 ---------------- */

export function FormSection({ index, title, hint, children }: { index: number; title: string; hint?: string; children: ReactNode }) {
  return <section className="form-section"><h3><span className="form-index">{index}</span>{title}</h3>{hint && <p className="meta">{hint}</p>}{children}</section>;
}

/** locked：锁定的字段。传字符串时在字段下显示原因；传 true 只显示锁标记（原因统一写在表单顶部）。字段里的输入框各自带 aria-label（容器里可能有多个按钮，不用 label 包裹） */
export function Field({ label, required, hint, locked, children, wide }: { label: string; required?: boolean; hint?: string; locked?: string | boolean; children: ReactNode; wide?: boolean }) {
  return <div className={`field-label asset-field ${wide ? 'wide' : ''} ${locked ? 'locked' : ''}`}><span>{label}{required && <em className="required" aria-hidden="true">*</em>}{locked && <Lock size={icon.small} aria-label="已锁定" />}</span>
    {children}{typeof locked === 'string' ? <small className="meta">{locked}</small> : hint ? <small className="meta">{hint}</small> : null}</div>;
}

export function SelectInput({ value, options, onChange, disabled, label }: { value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean; label: string }) {
  return <span className="select-field"><select aria-label={label} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>;
}

/** 多选 / 单选标签 */
export function Chips({ options, value, onChange, single, disabled, label }: { options: string[]; value: string[]; onChange: (value: string[]) => void; single?: boolean; disabled?: boolean; label: string }) {
  return <div className="asset-chips" role="group" aria-label={label}>{options.map(option => { const on = value.includes(option); return <button type="button" key={option} aria-pressed={on} className={on ? 'on' : ''} disabled={disabled}
    onClick={() => onChange(single ? [option] : on ? value.filter(item => item !== option) : [...value, option])}>{option}</button>; })}</div>;
}

export const FormGrid = ({ children }: { children: ReactNode }) => <div className="form-grid">{children}</div>;

/* ---------------- 修改方式选择 ---------------- */

export type EditHow = 'new-version' | 'in-place';

/**
 * 点「修改」后先选方式：
 * - 发布新版本：基于当前版本修改全部内容，旧版本不变；
 * - 修改当前版本：没被引用时可改全部内容，被引用时只能改基本信息。
 */
export function EditChoice({ current, next, refs, pending, reviewNote, onCancel, onChoose }: {
  current: string; next: string; refs: string; pending?: string; reviewNote: string; onCancel: () => void; onChoose: (how: EditHow) => void;
}) {
  const [how, setHow] = useState<EditHow>(pending ? 'in-place' : 'new-version');
  const options: { id: EditHow; icon: ReactNode; title: string; body: string; disabled?: string }[] = [
    { id: 'new-version', icon: <GitBranchPlus size={icon.large} aria-hidden="true" />, title: `发布新版本 ${next}`, body: `基于 ${current} 修改全部内容；${current} 保持不变，引用它的 Agent 不受影响，需要时由 Agent 负责人新建候选版本升级。${reviewNote}`,
      disabled: pending ? `${pending} 正在审核，审核通过或撤回后才能再发布新版本` : undefined },
    { id: 'in-place', icon: <PencilLine size={icon.large} aria-hidden="true" />, title: `修改当前版本 ${current}`,
      body: refs ? `${current} 已被引用（${refs}）：只能修改负责人、描述等基本信息，影响行为的字段会锁定。` : `${current} 还没有被引用，可以直接修改全部内容，不产生新版本。` },
  ];
  return <div className="edit-choice" role="radiogroup" aria-label="修改方式">
    <strong>选择修改方式</strong>
    {options.map(option => <button type="button" key={option.id} role="radio" aria-checked={how === option.id} disabled={Boolean(option.disabled)} className={`edit-option ${how === option.id ? 'selected' : ''}`} onClick={() => setHow(option.id)}>
      {option.icon}<span><b>{option.title}</b><small>{option.disabled ?? option.body}</small></span></button>)}
    <div className="inline-actions"><Button onClick={onCancel}>取消</Button><Button variant="primary" onClick={() => onChoose(how)}>继续</Button></div>
  </div>;
}

/** 审核中的版本：模拟审核通过 / 撤回 */
export function PendingBanner({ version, reviewer, onApprove, onWithdraw }: { version: string; reviewer: string; onApprove: () => void; onWithdraw?: () => void }) {
  return <div className="pending-banner"><span><b>{version} 审核中</b><small className="meta">等待{reviewer}审核；通过后成为最新版本，已引用旧版本的 Agent 不受影响。</small></span>
    <span className="inline-actions">{onWithdraw && <Button onClick={onWithdraw}>撤回</Button>}<Button onClick={onApprove}>模拟审核通过</Button></span></div>;
}
