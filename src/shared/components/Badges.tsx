import { AlertCircle, ExternalLink } from 'lucide-react';
import { icon } from '../styles/tokens';

export type Status = '线上' | '通过' | '灰度中' | '进行中' | '待审批' | '警告' | '阻断' | '失败' | '错误' | '草稿' | '二期' | '待发布' | '历史' | '影子运行' | '已审批' | '未完成' | '成功' | '异常';
const tones: Record<Status, string> = {
  线上: 'success', 通过: 'success', 灰度中: 'progress', 进行中: 'progress', 待审批: 'warning', 警告: 'warning', 待发布: 'warning',
  影子运行: 'progress', 已审批: 'success', 未完成: 'neutral', 成功: 'success', 异常: 'warning', 阻断: 'error', 失败: 'error', 错误: 'error', 草稿: 'neutral', 历史: 'history', 二期: 'phase2',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status-badge tone-${tones[status]}`} title={status === '二期' ? '二期建设' : undefined}>
    {tones[status] === 'error' && <AlertCircle aria-hidden="true" size={icon.small} />}{status}
  </span>;
}

export function ScopeBadge({ phase }: { phase: 'MVP' | '二期' }) {
  return <span className={`scope-badge ${phase === '二期' ? 'scope-badge-later' : ''}`} title={phase === '二期' ? '二期建设' : undefined}>{phase}</span>;
}

export function VersionBadge({ version }: { version: string }) { return <span className="version-badge">{version}</span>; }
export function IntegrationNote({ platform }: { platform: string }) { return <span className="integration-note"><ExternalLink size={icon.small} aria-hidden="true" />已接入公司{platform}平台</span>; }
export function DemoBadge() { return <span className="demo-badge">演示数据</span>; }
/** 关键数字旁的「演示数据」标注。 */
export function DemoTag({ label = '演示数据' }: { label?: string }) { return <span className="demo-tag" title="本原型所有数字均为演示数据">{label}</span>; }
