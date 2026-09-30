/**
 * 线上干预：从 bad case 生成的临时止血措施（标准答案 / 拦截规则）。
 *   InterventionDrawer：创建表单，预填来自 bad case；
 *   InterventionList：生效中和已结束的干预，含有效期、关联 bad case、结束原因，可手动撤销。
 * 规则见 core/rules/interventions.ts。
 */
import { useState } from 'react';
import { ChevronDown, Clock3, ShieldAlert } from 'lucide-react';
import { interventionDays, interventionPresets } from '../../data';
import { addMinutes, demoNow } from '../../core/rules/clock';
import { interventionState } from '../../core/rules/interventions';
import type { Agent, AgentOps, BadCase, Intervention, InterventionKind } from '../../types/domain';
import { Button, ConfirmAction } from '../../shared/components/Buttons';
import { VersionBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';
import { Drawer } from '../../shared/components/Drawer';
import { Feedback } from '../../shared/components/Feedback';
import { Segmented } from '../../shared/components/controls';
import { icon } from '../../shared/styles/tokens';

export function InterventionDrawer({ agent, ops, badcase, onClose, onCreate }: { agent: Agent; ops: AgentOps; badcase: BadCase; onClose: () => void; onCreate: (item: Omit<Intervention, 'id' | 'createdAt' | 'expiresAt'>, days: number) => void }) {
  const preset = interventionPresets[badcase.id];
  /** 批量模式没有面向用户的回答：只能用拦截规则（转人工复核、改写判定），不能返回标准答案 */
  const batch = ops.settings.execMode === '批量';
  const defaultContent = (value: InterventionKind) => value === '标准答案' ? badcase.expected : batch ? '命中时不输出违规 / 不违规结论，改为「需人工复核」并进入人工审核队列。' : '拦截该回答，改为兜底话术并转人工。';
  const [kind, setKind] = useState<InterventionKind>(batch ? '拦截规则' : preset?.kind ?? '标准答案');
  const [trigger, setTrigger] = useState(preset?.trigger ?? (batch ? `内容命中「${badcase.summary}」同类特征` : `问题语义命中「${badcase.input}」`));
  const [content, setContent] = useState(preset && preset.kind === kind ? preset.content : defaultContent(batch ? '拦截规则' : preset?.kind ?? '标准答案'));
  const [days, setDays] = useState(3);
  const inEvalSet = Boolean(ops.badcases[badcase.id]?.inEvalSet);
  const missing = !trigger.trim() ? '命中条件' : !content.trim() ? (kind === '标准答案' ? '标准答案' : '规则动作') : null;
  const expires = addMinutes(demoNow(), days * 24 * 60);
  return <Drawer label="创建线上干预" eyebrow={`线上干预 · 关联 ${badcase.id}`} title="创建线上干预" meta={`针对线上 ${agent.productionVersion ?? '—'}：${batch ? '命中条件的内容按规则处理，不再直接采用模型判定。' : '命中条件的请求不再交给模型，直接返回标准答案或执行规则。'}`} onClose={onClose} demo="intervention-form"
    footer={<><span className={`foot-note ${missing ? 'is-missing' : ''}`}>{missing ? `还差一步：填写${missing}` : `立即生效，${days} 天后（约 ${expires.slice(5, 10)}）到期`}</span><Button onClick={onClose}>取消</Button><Button variant="primary" disabled={Boolean(missing)} onClick={() => onCreate({ badcaseId: badcase.id, kind, trigger: trigger.trim(), content: content.trim(), createdBy: agent.owner, appliesTo: agent.productionVersion ?? badcase.version }, days)}>立即生效</Button></>}>
    <div className="intervention-form">
      <div className="intervention-source"><strong>{badcase.summary}</strong><span className="meta">{badcase.source} · {badcase.time} · Trace {badcase.traceId} · <VersionBadge version={badcase.version} /></span></div>
      <div className="field-label">干预方式{batch ? <strong className="intervention-kind-fixed">拦截规则</strong> : <Segmented label="干预方式" value={kind} onChange={value => { setKind(value); setContent(preset?.kind === value ? preset.content : defaultContent(value)); }} options={[{ value: '标准答案', label: '标准答案' }, { value: '拦截规则', label: '拦截规则' }]} />}
        <span className="meta field-hint">{batch ? '批量模式没有面向用户的回答，只能用拦截规则：命中时改判为「需人工复核」或按规则处理。' : kind === '标准答案' ? '适合事实类错误：命中时直接返回人工确认过的答案（已按期望输出预填）。' : '适合风险类问题：命中时拦截、改写或转人工。'}</span></div>
      <label className="field-label">命中条件<input value={trigger} onChange={event => setTrigger(event.target.value)} /><span className="meta field-hint">按语义相似度匹配，演示中不实际匹配请求。</span></label>
      <label className="field-label">{kind === '标准答案' ? '标准答案' : '规则动作'}<textarea rows={4} value={content} onChange={event => setContent(event.target.value)} /></label>
      <label className="field-label">有效期<span className="select-field"><select value={days} onChange={event => setDays(Number(event.target.value))}>{interventionDays.map(day => <option key={day} value={day}>{day} 天</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>
        <span className="meta field-hint">最长 7 天。干预只是止血，根治要走新版本：修复版本在回归集上评测通过并成为线上版本后，干预自动失效。</span></label>
      {!inEvalSet && <p className="intervention-warn"><ShieldAlert size={icon.small} aria-hidden="true" />{badcase.id} 还没加入回归集：修复版本的回归覆盖不到它，这条干预只能等到期结束。建议先纳入本轮优化（会自动加入回归集）。</p>}
    </div>
  </Drawer>;
}

export function InterventionList({ agent, ops, onRevoke }: { agent: Agent; ops: AgentOps; onRevoke: (item: Intervention) => void }) {
  const items = [...ops.interventions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = items.filter(item => interventionState(item) === '生效中');
  return <div id="interventions"><Capability title="线上干预" demo="interventions" description="bad case 修复前的临时止血：命中条件的请求直接返回标准答案或执行规则。必须关联 bad case，最长 7 天，修复版本回归通过并上线后自动失效，每次变更都写入操作记录。">
    {!items.length ? <Feedback kind="empty" title="暂无线上干预" description="在上方 bad case 展开后点「更多 → 线上干预」创建；只对出在当前线上版本的问题提供，适合修复版本上线前需要立刻止血的情况。" />
      : <div className="intervention-list">{items.map(item => {
        const state = interventionState(item);
        return <div className={`intervention ${state === '生效中' ? 'active' : ''}`} key={item.id}>
          <div className="intervention-head"><span className={`intervention-state state-${state}`}>{state}</span><strong>{item.kind}</strong><code>{item.id}</code><span className="meta">关联 {item.badcaseId} · 针对 <VersionBadge version={item.appliesTo} /></span></div>
          <p><span className="meta">命中条件：</span>{item.trigger}</p>
          <p><span className="meta">{item.kind === '标准答案' ? '返回：' : '动作：'}</span>{item.content}</p>
          <div className="intervention-foot"><span className="meta"><Clock3 size={icon.small} aria-hidden="true" />{item.createdBy} 创建于 {item.createdAt} · 有效期至 {item.expiresAt}</span>
            {item.ended && <span className={item.ended.auto ? 'intervention-ended auto' : 'intervention-ended'}>{item.ended.at} {item.ended.by}{item.ended.auto ? '' : '撤销'}：{item.ended.reason}</span>}
            {state === '生效中' && <ConfirmAction actionLabel="撤销" confirmLabel={`确认撤销 ${item.id}`} impact={`撤销后命中条件的请求重新交给线上 ${agent.productionVersion ?? '—'} 回答；撤销会写入操作记录。`} onConfirm={() => onRevoke(item)} />}</div>
        </div>;
      })}</div>}
    {active.length > 0 && <p className="meta">{active.length} 条生效中。演示时钟不会走到到期时间；在发布页把修复版本全量上线，可以看到自动失效。</p>}
  </Capability></div>;
}
