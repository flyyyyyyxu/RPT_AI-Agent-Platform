import type { ReactNode } from 'react';
import { Layers, Sparkles } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { ScopeBadge, SkeletonBadge } from './Badges';
import { icon } from '../styles/tokens';

/** 四个主角：外部产品普遍薄弱的差异化能力。 */
export const heroNames: Record<1 | 2 | 3 | 4, string> = {
  1: '强制上线门槛',
  2: '流量灰度 + 业务指标 AB',
  3: '含知识的版本快照 + 分钟级回退',
  4: '与公司内部基建打通',
};

export type HeroId = keyof typeof heroNames;

export function useSkeletonView() { return useDemo().state.viewMode === 'skeleton'; }

/** 只在「显示生产骨架」时渲染。 */
export function SkeletonOnly({ children }: { children: ReactNode }) { return useSkeletonView() ? <>{children}</> : null; }

export function HeroTag({ n, compact = false }: { n: HeroId; compact?: boolean }) {
  return <span className="hero-tag" title={`差异化能力 · 主角 ${n}：${heroNames[n]}`}><Sparkles size={icon.small} aria-hidden="true" />差异化 · 主角 {n}{compact ? '' : ` ${heroNames[n]}`}</span>;
}

export function CapabilityBadges({ skeleton, phase = 'MVP' }: { skeleton: number[]; phase?: 'MVP' | '二期' }) {
  return <span className="capability-badges">{skeleton.map(number => <SkeletonBadge key={number} number={number} />)}<ScopeBadge phase={phase} /></span>;
}

/**
 * 生产骨架能力卡片：自带骨架编号徽章和 MVP / 二期徽章。
 * - 「只看基础能力」时整块不渲染
 * - 二期：灰色虚线、整块置灰、不可操作，悬停提示「二期建设」
 * - 主角能力：左侧 3px 靛蓝色条 + 「差异化 · 主角 N」标签
 */
export function Capability({ skeleton, phase = 'MVP', hero, title, description, children, className = '', actions, demo }: {
  skeleton: number[]; phase?: 'MVP' | '二期'; hero?: HeroId | HeroId[]; title: ReactNode; description: ReactNode; children?: ReactNode; className?: string; actions?: ReactNode; demo?: string;
}) {
  const visible = useSkeletonView();
  if (!visible) return null;
  const heroes = hero === undefined ? [] : Array.isArray(hero) ? hero : [hero];
  if (phase === '二期') {
    return <section className={`card capability phase2-block ${className}`} title="二期建设" aria-disabled="true">
      <div className="capability-head"><div className="capability-title"><h3>{title}</h3><p>{description}</p></div><CapabilityBadges skeleton={skeleton} phase="二期" /></div>
      <span className="meta">二期建设 · 暂不开放</span>
    </section>;
  }
  return <section className={`card capability ${heroes.length ? 'capability-hero' : ''} ${className}`} data-demo={demo}>
    {heroes.length > 0 && <div className="hero-tags">{heroes.map(n => <HeroTag key={n} n={n} />)}</div>}
    <div className="capability-head"><div className="capability-title"><h3>{title}</h3><p>{description}</p></div><div className="capability-side"><CapabilityBadges skeleton={skeleton} />{actions}</div></div>
    {children}
  </section>;
}

/** 多个二期能力的占位行。 */
export function Phase2Row({ items }: { items: { skeleton: number[]; title: string; description: string }[] }) {
  if (!useSkeletonView()) return null;
  return <div className="phase2-row">{items.map(item => <div key={item.title} className="phase2-block phase2-item" title="二期建设" aria-disabled="true">
    <div className="phase2-item-head"><strong>{item.title}</strong><CapabilityBadges skeleton={item.skeleton} phase="二期" /></div><p>{item.description}</p><span className="meta">二期建设</span>
  </div>)}</div>;
}

/** 生产骨架区块标题（基础视图下隐藏）。 */
export function SkeletonHeading({ skeleton, title, description }: { skeleton: number[]; title: string; description: string }) {
  if (!useSkeletonView()) return null;
  return <div className="section-heading skeleton-heading"><div><span className="eyebrow"><Layers size={icon.small} aria-hidden="true" />生产骨架</span><h2>{title}</h2><p>{description}</p></div><span className="capability-badges">{skeleton.map(number => <SkeletonBadge key={number} number={number} />)}</span></div>;
}
