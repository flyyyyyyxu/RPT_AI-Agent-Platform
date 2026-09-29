/** 平台级页面占位（评测中心、运维与成本、设置）：二期建设，整块置灰、不可操作。 */
import { ScopeBadge } from '../../shared/components/Badges';
import { SectionHeading, Placeholder } from '../../shared/components/Content';

export function PlatformPlaceholder({ title, description }: { title: string; description: string }) {
  return <div><div className="page-heading"><span className="eyebrow">平台能力</span><h1>{title}</h1><p>{description}</p></div><SectionHeading eyebrow="二期建设" title="暂不开放" description="本原型聚焦 Agent 工作台，平台级页面在二期建设。" aside={<ScopeBadge phase="二期" />} /><Placeholder phase="二期" title={`${title}主操作区`} description="页面内容将在二期按具体任务设计。" /></div>;
}
