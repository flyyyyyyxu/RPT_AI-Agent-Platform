import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card } from './Content';
import { icon } from '../styles/tokens';

/** 颜色表示好坏，不表示涨跌：good=true 用翠绿，good=false 用错误红；箭头表示方向。 */
export function MetricCard({ label, value, change, direction, good, detail }: { label: string; value: string; change?: string; direction?: 'up' | 'down'; good?: boolean; detail: string }) {
  return <Card className="metric-card"><span className="meta">{label}</span><strong className="metric-value">{value}</strong>
    {change && direction ? <div className={`metric-change ${good ? 'positive' : 'negative'}`}>
      {direction === 'up' ? <ArrowUp size={icon.small} aria-hidden="true" /> : <ArrowDown size={icon.small} aria-hidden="true" />}
      <span className="sr-only">{direction === 'up' ? '上升' : '下降'}</span>{change}<span className="metric-detail">{detail}</span>
    </div> : <div className="metric-change metric-change-empty"><span className="metric-detail">{detail}</span></div>}
  </Card>;
}

export interface Column<Row> { key: keyof Row; label: string; numeric?: boolean; width?: 'narrow' | 'medium' | 'wide' }
export function DataTable<Row extends Record<string, ReactNode>>({ columns, rows }: { columns: Column<Row>[]; rows: Row[] }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr>{columns.map(column => <th key={String(column.key)} className={`${column.numeric ? 'numeric' : ''} ${column.width ? `col-${column.width}` : ''}`}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{columns.map(column => <td key={String(column.key)} className={column.numeric ? 'numeric' : ''}><span className="truncate" title={typeof row[column.key] === 'string' ? String(row[column.key]) : undefined}>{row[column.key]}</span></td>)}</tr>)}</tbody></table></div>;
}

export function CompareView({ leftTitle, rightTitle, left, right }: { leftTitle: ReactNode; rightTitle: ReactNode; left: ReactNode; right: ReactNode }) {
  return <div className="compare-view"><Card><span className="eyebrow">旧版本</span><h3>{leftTitle}</h3>{left}</Card><Card><span className="eyebrow">新版本</span><h3>{rightTitle}</h3>{right}</Card></div>;
}
