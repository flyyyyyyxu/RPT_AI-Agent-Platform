import type { ReactNode } from 'react';
import { ScopeBadge } from './Badges';

/**
 * 能力卡片：标题、一句解释、MVP / 二期徽章和内容。
 * - 二期：灰色虚线、整块置灰、不可操作，悬停提示「二期建设」
 */
export function Capability({ phase = 'MVP', title, description, children, className = '', actions, demo }: {
  phase?: 'MVP' | '二期'; title: ReactNode; description: ReactNode; children?: ReactNode; className?: string; actions?: ReactNode; demo?: string;
}) {
  if (phase === '二期') {
    return <section className={`card capability phase2-block ${className}`} title="二期建设" aria-disabled="true">
      <div className="capability-head"><div className="capability-title"><h3>{title}</h3><p>{description}</p></div><ScopeBadge phase="二期" /></div>
      <span className="meta">二期建设 · 暂不开放</span>
    </section>;
  }
  return <section className={`card capability ${className}`} data-demo={demo}>
    <div className="capability-head"><div className="capability-title"><h3>{title}</h3><p>{description}</p></div><div className="capability-side"><ScopeBadge phase="MVP" />{actions}</div></div>
    {children}
  </section>;
}

/** 多个二期能力的占位行。 */
export function Phase2Row({ items }: { items: { title: string; description: string }[] }) {
  return <div className="phase2-row">{items.map(item => <div key={item.title} className="phase2-block phase2-item" title="二期建设" aria-disabled="true">
    <div className="phase2-item-head"><strong>{item.title}</strong><ScopeBadge phase="二期" /></div><p>{item.description}</p><span className="meta">二期建设</span>
  </div>)}</div>;
}
