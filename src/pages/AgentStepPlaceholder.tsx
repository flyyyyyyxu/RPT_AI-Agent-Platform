import type { Agent } from '../types/domain';
import { lifecycleSteps } from '../data/mock';
import { AgentShell } from '../layouts/AgentShell';
import { FeatureMark, SkeletonBadge, ScopeBadge, StatusBadge, VersionBadge } from '../components/badges/Badges';
import { Card, Placeholder, SectionHeading } from '../components/content/Content';

const stepInfo: Record<string, { description: string; skeleton: number; feature?: string }> = {
  build: { description: '管理模型、Prompt、工具与知识，形成不可修改的版本快照。', skeleton: 1 },
  evaluation: { description: '上线前验证候选版本，并检查强制评测门槛。', skeleton: 2, feature: '强制上线门槛' },
  release: { description: '受控发布、流量灰度和业务指标 AB 实验。', skeleton: 3, feature: '流量灰度 + 业务指标 AB' },
  monitor: { description: '查看运行状态、业务指标和成本。', skeleton: 7, feature: '公司内部基建打通' },
  trace: { description: '追溯每次运行并归因 bad case。', skeleton: 8 },
  settings: { description: '管理 Agent 的基础资料与运行策略。', skeleton: 10 },
};

export function AgentStepPlaceholder({ agent, stepId }: { agent: Agent; stepId: string }) {
  const info = stepInfo[stepId] ?? stepInfo.build;
  const title = lifecycleSteps.find(step => step.id === stepId)?.label ?? '设置';
  const aside = <><Card><span className="eyebrow">版本信息</span><h3>当前线上指向</h3><p>{agent.productionVersion ? <><VersionBadge version={agent.productionVersion} /> <StatusBadge status="线上" /></> : <span className="meta">尚未发布</span>}</p><p className="meta">版本快照包含模型、Prompt、编排、工具、知识和运行策略。</p></Card><Card><span className="eyebrow">本月概览</span><h3>¥{agent.costThisMonth.toLocaleString('zh-CN')}</h3><p className="meta">演示成本 · {agent.team}</p></Card></>;
  return <AgentShell agent={agent} stepId={stepId} aside={aside}>
    <SectionHeading eyebrow="Agent 生命周期" title={title} description={info.description} aside={<div className="flex items-center gap-2"><SkeletonBadge number={info.skeleton} /><ScopeBadge phase="MVP" /></div>} />
    {info.feature && <FeatureMark><strong>{info.feature}</strong><p>此处保留差异化能力的位置，后续填入具体操作与数据。</p></FeatureMark>}
    <Placeholder title={`${title}主操作区`} description="布局与组件已就位；本阶段暂不实现具体业务操作。" />
    <Placeholder phase="二期" title="扩展能力" description="后续阶段规划的功能位置。" />
  </AgentShell>;
}
