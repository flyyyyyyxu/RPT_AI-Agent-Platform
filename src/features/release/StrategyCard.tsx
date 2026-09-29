/** ③ 发布策略：直接发布 / 比例灰度 / 影子运行、灰度比例、会话粘性、审批记录。 */
import type { Agent, AgentOps, ReleaseStrategy } from '../../types/domain';
import { Capability } from '../../shared/components/Capability';
import { Switch } from '../../shared/components/controls';
import { strategyLabels, bucketLabel } from './labels';

/* ---------------- ③ 发布策略 ---------------- */
export function StrategyCard({ agent, ops, update, locked }: { agent: Agent; ops: AgentOps; update: (patch: Partial<AgentOps>) => void; locked?: string }) {
  const strategy: ReleaseStrategy = agent.productionVersion ? ops.strategy : 'direct';
  return <Capability skeleton={[3]} demo="strategy" title="发布策略" description="选择新版本进入生产的方式；比例灰度和影子运行都不改变线上指向。">
    <div className="strategy-grid"><div className="settings-grid">
      <div className="strategy-options" role="radiogroup" aria-label="发布策略">{(Object.keys(strategyLabels) as ReleaseStrategy[]).map(key => {
        const disabled = Boolean(locked) || (!agent.productionVersion && key !== 'direct');
        return <button key={key} type="button" role="radio" aria-checked={strategy === key} className={`strategy-option ${strategy === key ? 'selected' : ''}`} disabled={disabled} title={!agent.productionVersion && key !== 'direct' ? '首次发布没有线上版本可对照，只能直接发布' : locked} onClick={() => update({ strategy: key })}><strong>{strategyLabels[key].title}</strong><small>{strategyLabels[key].description}</small></button>;
      })}</div>
      {locked && <p className="meta">{locked}</p>}
      {!agent.productionVersion && <p className="meta">首次发布没有线上版本可对照，只能直接发布。</p>}
      {strategy === 'canary' && <div className="range-field"><span className="field-label">灰度比例<span className="range-value">{ops.canaryPercent}%</span></span>
        <input type="range" min={1} max={50} step={1} value={ops.canaryPercent} disabled={Boolean(locked)} aria-label="灰度比例" onChange={event => update({ canaryPercent: Number(event.target.value) })} />
        <span className="range-scale meta"><span>1%</span><span>{bucketLabel(ops)}</span><span>50%</span></span></div>}
      <Switch checked={ops.sticky} disabled={Boolean(locked) || strategy === 'shadow'} onChange={value => update({ sticky: value })} label="会话粘性" />
      <p className="meta">{strategy === 'shadow' ? '影子运行不向用户返回结果，无需会话粘性。' : ops.sticky ? '同一用户 / 会话在灰度期间固定命中同一版本，多轮对话不会中途切版本。' : '未开启：多轮会话可能在两个版本之间切换，影响体验和指标归因。'}</p>
    </div>
      <div><div className="sub-heading"><h4>审批记录</h4><span className="meta">{ops.approvals.length} 条</span></div>
        {ops.approvals.length ? <ol className="approval-list">{ops.approvals.map((item, index) => <li key={`${item.time}-${index}`}><strong>{item.action}</strong><p>{item.who} · {item.time}</p></li>)}</ol> : <p className="meta">暂无审批记录。</p>}</div>
    </div>
  </Capability>;
}
