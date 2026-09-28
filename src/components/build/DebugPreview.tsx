import { ChevronDown, ChevronRight, Info, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { DebugPreset } from '../../types/domain';
import { Button } from '../actions/Buttons';
import { StatusBadge } from '../badges/Badges';

/** 按输入匹配预设结果；没有命中时返回第一条预设并提示，不调用真实模型。 */
function match(presets: DebugPreset[], question: string) {
  const text = question.trim();
  const hit = presets.find(item => item.question === text) ?? presets.find(item => text.length >= 4 && (item.question.includes(text) || text.includes(item.question.slice(0, 6))));
  return { preset: hit ?? presets[0], matched: Boolean(hit) };
}

export function DebugPreview({ presets, initialQuestion, disabledReason, snapshotNote, onRun }: { presets: DebugPreset[]; initialQuestion: string; disabledReason?: string; snapshotNote?: string; onRun: (question: string) => Promise<void> }) {
  const [question, setQuestion] = useState(initialQuestion || presets[0].question);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof match> | null>(initialQuestion ? match(presets, initialQuestion) : null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const run = async () => { setRunning(true); setResult(null); setExpanded({}); await onRun(question); setRunning(false); setResult(match(presets, question)); };
  const reason = disabledReason ?? (!question.trim() ? '请输入调试问题' : undefined);
  return <div className="card debug-preview"><div className="debug-heading"><div><span className="eyebrow">实时调试</span><h2>预览回答</h2></div>{result && <StatusBadge status="通过" />}</div>
    <label className="field-label">输入问题<textarea rows={3} value={question} onChange={event => setQuestion(event.target.value)} /></label>
    <div className="preset-questions"><span className="meta">预设问题</span>{presets.map(item => <button type="button" key={item.question} className={question === item.question ? 'selected' : ''} onClick={() => setQuestion(item.question)}>{item.question}</button>)}</div>
    <Button variant="primary" disabled={running || Boolean(reason)} reason={reason} onClick={run}>{running ? <><RotateCcw size={16} className="spin" />正在生成</> : <><Play size={16} />运行调试</>}</Button>
    {snapshotNote && <p className="meta">{snapshotNote}</p>}
    {running && <div className="debug-loading"><span /><p>正在按步骤执行…</p></div>}
    {result && !running && <>
      {!result.matched && <p className="debug-note"><Info size={16} />未匹配到预设问题，展示最接近的预设结果（演示数据）。</p>}
      <div className="debug-answer"><span className="meta">最终输出 · {result.preset.totalDuration}</span><p>{result.preset.answer}</p></div>
      <div className="debug-steps"><strong>中间结果</strong>{result.preset.steps.map((step, index) => <div className="debug-step" key={step.step}><button onClick={() => setExpanded(value => ({ ...value, [index]: !value[index] }))} aria-expanded={Boolean(expanded[index])}>{expanded[index] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<span>{step.step}</span><small>{step.duration}</small></button><p>{step.summary}</p>{expanded[index] && <div className="debug-detail">{step.detail}</div>}</div>)}</div>
    </>}
  </div>;
}
