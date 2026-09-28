import type { ReactNode } from 'react';
import { ScopeBadge } from '../badges/Badges';

export function SectionHeading({ eyebrow, title, description, aside }: { eyebrow: string; title: string; description: string; aside?: ReactNode }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{aside}</div>;
}

export function Card({ children, className = '', title }: { children: ReactNode; className?: string; title?: string }) { return <section className={`card ${className}`} title={title}>{children}</section>; }

export function Placeholder({ title, description, phase = 'MVP' }: { title: string; description: string; phase?: 'MVP' | '二期' }) {
  return <Card className={phase === '二期' ? 'phase2-block' : ''} title={phase === '二期' ? '二期建设' : undefined}><div className="placeholder-header"><ScopeBadge phase={phase} /><h3>{title}</h3></div><p>{description}</p>{phase === '二期' && <span className="meta">二期建设</span>}</Card>;
}
