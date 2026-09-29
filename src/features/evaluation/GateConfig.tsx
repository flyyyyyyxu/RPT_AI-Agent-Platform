/** ② 上线门槛配置：按指标设阈值、红线样本单列、强制阻断开关。 */
import { useDemo } from '../../core/store/DemoProvider';
import { evaluateGate, formatGateValue } from '../../core/rules/gate';
import type { Agent, AgentVersion } from '../../types/domain';
import { StatusBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';
import { Switch } from '../../shared/components/controls';
import { opLabel } from './GateSummary';

const stepFor = (unit: string) => unit === '%' ? 0.1 : unit === 's' ? 0.01 : 1;

/** 上线门槛配置：按指标设阈值、红线样本单列、强制阻断开关。 */
export function GateConfig({ agent, version }: { agent: Agent; version: AgentVersion | null }) {
  const { opsOf, updateOps } = useDemo();
  const ops = opsOf(agent);
  const gate = evaluateGate(agent, ops, version);
  const setThreshold = (id: string, value: number) => updateOps(agent.id, current => ({ ...current, thresholds: { ...current.thresholds, [id]: value } }));
  return <Capability title="上线门槛配置" description="门槛由 Agent 负责人按业务指标设置；候选版本不达标时，发布页的「生产就绪检查」会阻断发布。修改即时生效。">
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
