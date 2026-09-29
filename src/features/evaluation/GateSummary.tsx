/** ② 评测报告顶部的上线门槛结论。 */
import { AlertCircle, AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { evaluateGate, formatGateValue } from '../../core/rules/gate';
import type { Agent, AgentVersion } from '../../types/domain';
import { DemoTag, VersionBadge } from '../../shared/components/Badges';
import { icon } from '../../shared/styles/tokens';

export const opLabel = { '>=': '≥', '<=': '≤' } as const;

/** 评测报告顶部：门槛是否通过。 */
export function GateSummary({ agent, version }: { agent: Agent; version: AgentVersion }) {
  const { opsOf } = useDemo();
  const ops = opsOf(agent);
  const gate = evaluateGate(agent, ops, version);
  const tone = !gate.evaluated ? 'pending' : gate.passed ? 'passed' : ops.forceBlock ? 'blocked' : 'warned';
  const Icon = { pending: CircleDashed, passed: CheckCircle2, blocked: ShieldAlert, warned: AlertTriangle }[tone];
  const verdict = { pending: '上线门槛：待评测', passed: '上线门槛：通过', blocked: '上线门槛：未通过 · 发布已阻断', warned: '上线门槛：未通过 · 仅提醒' }[tone];
  const detail = { pending: `${version.id} 完成隔离环境评测后判断是否满足门槛。`, passed: `${version.id} 的 ${gate.rules.length} 项指标、${gate.redlines.length} 条红线样本全部达标，可进入生产就绪检查。`, blocked: `${[...gate.failedRules.map(rule => `${rule.metric} ${formatGateValue(rule.value, rule.unit)}（门槛 ${opLabel[rule.op]} ${formatGateValue(rule.threshold, rule.unit)}）`), ...(gate.failedRedlines.length ? [`红线样本漏判 ${gate.failedRedlines.length} 条（${gate.failedRedlines.map(item => item.name).join('、')}）`] : [])].join('；')}。已开启强制阻断，发布按钮不可用。`, warned: '未开启强制阻断：生产就绪检查会显示警告，但不阻止发布。' }[tone];
  return <div className={`gate-summary ${tone}`} role="status" data-demo="gate-summary"><Icon size={icon.large} aria-hidden="true" /><div>
    <div className="gate-verdict"><strong>{verdict}</strong><VersionBadge version={version.id} /><DemoTag /></div>
    <p>{detail}</p>
    {gate.evaluated && <div className="gate-chips">{gate.rules.map(rule => <span key={rule.id} className={`gate-chip ${rule.pass ? 'pass' : 'fail'}`}>{rule.pass ? <CheckCircle2 size={icon.small} aria-hidden="true" /> : <AlertCircle size={icon.small} aria-hidden="true" />}{rule.metric} {formatGateValue(rule.value, rule.unit)}</span>)}
      <span className={`gate-chip ${gate.failedRedlines.length ? 'fail' : 'pass'}`}>{gate.failedRedlines.length ? <AlertCircle size={icon.small} aria-hidden="true" /> : <CheckCircle2 size={icon.small} aria-hidden="true" />}红线样本 {gate.redlines.length - gate.failedRedlines.length}/{gate.redlines.length}</span></div>}
  </div></div>;
}
