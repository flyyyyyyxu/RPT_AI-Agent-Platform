import { CheckCircle2, Play } from 'lucide-react';
import { Button } from '../actions/Buttons';

export function EvaluationRunner({ progress, running, complete, disabled, datasetName, candidateVersion, onRun }: { progress: number; running: boolean; complete: boolean; disabled: boolean; datasetName: string; candidateVersion: string; onRun: () => void }) {
  return <div className="evaluation-runner"><div><strong>{complete ? '评测已完成' : running ? '正在运行 3 条样本' : `候选版本 ${candidateVersion} 已准备`}</strong><p>{complete ? '预设结果已写入本次报告。' : `使用「${datasetName}」检查准确性、引用和完整性。`}</p></div><div className="runner-actions"><div className="progress-track" aria-label={`评测进度 ${progress}%`}><span style={{ width: `${progress}%` }} /></div><span className="progress-value">{progress}%</span><Button variant="primary" onClick={onRun} disabled={disabled || running} reason={disabled ? '请先完成配置并运行一次调试' : undefined}>{complete ? <CheckCircle2 size={16} /> : <Play size={16} />}{complete ? '重新运行评测' : running ? '运行中' : '运行评测'}</Button></div></div>;
}
