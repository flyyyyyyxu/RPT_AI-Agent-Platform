/** 发布策略的名称说明，以及灰度分桶方式的文案。 */
import type { AgentOps, ReleaseStrategy } from '../../types/domain';

export const strategyLabels: Record<ReleaseStrategy, { title: string; short: string; description: string }> = {
  direct: { title: '直接发布', short: '直接发布', description: '线上指向立即切换到新版本，适合低风险变更。' },
  canary: { title: '比例灰度', short: '比例灰度', description: '按用户分桶切一部分流量，逐步放量。' },
  shadow: { title: '影子运行', short: '影子运行', description: '复制线上请求双跑，只对比不返回，适合批量和高风险场景。' },
};

/** 会话模式按会话 ID 分桶（多轮对话不会中途换版本），其它模式按用户 ID 分桶。 */
export const bucketLabel = (ops: AgentOps) => ops.settings.execMode === '会话' ? '按会话 ID 分桶' : '按用户 ID 哈希分桶';
