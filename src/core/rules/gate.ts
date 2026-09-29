import { gateFor } from '../data-access/scenarioData';
import type { Agent, AgentOps, AgentVersion, GateRule } from '../../types/domain';
import { isEvaluated } from './versions';

export const formatGateValue = (value: number, unit: string) => unit === '%' ? `${value.toFixed(1)}%` : unit === 's' ? `${value.toFixed(2)}s` : `${value} ${unit}`;

export interface GateRuleResult extends GateRule { pass: boolean }

/** 上线门槛：按指标阈值 + 红线样本判断候选版本是否可以上线。结果只读 mock。 */
export function evaluateGate(agent: Agent, ops: AgentOps, version: AgentVersion | null) {
  const profile = gateFor(agent, version);
  const evaluated = Boolean(version && isEvaluated(version));
  const rules: GateRuleResult[] = profile.rules.map(rule => {
    const threshold = ops.thresholds[rule.id] ?? rule.threshold;
    return { ...rule, threshold, pass: rule.op === '>=' ? rule.value >= threshold : rule.value <= threshold };
  });
  const failedRules = rules.filter(rule => !rule.pass);
  const failedRedlines = profile.redlines.filter(item => !item.passed);
  const passed = evaluated && failedRules.length === 0 && failedRedlines.length === 0;
  return { evaluated, rules, redlines: profile.redlines, failedRules, failedRedlines, passed, blocking: evaluated && !passed && ops.forceBlock };
}

export interface ReadinessItem { key: string; label: string; done: boolean; warn?: boolean; optional?: boolean; detail: string; link?: { to: string; label: string } }

/** 发布前「生产就绪检查」。任一项未完成时发布按钮禁用。 */
export function readinessChecks(agent: Agent, ops: AgentOps, candidate: AgentVersion | null, options: { approvalOptional?: boolean } = {}): ReadinessItem[] {
  const gate = evaluateGate(agent, ops, candidate);
  const g = ops.settings.guardrails;
  const enabledGuards = [g.format && '格式校验', g.citation && '引用校验', g.promise && '承诺类话术拦截', g.safety && '内容安全'].filter(Boolean) as string[];
  const settingsLink = { to: `/agents/${agent.id}/settings`, label: '前往设置' };
  const gateDetail = !candidate ? '没有候选版本'
    : !gate.evaluated ? '候选版本尚未在隔离环境完成评测'
    : gate.passed ? `${gate.rules.length} 项指标、${gate.redlines.length} 条红线样本全部通过`
    : `${gate.failedRules.map(rule => rule.metric).join('、')}${gate.failedRedlines.length ? `、${gate.failedRedlines.length} 条红线样本` : ''}未达标${ops.forceBlock ? '（已开启强制阻断）' : '（未开启强制阻断，仅提醒）'}`;
  return [
    { key: 'gate', label: '上线门槛已通过', done: gate.passed || (gate.evaluated && !ops.forceBlock), warn: gate.evaluated && !gate.passed && !ops.forceBlock, detail: gateDetail, link: { to: `/agents/${agent.id}/evaluation`, label: '查看评测' } },
    { key: 'guardrails', label: '已配置护栏', done: g.safety && enabledGuards.length >= 2, detail: enabledGuards.length ? `已开启：${enabledGuards.join('、')}${g.safety ? '' : '；内容安全必须开启'}` : '尚未开启任何护栏规则', link: settingsLink },
    { key: 'owner', label: '已设置负责人', done: Boolean(agent.owner), detail: agent.owner ? `负责人 ${agent.owner} · ${agent.team}值班组` : '未设置负责人' },
    { key: 'alerts', label: '已配置告警', done: ops.settings.alerts, detail: ops.settings.alerts ? '错误率、P95 延迟、预算告警已接入公司监控' : '未配置告警规则，上线后异常无人感知', link: settingsLink },
    { key: 'approval', label: '已审批', done: Boolean(candidate && ops.approvedVersion === candidate.id), optional: options.approvalOptional && !(candidate && ops.approvedVersion === candidate.id), detail: !candidate ? '—' : ops.approvedVersion === candidate.id ? `${candidate.id} 已审批通过` : ops.approvalPending === candidate.id ? `${candidate.id} 审批中，等待负责人确认` : options.approvalOptional ? '影子运行不影响用户，全量发布前再审批' : `${candidate.id} 尚未提交审批` },
  ];
}
