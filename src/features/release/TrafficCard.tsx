/** ④ ⑤ 流量指向：放量与回退，回退过程分阶段展示并显示耗时。 */
import type { ReactNode } from 'react';
import { ArrowRight, ArrowUp, CheckCircle2, CircleDashed, LoaderCircle, Radio, Timer } from 'lucide-react';
import { rampSteps } from '../../data';
import type { Agent, AgentOps, AgentVersion } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { DemoTag, StatusBadge, VersionBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';
import { bucketLabel } from './labels';

/* ---------------- ④ ⑤ 流量指向：放量与回退 ---------------- */
export interface SwitchState { from: string; to: string; stage: number; done: boolean }

export const switchStages = ['冻结发布操作', '网关切换线上指向', '排空进行中的会话', '健康检查与告警确认'];

export function TrafficCard({ agent, ops, experiment, rollbackTarget, switching, onRamp, rollbackAction }: {
  agent: Agent; ops: AgentOps; experiment: AgentVersion | null; rollbackTarget: AgentVersion | null; switching: SwitchState | null; onRamp: () => void; rollbackAction: ReactNode;
}) {
  const production = agent.productionVersion;
  const gray = experiment?.status === '灰度中' ? experiment : null;
  const shadow = experiment?.status === '影子运行' ? experiment : null;
  const traffic = gray?.traffic ?? 0;
  const next = rampSteps.find(step => step > traffic) ?? 100;
  return <Capability skeleton={[3, 5]} hero={[2, 3]} demo="traffic" title="流量指向" description="平台网关负责分流：发布、放量、回退都只是改变指向，版本快照本身不变。">
    {!production ? <p className="meta">尚未发布，暂无生产流量。</p> : <>
      <div className="pointer-cards">
        <div className="pointer-card active"><span className="meta"><Radio size={16} strokeWidth={1.5} aria-hidden="true" /> 线上指向</span><strong><VersionBadge version={production} /> <StatusBadge status="线上" /></strong><span className="meta">{gray ? `承接 ${100 - traffic}% 流量` : '承接全部生产流量'}</span></div>
        <ArrowRight className="pointer-arrow" size={20} aria-hidden="true" />
        {experiment ? <div className="pointer-card gray"><span className="meta">{gray ? '灰度分桶指向' : '影子双跑'}</span><strong><VersionBadge version={experiment.id} /> <StatusBadge status={experiment.status === '灰度中' ? '灰度中' : '影子运行'} /></strong><span className="meta">{gray ? `${traffic}% 流量 · ${bucketLabel(ops)} · ${ops.sticky ? '会话粘性已开启' : '未开启会话粘性'}` : '复制 100% 请求，不返回用户'}</span></div>
          : <div className="pointer-card"><span className="meta">可回退目标</span><strong>{rollbackTarget ? <VersionBadge version={rollbackTarget.id} /> : '—'}</strong><span className="meta">{rollbackTarget ? `${rollbackTarget.config.knowledge} · ${rollbackTarget.config.model}` : '没有曾上线的历史版本'}</span></div>}
      </div>
      <div className="traffic-split"><div className="traffic-bar" aria-label="流量分配">
        <span className="traffic-old" style={{ flexBasis: `${gray ? 100 - traffic : 100}%` }}>{production} · {gray ? 100 - traffic : 100}%</span>
        {gray && <span className="traffic-new" style={{ flexBasis: `${traffic}%` }}>{gray.id} · {traffic}%</span>}
        {shadow && <span className="traffic-shadow" style={{ flexBasis: '30%' }}>{shadow.id} 影子</span>}
      </div><div className="traffic-legend"><span><i className="traffic-old" />旧版本 {production}</span>{experiment && <span><i className="traffic-new" />新版本 {experiment.id}</span>}</div></div>
      {gray && <div className="ramp-steps" aria-label="放量节奏">{rampSteps.map(step => <span key={step} className={`ramp-step ${step === traffic ? 'current' : step < traffic ? 'done' : ''}`}>{step}%</span>)}</div>}
      {switching && <div className="card"><div className="sub-heading"><h4 className="pointer-flip">线上指向 <VersionBadge version={switching.from} /><ArrowRight size={16} aria-hidden="true" /><VersionBadge version={switching.to} /></h4><Timer size={16} aria-hidden="true" /></div>
        <ol className="switch-stages">{switchStages.map((label, index) => <li key={label} className={index < switching.stage ? 'done' : index === switching.stage ? 'active' : ''}>{index < switching.stage ? <CheckCircle2 size={16} aria-hidden="true" /> : index === switching.stage ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <CircleDashed size={16} aria-hidden="true" />}{label}</li>)}</ol></div>}
      {!switching && <div className="rollout-actions">
        {gray && <Button variant="primary" onClick={onRamp}><ArrowUp size={16} />{next >= 100 ? `全量放量：线上指向切到 ${gray.id}` : `放量到 ${next}%`}</Button>}
        <span className="rollback-slot" data-demo="rollback">{rollbackAction}</span>
      </div>}
    </>}
  </Capability>;
}

export function SwitchResult({ from, to, elapsed, note }: { from: string; to: string; elapsed: string; note: string }) {
  return <div className="switch-result" role="status" data-demo="switch-result"><CheckCircle2 size={20} aria-hidden="true" /><div><strong className="pointer-flip">线上指向 <del>{from}</del><ArrowRight size={16} aria-hidden="true" />{to}</strong><p>{note}</p></div><span className="elapsed" title="从确认回退到全部流量切换完成">耗时 {elapsed}</span><DemoTag /></div>;
}
