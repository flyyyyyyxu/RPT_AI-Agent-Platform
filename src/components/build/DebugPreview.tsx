import { ChevronDown, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { DebugResult } from '../../types/domain';
import { Button } from '../actions/Buttons';
import { StatusBadge } from '../badges/Badges';

export function DebugPreview({ result, initialQuestion, onRun }: { result: DebugResult; initialQuestion: string; onRun: (question: string) => Promise<void> }) {
  const [question, setQuestion] = useState(initialQuestion || '我已经转正，今年有几天年假？');
  const [running, setRunning] = useState(false);
  const [hasResult, setHasResult] = useState(Boolean(initialQuestion));
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const run = async () => { setRunning(true); setHasResult(false); await onRun(question); setRunning(false); setHasResult(true); };
  return <div className="debug-preview"><div className="debug-heading"><div><span className="eyebrow">实时调试</span><h2>预览回答</h2></div>{hasResult && <StatusBadge status="通过" />}</div><label className="field-label">输入问题<textarea rows={3} value={question} onChange={event => setQuestion(event.target.value)} /></label><Button variant="primary" disabled={running || !question.trim()} reason={!question.trim() ? '请输入调试问题' : undefined} onClick={run}>{running ? <><RotateCcw size={16} className="debug-spinning" />正在生成</> : <><Play size={16} />运行调试</>}</Button>
    {running && <div className="debug-loading"><span /><p>正在检索制度并生成回答…</p></div>}
    {hasResult && !running && <><div className="debug-answer"><span className="meta">最终输出 · {result.totalDuration}</span><p>{result.answer}</p></div><div className="debug-steps"><strong>中间结果</strong>{result.steps.map((step, index) => <div className="debug-step" key={step.step}><button onClick={() => setExpanded(value => ({ ...value, [index]: !value[index] }))} aria-expanded={Boolean(expanded[index])}>{expanded[index] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<span>{step.step}</span><small>{step.duration}</small></button><p>{step.summary}</p>{expanded[index] && <div className="debug-detail">{step.detail}</div>}</div>)}</div></>}
  </div>;
}
