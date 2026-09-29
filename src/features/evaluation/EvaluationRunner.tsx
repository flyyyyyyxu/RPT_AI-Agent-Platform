import { CheckCircle2, Play, RotateCcw } from 'lucide-react';
import { Button } from '../../shared/components/Buttons';
import { icon } from '../../shared/styles/tokens';

export function EvaluationRunner({ progress, running, complete, disabledReason, datasetName, caseCount, candidateVersion, onRun }: { progress: number; running: boolean; complete: boolean; disabledReason?: string; datasetName: string; caseCount: number; candidateVersion: string; onRun: () => void }) {
  return <div className="evaluation-runner"><div><strong>{running ? `正在运行 ${caseCount} 条样本` : complete ? `「${datasetName}」已完成评测` : `候选版本 ${candidateVersion} 待评测`}</strong><p>{complete && !running ? '结果读取预设数据，报告见下方。' : `使用「${datasetName}」逐条运行候选版本和线上版本。`}</p></div>
    <div className="runner-actions"><div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="评测进度"><span style={{ width: `${progress}%` }} /></div><span className="progress-value">{progress}%</span>
      <span data-demo="eval-run"><Button variant={complete ? 'secondary' : 'primary'} onClick={onRun} disabled={Boolean(disabledReason) || running} reason={disabledReason}>{running ? <RotateCcw size={icon.small} className="spin" /> : complete ? <CheckCircle2 size={icon.small} /> : <Play size={icon.small} />}{running ? '运行中' : complete ? '重新运行评测' : '运行评测'}</Button></span></div></div>;
}
