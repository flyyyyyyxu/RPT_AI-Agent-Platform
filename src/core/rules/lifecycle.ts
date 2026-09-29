import type { Agent } from '../../types/domain';
import { getCandidate, getExperiment, isEvaluated } from './versions';

export type StepState = '已完成' | '进行中' | '可查看' | '未开始';

/**
 * 生命周期状态：构建、评测、发布按「本次迭代」（候选版本）计算；
 * 观测（监控和 Trace 两个标签页）看的是线上版本，只要有线上版本就可以查看，不受候选版本影响。
 */
export function lifecycleState(agent: Agent): Record<string, StepState> {
  const candidate = getCandidate(agent);
  const online = Boolean(agent.productionVersion);
  const experiment = getExperiment(agent);
  const done = (value: boolean): StepState => value ? '已完成' : '未开始';
  return {
    build: candidate ? done(candidate.configured && candidate.debugged) : done(online),
    evaluation: candidate ? done(isEvaluated(candidate)) : done(online),
    release: experiment ? '进行中' : candidate ? '未开始' : done(online),
    observe: !online ? '未开始' : agent.monitored ? '已完成' : '可查看',
    monitor: !online ? '未开始' : agent.monitored ? '已完成' : '可查看',
    trace: online ? '可查看' : '未开始',
  };
}
