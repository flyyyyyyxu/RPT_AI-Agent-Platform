import { AlertCircle, AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert } from 'lucide-react';
import { useDemo } from '../../app/DemoProvider';
import { evaluateGate, formatGateValue } from '../../app/gate';
import type { Agent, AgentVersion } from '../../types/domain';
import { DemoTag, StatusBadge, VersionBadge } from '../badges/Badges';
import { Capability, HeroTag, Switch, useSkeletonView } from '../skeleton/Skeleton';

const opLabel = { '>=': '≥', '<=': '≤' } as const;
const stepFor = (unit: string) => unit === '%' ? 0.1 : unit === 's' ? 0.01 : 1;

/** 评测报告顶部：门槛是否通过。 */
export function GateSummary({ agent, version }: { agent: Agent; version: AgentVersion }) {
  const { opsOf } = useDemo();
  const skeletonView = useSkeletonView();
  if (!skeletonView) return null;
  const ops = opsOf(agent);
  const gate = evaluateGate(agent, ops, version);
  const tone = !gate.evaluated ? 'pending' : gate.passed ? 'passed' : ops.forceBlock ? 'blocked' : 'warned';
  const Icon = { pending: CircleDashed, passed: CheckCircle2, blocked: ShieldAlert, warned: AlertTriangle }[tone];
  const verdict = { pending: '上线门槛：待评测', passed: '上线门槛：通过', blocked: '上线门槛：未通过 · 发布已阻断', warned: '上线门槛：未通过 · 仅提醒' }[tone];
  const detail = { pending: `${version.id} 完成隔离环境评测后判断是否满足门槛。`, passed: `${version.id} 的 ${gate.rules.length} 项指标、${gate.redlines.length} 条红线样本全部达标，可进入发布前检查。`, blocked: `${[...gate.failedRules.map(rule => `${rule.metric} ${formatGateValue(rule.value, rule.unit)}（门槛 ${opLabel[rule.op]} ${formatGateValue(rule.threshold, rule.unit)}）`), ...(gate.failedRedlines.length ? [`红线样本漏判 ${gate.failedRedlines.length} 条（${gate.failedRedlines.map(item => item.name).join('、')}）`] : [])].join('；')}。已开启强制阻断，发布按钮不可用。`, warned: '未开启强制阻断：发布前检查会显示警告，但不阻止发布。' }[tone];
  return <div className={`gate-summary ${tone}`} role="status" data-demo="gate-summary"><Icon size={20} aria-hidden="true" /><div>
    <div className="gate-verdict"><strong>{verdict}</strong><VersionBadge version={version.id} /><HeroTag n={1} compact /><DemoTag /></div>
    <p>{detail}</p>
    {gate.evaluated && <div className="gate-chips">{gate.rules.map(rule => <span key={rule.id} className={`gate-chip ${rule.pass ? 'pass' : 'fail'}`}>{rule.pass ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}{rule.metric} {formatGateValue(rule.value, rule.unit)}</span>)}
      <span className={`gate-chip ${gate.failedRedlines.length ? 'fail' : 'pass'}`}>{gate.failedRedlines.length ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}红线样本 {gate.redlines.length - gate.failedRedlines.length}/{gate.redlines.length}</span></div>}
  </div></div>;
}

/** 上线门槛配置：按指标设阈值、红线样本单列、强制阻断开关。 */
export function GateConfig({ agent, version }: { agent: Agent; version: AgentVersion | null }) {
  const { opsOf, updateOps } = useDemo();
  const ops = opsOf(agent);
  const gate = evaluateGate(agent, ops, version);
  const setThreshold = (id: string, value: number) => updateOps(agent.id, current => ({ ...current, thresholds: { ...current.thresholds, [id]: value } }));
  return <Capability skeleton={[2]} hero={1} title="上线门槛配置" description="门槛由 Agent 负责人按业务指标设置；候选版本不达标时，发布页的「生产就绪检查」会阻断发布。修改即时生效。">
    <div className="table-scroll"><table className="data-table gate-table"><thead><tr><th className="col-metric">指标</th><th className="col-op">条件</th><th className="col-threshold">阈值</th><th className="col-value numeric">{version ? `${version.id} 结果` : '候选结果'}</th><th className="col-state">状态</th></tr></thead>
      <tbody>{gate.rules.map(rule => <tr key={rule.id}><td><span className="metric-name" title={`${rule.metric} · ${rule.note}`}><strong>{rule.metric}</strong><small className="meta">{rule.note}</small></span></td><td>{opLabel[rule.op]}</td>
        <td><span className="threshold-input"><input type="number" step={stepFor(rule.unit)} value={rule.threshold} aria-label={`${rule.metric}阈值`} onChange={event => { const value = Number(event.target.value); if (!Number.isNaN(value)) setThreshold(rule.id, value); }} /><span className="meta">{rule.unit}</span></span></td>
        <td className="numeric">{gate.evaluated ? formatGateValue(rule.value, rule.unit) : '—'}</td>
        <td>{gate.evaluated ? <StatusBadge status={rule.pass ? '通过' : ops.forceBlock ? '阻断' : '警告'} /> : <span className="meta">待评测</span>}</td></tr>)}</tbody></table></div>
    <div><div className="sub-heading"><h4>红线样本（单列，零容忍）</h4><span className="meta">任一条不通过即不满足门槛，阈值不可调整</span></div>
      <div className="redline-list">{gate.redlines.map(item => <div className="redline-item" key={item.name}><div><strong>{item.name}</strong><small className="meta" title={item.input}>{item.input}</small></div>{gate.evaluated ? <StatusBadge status={item.passed ? '通过' : '阻断'} /> : <span className="meta">待评测</span>}</div>)}</div></div>
    <div className="gate-footer"><Switch checked={ops.forceBlock} onChange={value => updateOps(agent.id, current => ({ ...current, forceBlock: value }))} label="强制阻断" />
      <span className="meta">{ops.forceBlock ? '门槛不通过时，发布按钮禁用并说明原因。' : '关闭后门槛不通过只提醒、不阻断；建议生产等级 Agent 保持开启。'}</span></div>
  </Capability>;
}
