/** 平台级页面占位（评测中心、运维与成本、设置）。 */
import { SectionHeading, Placeholder } from '../../shared/components/Content';

export function PlatformPlaceholder({ title, description }: { title: string; description: string }) {
  return <div><div className="page-heading"><span className="eyebrow">平台基础能力</span><h1>{title}</h1><p>{description}</p></div><SectionHeading eyebrow="页面框架" title="工作区占位" description="此阶段只建立统一布局，具体业务流程将在后续补充。" /><Placeholder title={`${title}主操作区`} description="页面内容待后续按具体任务设计。" /></div>;
}
