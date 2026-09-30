/**
 * ⑥ bad case 工作台：一行 = 一类问题（同类已合并 ×N），默认按影响度排序。
 *   筛选：状态标签（待归因 / 已归因 / 已纳入本轮 / 已修复 / 已忽略）+ 时间、问题环节、来源、版本；
 *   行内展开（不用抽屉）：原始样本 → 归因（Trace 摘要标出异常步骤 + 平台建议 + 人工确认）→ 期望输出 → 操作；
 *   操作：纳入本轮优化（主，自动加入回归集）· 加入回归集 · 更多（线上干预临时止血、忽略）；支持批量。
 */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Lightbulb, ListPlus, MoreHorizontal, Network, ShieldAlert, Target, Undo2, Wrench } from 'lucide-react';
import { ignoreReasons, problemStages } from '../../data';
import { useDemo } from '../../core/store/DemoProvider';
import { addMinutes, demoNow } from '../../core/rules/clock';
import { goalState, goalVersion, seedFromBadcase } from '../../core/rules/optimization';
import { badcaseImpact, badcaseStatus, badcaseStatuses, goalOfBadcase, impactLevel, labelOf, lastRoundNote, servingVersion, type BadCaseStatus } from '../../core/rules/problems';
import { getCandidate } from '../../core/rules/versions';
import type { Agent, BadCase, BadCaseSource, ProblemStage, TraceRecord } from '../../types/domain';
import { useRound } from '../optimize/useRound';
import { Button } from '../../shared/components/Buttons';
import { IntegrationNote, VersionBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';
import { Feedback } from '../../shared/components/Feedback';
import { icon } from '../../shared/styles/tokens';
import { fmtMs } from './TraceTree';

type TimeRange = '全部' | '24h' | '7d';
const timeLabel: Record<TimeRange, string> = { '全部': '全部时间', '24h': '近 24 小时', '7d': '近 7 天' };
const statusTone: Record<BadCaseStatus, string> = { '待归因': 'pending', '已归因': 'info', '已纳入本轮': 'focus', '验证中': 'focus', '已修复': 'pass', '已忽略': 'muted' };
const closed = (status: BadCaseStatus) => status === '已修复' || status === '已忽略';
const open = (status: BadCaseStatus) => status === '待归因' || status === '已归因';

export function BadCaseBoard({ agent, cases, traceOf, onShowTrace, onExpand, interventionOf, onIntervene, focusId }: {
  agent: Agent; cases: BadCase[]; traceOf: (item: BadCase) => TraceRecord | null; onShowTrace: (traceId: string) => void;
  /** 展开某条 bad case 时，下方 Trace 树切到它的 Trace（不滚动） */ onExpand: (item: BadCase) => void;
  /** 该 bad case 生效中的线上干预（有效期至） */ interventionOf: (id: string) => string | null;
  /** 创建线上干预；只对出在当前线上版本的 bad case 提供 */ onIntervene: ((item: BadCase) => void) | null;
  /** 从其它页面跳过来时要展开的 bad case */ focusId: string | null;
}) {
  const { opsOf } = useDemo();
  const round = useRound(agent);
  const ops = opsOf(agent);
  const batch = ops.settings.execMode === '批量';
  const candidate = getCandidate(agent);

  const [status, setStatus] = useState<'全部' | BadCaseStatus>('全部');
  const [time, setTime] = useState<TimeRange>('全部');
  const [stage, setStage] = useState<'全部' | ProblemStage>('全部');
  const [source, setSource] = useState<'全部' | BadCaseSource>('全部');
  const [version, setVersion] = useState('全部');
  const [sort, setSort] = useState<'impact' | 'time'>('impact');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkIgnore, setBulkIgnore] = useState(false);
  const [bulkReason, setBulkReason] = useState(ignoreReasons[0]);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = useMemo(() => cases.map(item => {
    const label = labelOf(ops, item);
    return { item, label, status: badcaseStatus(agent, ops, item), impact: badcaseImpact(agent, item), stage: label.stage ?? item.suggest.stage, confirmed: Boolean(label.stage) };
  }), [agent, ops, cases]);
  const since = time === '24h' ? addMinutes(demoNow(), -24 * 60) : time === '7d' ? addMinutes(demoNow(), -7 * 24 * 60) : '';
  const filtered = rows.filter(row => (!since || row.item.time >= since) && (stage === '全部' || row.stage === stage) && (source === '全部' || row.item.source === source) && (version === '全部' || row.item.version === version));
  const counts = Object.fromEntries(badcaseStatuses.map(item => [item, filtered.filter(row => row.status === item).length])) as Record<BadCaseStatus, number>;
  // 已修复、已忽略沉到最后；其余按影响度或时间排序
  const visible = filtered.filter(row => status === '全部' || row.status === status)
    .sort((a, b) => Number(closed(a.status)) - Number(closed(b.status))
      || (sort === 'impact' ? b.impact - a.impact || b.item.time.localeCompare(a.item.time) : b.item.time.localeCompare(a.item.time)));
  const versions = [...new Set(cases.map(item => item.version))];

  /* 默认展开影响最大的待处理问题；从别的页面带 ?badcase= 过来时展开那一条 */
  const [expanded, setExpanded] = useState<string | null>(() => focusId ?? [...rows].filter(row => open(row.status)).sort((a, b) => b.impact - a.impact)[0]?.item.id ?? null);
  // 从别处跳过来时清空筛选，保证那一行可见
  useEffect(() => { if (!focusId) return; setStatus('全部'); setTime('全部'); setStage('全部'); setSource('全部'); setVersion('全部'); setExpanded(focusId); window.setTimeout(() => document.querySelector(`[data-demo="badcase-${focusId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); }, [focusId]);
  /* 下方 Trace 树跟着展开的 bad case 走 */
  useEffect(() => { const item = cases.find(entry => entry.id === expanded); if (item) onExpand(item); }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectable = visible.filter(row => open(row.status));
  // 批量操作只作用于当前筛选下可见的行：筛选变了，被隐藏的勾选不会被误操作
  const chosen = visible.filter(row => selected.includes(row.item.id) && open(row.status));
  const toggle = (id: string) => setSelected(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id]);
  const allOn = selectable.length > 0 && selectable.every(row => selected.includes(row.item.id));
  const where = candidate ? `挂到候选版本 ${candidate.id}` : '新建候选版本时自动挂上';

  const includeRows = (list: typeof rows, expected?: Record<string, string>) => {
    round.include(list.map(row => ({ seed: seedFromBadcase(agent, row.item, row.stage), badcase: { item: row.item, stage: row.stage, expected: expected?.[row.item.id] ?? row.label.expected ?? row.item.expected } })));
    setSelected([]);
    setNotice(`已纳入本轮 ${list.length} 个问题（${where}），并加入 bad case 回归集。`);
  };

  return <Capability title="bad case 工作台" demo="badcase-board" description="汇集用户反馈、申诉和抽检发现的问题，同类合并为一行、按影响度排序。展开一行：看原始样本和 Trace，确认归因，再纳入本轮优化；修复上线前可以用线上干预临时止血。"
    actions={<IntegrationNote platform="标注" />}>
    {!cases.length ? <Feedback kind="empty" title="暂无 bad case" description="用户反馈、申诉和抽检发现的问题会汇集到这里。" /> : <>
      <div className="badcase-tabs" role="tablist" aria-label="bad case 状态">
        {(['全部', ...badcaseStatuses] as const).map(item => <button key={item} type="button" role="tab" aria-selected={status === item} className={status === item ? 'active' : ''} onClick={() => { setStatus(item); setSelected([]); }}>{item}<span className="tab-count">{item === '全部' ? filtered.length : counts[item]}</span></button>)}
      </div>
      <div className="badcase-filters" role="group" aria-label="筛选 bad case">
        <FilterSelect label="时间" value={time} onChange={value => setTime(value as TimeRange)} options={(['全部', '24h', '7d'] as TimeRange[]).map(value => ({ value, label: timeLabel[value] }))} />
        <FilterSelect label="问题环节" value={stage} onChange={value => setStage(value as '全部' | ProblemStage)} options={[{ value: '全部', label: '全部环节' }, ...problemStages.map(value => ({ value, label: value }))]} hint="含平台建议" />
        <FilterSelect label="来源" value={source} onChange={value => setSource(value as '全部' | BadCaseSource)} options={[{ value: '全部', label: '全部来源' }, ...(['用户反馈', '申诉', '抽检'] as const).map(value => ({ value, label: value }))]} />
        <FilterSelect label="版本" value={version} onChange={setVersion} options={[{ value: '全部', label: '全部版本' }, ...versions.map(value => ({ value, label: `${value}${value === agent.productionVersion ? '（线上）' : servingVersion(agent, value) ? '（灰度中）' : ''}` }))]} />
        <FilterSelect label="排序" value={sort} onChange={value => setSort(value as 'impact' | 'time')} options={[{ value: 'impact', label: '按影响度' }, { value: 'time', label: '按时间' }]} />
      </div>
      <p className="meta badcase-legend">影响度 = 相似条数 × 来源权重（申诉 3 / 用户反馈 2 / 抽检 1）× 是否出在服务中的版本（×1.5）。问题环节以人工确认为准，未确认时按平台建议筛选。</p>
      {notice && <p className="round-notice" role="status"><CheckCircle2 size={icon.small} aria-hidden="true" />{notice}<Link className="link-button" to={`/agents/${agent.id}/build`}>去构建与调优</Link></p>}
      {chosen.length > 0 && <div className="badcase-bulk" role="group" aria-label="批量操作" data-demo="badcase-bulk">
        <strong>已选 {chosen.length} 条</strong>
        <Button variant="primary" onClick={() => includeRows(chosen)}><Wrench size={icon.small} />纳入本轮优化</Button>
        <Button onClick={() => { round.addToRegression(chosen.map(row => ({ item: row.item }))); setSelected([]); setNotice(`已把 ${chosen.length} 条加入 bad case 回归集（期望输出用预填内容）。`); }}><ListPlus size={icon.small} />加入回归集</Button>
        {bulkIgnore ? <span className="bulk-ignore">{chosen.some(row => interventionOf(row.item.id)) && <span className="meta bc-warn">所选问题里有生效中的线上干预（{chosen.filter(row => interventionOf(row.item.id)).map(row => row.item.id).join('、')}）；忽略后它不会自动失效，请在下方「线上干预」里手动撤销。</span>}<FilterSelect label="忽略原因" value={bulkReason} onChange={setBulkReason} options={ignoreReasons.map(value => ({ value, label: value }))} />
          <Button onClick={() => { round.ignore(chosen.map(row => row.item), bulkReason); setSelected([]); setBulkIgnore(false); setNotice(`已忽略 ${chosen.length} 条（${bulkReason}）。`); }}>确认忽略</Button></span>
          : <Button onClick={() => setBulkIgnore(true)}>忽略</Button>}
        <button type="button" className="link-button" onClick={() => { setSelected([]); setBulkIgnore(false); }}>取消选择</button>
      </div>}
      <div className="badcase-table" aria-label="bad case 列表">
        <div className="badcase-head">
          <span><input type="checkbox" aria-label="全选当前可处理的 bad case" checked={allOn} disabled={!selectable.length} onChange={() => setSelected(allOn ? [] : selectable.map(row => row.item.id))} /></span>
          <span>问题<span className="head-mobile">（全选待处理）</span></span><span>归因</span><span>状态</span>
        </div>
        {!visible.length && <p className="meta badcase-empty">没有符合筛选条件的 bad case。</p>}
        {visible.map(row => {
          const { item } = row;
          const isOpen = expanded === item.id;
          const level = impactLevel(row.impact);
          return <Fragment key={item.id}><div className={`badcase-row ${isOpen ? 'is-open' : ''} status-${statusTone[row.status]}`} data-demo={`badcase-${item.id}`}>
            <span><input type="checkbox" aria-label={`选择 ${item.id}`} checked={selected.includes(item.id)} disabled={!open(row.status)} onChange={() => toggle(item.id)} /></span>
            <button type="button" className="badcase-toggle" aria-expanded={isOpen} aria-controls={`bc-detail-${item.id}`} onClick={() => setExpanded(isOpen ? null : item.id)}>
              {isOpen ? <ChevronDown size={icon.small} aria-hidden="true" /> : <ChevronRight size={icon.small} aria-hidden="true" />}
              <span className="badcase-lines">
                <span className="badcase-title"><span className="badcase-summary" title={item.summary}>{item.summary}</span>{item.similar > 1 && <span className="similar-chip" title="同类已合并到这一行">×{item.similar} 条相似</span>}</span>
                <span className="badcase-meta"><span className={`impact impact-${level}`} title={`影响度 ${row.impact}`}>影响 {level}</span><span className="source-tag">{item.source}</span>
                  <span className="badcase-version"><VersionBadge version={item.version} />{item.version === agent.productionVersion ? <span className="serving-tag">线上</span> : servingVersion(agent, item.version) ? <span className="serving-tag">灰度中</span> : null}</span>
                  <span className="meta">{item.time.slice(5)}</span><code className="meta">{item.id}</code></span>
              </span>
            </button>
            <span>{row.confirmed ? <span className="stage-chip">{row.stage}</span> : open(row.status) ? <span className="stage-chip is-suggest" title="平台建议，待人工确认">建议 {row.stage}</span> : <span className="meta">—</span>}</span>
            <span><span className={`bc-status tone-${statusTone[row.status]}`}>{row.status}</span>{interventionOf(item.id) && <ShieldAlert className="bc-shield" size={icon.small} aria-label="线上干预生效中" />}</span>
          </div>
          {isOpen && <BadCaseDetail agent={agent} row={row} batch={batch} trace={traceOf(item)} onShowTrace={onShowTrace} interventionUntil={interventionOf(item.id)}
            onIntervene={onIntervene && item.version === agent.productionVersion && !closed(row.status) ? () => onIntervene(item) : null}
            onInclude={expected => includeRows([row], { [item.id]: expected })} where={where} />}
          </Fragment>;
        })}
      </div>
    </>}
  </Capability>;
}

function FilterSelect({ label, value, options, onChange, hint }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; hint?: string }) {
  return <label className="filter-select"><span>{label}{hint && <small>（{hint}）</small>}</span><span className="select-field"><select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span></label>;
}

type Row = { item: BadCase; label: ReturnType<typeof labelOf>; status: BadCaseStatus; impact: number; stage: ProblemStage; confirmed: boolean };

function BadCaseDetail({ agent, row, batch, trace, onShowTrace, interventionUntil, onIntervene, onInclude, where }: {
  agent: Agent; row: Row; batch: boolean; trace: TraceRecord | null; onShowTrace: (traceId: string) => void;
  interventionUntil: string | null; onIntervene: (() => void) | null; onInclude: (expected: string) => void; where: string;
}) {
  const { opsOf } = useDemo();
  const round = useRound(agent);
  const ops = opsOf(agent);
  const { item, label, status } = row;
  const [expected, setExpected] = useState(label.expected ?? item.expected);
  const [ignoring, setIgnoring] = useState(false);
  const [reason, setReason] = useState(ignoreReasons[0]);
  const editable = open(status);
  const goal = status === '已纳入本轮' || status === '验证中' ? goalOfBadcase(agent, ops, item.id) : null;
  const goalAt = goal ? goalVersion(agent, goal) : null;
  const issue = trace?.steps.find(step => step.error);
  const expectedLabel = batch ? '判定标准' : '期望输出';
  const note = lastRoundNote(agent, ops, item);

  return <div className="badcase-detail" id={`bc-detail-${item.id}`} role="region" aria-label={`${item.id} 详情`}>
    <section className="bc-sample" aria-label="原始样本">
      <h4>原始样本 <code>{item.id}</code></h4>
      <dl>
        <div><dt>{batch ? '待审内容' : '用户原话'}</dt><dd>{item.input}</dd></div>
        <div><dt>{batch ? '判定结果' : 'Agent 输出'}</dt><dd>{item.output}</dd></div>
        <div><dt>{item.source}备注</dt><dd>{item.detail}</dd></div>
        <div><dt>发生时间</dt><dd>{item.time}{item.similar > 1 ? ` · 同类 ${item.similar} 条已合并到这一行` : ' · 单条'}</dd></div>
      </dl>
      {/* 失焦即保存：已在回归集时，改动直接作为回归集的参考答案 */}
      <label className="field-label bc-expected">{expectedLabel}<textarea rows={3} value={expected} readOnly={!editable} onChange={event => setExpected(event.target.value)} onBlur={() => { if (editable && expected !== (label.expected ?? item.expected)) round.saveExpected(item, expected); }} aria-label={`${item.id} ${expectedLabel}`} />
        <span className="meta field-hint">{label.inEvalSet ? '已在 bad case 回归集：修改后自动保存，作为回归评测的参考答案。' : `加入回归集时作为参考答案；已按${batch ? '政策条款' : '现行规则'}预填，可以修改（自动保存）。`}</span></label>
    </section>

    <section className="bc-attribution" aria-label="归因">
      <div className="bc-trace-head"><h4>Trace 摘要</h4>{trace && <button type="button" className="link-button" data-demo={`badcase-trace-${item.id}`} onClick={() => onShowTrace(trace.id)}><Network size={icon.small} aria-hidden="true" />查看完整 Trace {trace.id}</button>}</div>
      {trace ? <ol className="bc-trace-chain" aria-label={`Trace ${trace.id} 步骤`}>{trace.steps.map((step, index) => <li key={index} className={step.error ? 'is-issue' : ''}>
        <span className="span-kind">{step.kind}</span><span className="bc-step-name">{step.name}</span><span className="meta">{fmtMs(step.ms)}</span>
        {step.error && <span className="bc-step-issue"><AlertCircle size={icon.small} aria-hidden="true" />{step.error}{step.evidence?.filter(entry => entry.expired).map(entry => <span key={entry.entry} className="bc-expired">依据：{entry.entry}（{entry.version}，已失效）</span>)}</span>}
      </li>)}</ol> : <p className="meta">没有找到关联的 Trace。</p>}
      <div className="bc-suggest"><Lightbulb size={icon.small} aria-hidden="true" /><div><strong>平台建议归因：{item.suggest.stage}</strong><p>{item.suggest.evidence}</p>{issue && <span className="meta">信号来自 Trace 异常步骤「{issue.kind} · {issue.name}」。</span>}</div></div>
      <div className="bc-confirm"><span className="meta">人工确认问题环节{label.stage ? `：已确认「${label.stage}」` : '：未确认'}{item.labeled && label.stage === item.labeled && !ops.badcases[item.id] ? '（标注平台回流）' : ''}</span>
        <div className="stage-picker" data-demo={`stage-${item.id}`} role="radiogroup" aria-label={`${item.id} 问题环节`}>{problemStages.map(stage => <button key={stage} type="button" role="radio" aria-checked={label.stage === stage} disabled={!editable}
          className={`${label.stage === stage ? 'active' : ''} ${stage === item.suggest.stage ? 'is-suggest' : ''}`} onClick={() => round.setLabel(item, { stage })}>{stage}{stage === item.suggest.stage && <small>建议</small>}</button>)}</div>
        {editable && !label.stage && <span className="meta">点选确认；也可以直接「纳入本轮优化」，按平台建议「{item.suggest.stage}」归因。</span>}</div>
    </section>

    <div className="bc-actions">
      {note && <p className="bc-last-round">{note}</p>}
      {editable && <><span data-demo={`optimize-${item.id}`}><Button variant="primary" onClick={() => onInclude(expected)}><Wrench size={icon.small} />纳入本轮优化</Button></span>
        {label.inEvalSet ? <><span className="added-note"><CheckCircle2 size={icon.small} aria-hidden="true" />已在 bad case 回归集</span><button type="button" className="link-button" onClick={() => round.removeFromRegression(item)}>移出回归集</button></>
          : <span data-demo={`add-eval-${item.id}`}><Button onClick={() => round.addToRegression([{ item, expected }])}><ListPlus size={icon.small} />加入回归集</Button></span>}
        <span className="meta bc-action-hint">纳入本轮：调优对象设为「{row.stage}」{label.stage ? '' : '（平台建议）'}，{where}，并自动加入回归集</span></>}
      {status === '已纳入本轮' && goal && <span className="goal-chip"><Target size={icon.small} aria-hidden="true" />已纳入本轮{goalAt ? ` · ${goalAt}` : ' · 等待新建候选版本'} · 目标{goalState(agent, ops, goal)}</span>}
      {status === '验证中' && goal && <span className="goal-chip"><Target size={icon.small} aria-hidden="true" />上一轮已纳入 · {goalAt} 灰度验证中</span>}
      {status === '已纳入本轮' && <Link className="link-button" to={`/agents/${agent.id}/build`}>去构建与调优</Link>}
      {status === '验证中' && <Link className="link-button" to={`/agents/${agent.id}/release`}>去发布页看灰度</Link>}
      {status === '已修复' && <span className="added-note"><CheckCircle2 size={icon.small} aria-hidden="true" />{item.closed?.status === '已修复' ? `已在 ${item.closed.version} 修复：${item.closed.note}` : `已在线上 ${agent.productionVersion} 修复：回归集覆盖并评测通过`}</span>}
      {status === '已忽略' && <span className="meta">已忽略（不参与回归）：{label.ignored ? `${label.ignored.reason} · ${label.ignored.by} ${label.ignored.at}` : item.closed?.status === '已忽略' ? `${item.closed.reason} · ${item.closed.by}` : ''}</span>}
      {status === '已忽略' && label.ignored && <Button onClick={() => round.restore(item)}><Undo2 size={icon.small} />撤销忽略</Button>}
      {interventionUntil && <a className="intervention-chip" href="#interventions" onClick={event => { event.preventDefault(); document.getElementById('interventions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><ShieldAlert size={icon.small} aria-hidden="true" />线上干预生效中 · 至 {interventionUntil}</a>}
      {ignoring ? <span className="bulk-ignore">{interventionUntil && <span className="meta bc-warn">这条问题有生效中的线上干预；忽略后它不会自动失效，请在下方「线上干预」里手动撤销。</span>}<FilterSelect label="忽略原因" value={reason} onChange={setReason} options={ignoreReasons.map(value => ({ value, label: value }))} /><Button onClick={() => { round.ignore([item], reason); setIgnoring(false); }}>确认忽略</Button><button type="button" className="link-button" onClick={() => setIgnoring(false)}>取消</button></span>
        : (editable || (onIntervene && !interventionUntil)) && <MoreMenu id={item.id} items={[
          ...(onIntervene && !interventionUntil ? [{ label: '线上干预（临时止血）', hint: batch ? '批量模式只能用拦截规则' : '修复上线前先止血，最长 7 天', demo: `intervene-${item.id}`, onClick: onIntervene }] : []),
          ...(editable ? [{ label: '忽略', hint: '误报、预期行为或重复问题', demo: `ignore-${item.id}`, onClick: () => setIgnoring(true) }] : []),
        ]} />}
    </div>
  </div>;
}

function MoreMenu({ id, items }: { id: string; items: { label: string; hint?: string; demo?: string; onClick: () => void }[] }) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shown) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setShown(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setShown(false); };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [shown]);
  if (!items.length) return null;
  return <div className="more-menu" ref={ref} data-demo={`more-${id}`}>
    <Button aria-haspopup="menu" aria-expanded={shown} onClick={() => setShown(value => !value)}><MoreHorizontal size={icon.small} />更多</Button>
    {shown && <div className="more-menu-list" role="menu">{items.map(item => <button key={item.label} type="button" role="menuitem" data-demo={item.demo} onClick={() => { setShown(false); item.onClick(); }}><span>{item.label}</span>{item.hint && <small>{item.hint}</small>}</button>)}</div>}
  </div>;
}
