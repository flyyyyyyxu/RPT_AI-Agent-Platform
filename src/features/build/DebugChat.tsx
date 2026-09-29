/**
 * 构建页右栏：多轮调试对话。调试的是当前工作草稿（未保存也可以调），不影响线上。
 * 回答来自预设数据：按输入匹配预设问题，没命中时展示最接近的预设并提示，不调用真实模型。
 */
import { ChevronDown, ChevronRight, Info, Play, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AgentDialog, DebugPreset } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { icon } from '../../shared/styles/tokens';

function match(presets: DebugPreset[], question: string) {
  const text = question.trim();
  const hit = presets.find(item => item.question === text) ?? presets.find(item => text.length >= 4 && (item.question.includes(text) || text.includes(item.question.slice(0, 6))));
  return { preset: hit ?? presets[0], matched: Boolean(hit) };
}

type Turn = { id: number; question: string; result: ReturnType<typeof match>; context: number; model: string };

export function DebugChat({ presets, initialQuestion, target, debugged, memoryTurns, model, readOnlyNote, dialog, onRun }: {
  presets: DebugPreset[];
  /** 草稿里的对话体验：开场白、推荐问、追问 */
  dialog: AgentDialog;
  /** 上次调试的问题：工作副本已调试过时，恢复这一轮对话 */
  initialQuestion: string;
  /** 调试对象，例如「草稿（未保存）」「候选版本 v13」 */
  target: string;
  debugged: boolean;
  memoryTurns: number;
  model: string;
  readOnlyNote?: string;
  onRun: (question: string) => Promise<void>;
}) {
  const [question, setQuestion] = useState(dialog.suggestions.find(Boolean) ?? presets[0].question);
  const [turns, setTurns] = useState<Turn[]>(() => initialQuestion ? [{ id: 0, question: initialQuestion, result: match(presets, initialQuestion), context: 0, model }] : []);
  const [running, setRunning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const list = listRef.current; if (list) list.scrollTop = list.scrollHeight; }, [turns.length, running]);

  /** 输入框为空时重跑上一问：改完配置后快速回归同一个问题 */
  const lastQuestion = turns.length ? turns[turns.length - 1].question : '';
  /** 追问建议：还没问过的预设问题里取两条（演示数据；真实环境由模型按对话生成） */
  const asked = new Set(turns.map(turn => turn.question));
  const followUps = dialog.followUp === '自动生成' ? presets.map(item => item.question).filter(item => !asked.has(item)).slice(0, 2) : [];
  const chips = dialog.suggestions.filter(Boolean);
  const run = async () => {
    const text = question.trim() || lastQuestion;
    if (!text || running) return;
    setRunning(text); setQuestion('');
    await onRun(text);
    setRunning(null);
    setTurns(previous => [...previous, { id: previous.length ? previous[previous.length - 1].id + 1 : 1, question: text, result: match(presets, text), context: Math.min(previous.length, memoryTurns), model }]);
  };

  return <div className="card debug-chat">
    <div className="debug-chat-head">
      <div><span className="eyebrow">预览与调试</span><h2>调试对话</h2></div>
      {turns.length > 0 && <button type="button" className="link-button" onClick={() => { setTurns([]); setExpanded({}); }}><Trash2 size={icon.small} aria-hidden="true" />清空对话</button>}
    </div>
    <div className="debug-target">
      <span>调试对象：<strong>{target}</strong></span>
      <span className={debugged ? 'debug-state ok' : 'debug-state'}>{debugged ? '已调试' : '未调试'}</span>
    </div>
    <p className="meta debug-memory">{memoryTurns ? `参考最近 ${memoryTurns} 轮对话，追问会带上前文` : '不参考历史对话：每轮独立回答'} · {model}</p>
    {readOnlyNote && <p className="meta">{readOnlyNote}</p>}

    <div className="debug-thread" ref={listRef} aria-live="polite">
      {dialog.opening && <div className="debug-turn"><div className="bubble bubble-agent bubble-opening"><span className="meta">开场白</span><p>{dialog.opening}</p></div></div>}
      {!turns.length && !running && !dialog.opening && <p className="debug-empty">从下方选一个问题或自己输入，回答会展示每一步的中间结果和耗时。</p>}
      {turns.map(turn => <div className="debug-turn" key={turn.id}>
        <div className="bubble bubble-user">{turn.question}</div>
        <div className="bubble bubble-agent">
          {!turn.result.matched && <p className="debug-note"><Info size={icon.small} aria-hidden="true" />未匹配到预设问题，展示最接近的预设结果（演示数据）。</p>}
          <p>{turn.result.preset.answer}</p>
          <span className="meta">{turn.result.preset.totalDuration} · {turn.model}{turn.context ? ` · 带入前 ${turn.context} 轮上下文` : ''}</span>
          <div className="debug-steps">{turn.result.preset.steps.map((step, index) => { const key = `${turn.id}-${index}`; return <div className="debug-step" key={key}>
            <button type="button" onClick={() => setExpanded(value => ({ ...value, [key]: !value[key] }))} aria-expanded={Boolean(expanded[key])}>{expanded[key] ? <ChevronDown size={icon.small} /> : <ChevronRight size={icon.small} />}<span>{step.step}</span><small>{step.duration}</small></button>
            <p>{step.summary}</p>{expanded[key] && <div className="debug-detail">{step.detail}</div>}</div>; })}</div>
        </div>
        {turn === turns[turns.length - 1] && !running && followUps.length > 0 && <div className="follow-ups" data-demo="follow-ups"><span className="meta">追问建议</span>{followUps.map(item => <button type="button" key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div>}
      </div>)}
      {running && <div className="debug-turn"><div className="bubble bubble-user">{running}</div><div className="debug-loading"><span /><p>正在按步骤执行…</p></div></div>}
    </div>

    <div className="debug-compose">
      <div className="preset-questions">{chips.length
        ? <><span className="meta">推荐问</span>{chips.map(item => <button type="button" key={item} className={question === item ? 'selected' : ''} onClick={() => setQuestion(item)}>{item}</button>)}</>
        : <><span className="meta">预设问题</span>{presets.map(item => <button type="button" key={item.question} className={question === item.question ? 'selected' : ''} onClick={() => setQuestion(item.question)}>{item.question}</button>)}</>}</div>
      <label className="sr-only" htmlFor="debug-input">调试问题</label>
      <textarea id="debug-input" rows={2} value={question} placeholder="输入问题，Enter 发送，Shift + Enter 换行" onChange={event => setQuestion(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void run(); } }} />
      <span data-demo="debug-run"><Button variant="primary" disabled={Boolean(running) || !(question.trim() || lastQuestion)} title={!(question.trim() || lastQuestion) ? '请输入调试问题' : undefined} onClick={run}>{running ? <><RotateCcw size={icon.small} className="spin" />正在生成</> : <><Play size={icon.small} />{question.trim() || !lastQuestion ? '运行调试' : '运行调试（重跑上一问）'}</>}</Button></span>
    </div>
  </div>;
}
