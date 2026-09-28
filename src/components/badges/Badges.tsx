import { AlertCircle, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

export type Status = '线上' | '通过' | '灰度中' | '进行中' | '待审批' | '警告' | '阻断' | '失败' | '错误' | '草稿' | '二期' | '待发布' | '历史' | '影子运行' | '已审批' | '未完成';
const tones: Record<Status, string> = {
  线上: 'success', 通过: 'success', 灰度中: 'progress', 进行中: 'progress', 待审批: 'warning', 警告: 'warning', 待发布: 'warning',
  影子运行: 'progress', 已审批: 'success', 未完成: 'neutral', 阻断: 'error', 失败: 'error', 错误: 'error', 草稿: 'neutral', 历史: 'history', 二期: 'phase2',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge tone-${tones[status]}`} title={status === '二期' ? '二期建设' : undefined}>
    {tones[status] === 'error' && <AlertCircle aria-hidden="true" size={16} strokeWidth={1.5} />}{status}
  </span>;
}

export function ScopeBadge({ phase }: { phase: 'MVP' | '二期' }) {
  return <span className={`scope-badge ${phase === '二期' ? 'scope-badge-later' : ''}`} title={phase === '二期' ? '二期建设' : undefined}>{phase}</span>;
}

export function SkeletonBadge({ number }: { number: number }) {
  const numerals = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  return <span className="skeleton-badge" aria-label={`生产骨架第 ${number} 项`}>{numerals[number - 1]}</span>;
}

export function FeatureMark({ children }: { children: ReactNode }) {
  return <div className="feature-mark"><span className="feature-label">差异化</span>{children}</div>;
}

export function VersionBadge({ version }: { version: string }) { return <span className="version-badge">{version}</span>; }
export function IntegrationNote({ platform }: { platform: string }) { return <span className="integration-note"><ExternalLink size={16} strokeWidth={1.5} aria-hidden="true" />已接入公司{platform}平台</span>; }
export function DemoBadge() { return <span className="demo-badge">演示数据</span>; }
