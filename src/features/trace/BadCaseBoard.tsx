/** ⑥ bad case 工作台：来源、关联 Trace、人工标注问题环节、加入评测集。 */
import { CheckCircle2, ListPlus, Network } from 'lucide-react';
import { problemStages } from '../../data';
import type { BadCase, ProblemStage } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { IntegrationNote, VersionBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';
import { Feedback } from '../../shared/components/Feedback';
import { icon } from '../../shared/styles/tokens';

export interface BadCaseLabel { stage: ProblemStage | null; inEvalSet: boolean }

export function BadCaseBoard({ cases, labelOf, setLabel, onShowTrace }: {
  cases: BadCase[]; labelOf: (id: string) => BadCaseLabel; setLabel: (id: string, patch: Partial<BadCaseLabel>) => void; onShowTrace: (traceId: string) => void;
}) {
  return <Capability title="bad case 工作台" description="汇集用户反馈、申诉和抽检发现的问题；人工标注问题环节后，一键加入评测集，下次候选版本评测自动覆盖。"
    actions={<IntegrationNote platform="标注" />}>
    {!cases.length && <Feedback kind="empty" title="暂无 bad case" description="用户反馈、申诉和抽检发现的问题会汇集到这里。" />}
    <div className="badcase-list">{cases.map(item => {
      const label = labelOf(item.id);
      return <div className="badcase" key={item.id} data-demo={`badcase-${item.id}`}>
        <div className="badcase-main"><div className="badcase-meta"><span className="source-tag">{item.source}</span><code>{item.id}</code><VersionBadge version={item.version} /><span className="meta">{item.time}</span></div>
          <strong>{item.summary}</strong><p>{item.detail}</p>
          <button type="button" className="link-button" data-demo={`badcase-trace-${item.id}`} onClick={() => onShowTrace(item.traceId)}><Network size={icon.small} aria-hidden="true" />查看 Trace {item.traceId}</button></div>
        <div className="badcase-actions"><span className="meta">问题环节（人工标注）</span>
          <div className="stage-picker" data-demo={`stage-${item.id}`} role="radiogroup" aria-label={`${item.id} 问题环节`}>{problemStages.map(stage => <button key={stage} type="button" role="radio" aria-checked={label.stage === stage} className={label.stage === stage ? 'active' : ''} onClick={() => setLabel(item.id, { stage })}>{stage}</button>)}</div>
          {label.inEvalSet ? <span className="added-note"><CheckCircle2 size={icon.small} aria-hidden="true" />已加入「bad case 回归集」· 标注：{label.stage}</span>
            : <span data-demo={`add-eval-${item.id}`}><Button onClick={() => setLabel(item.id, { inEvalSet: true })} disabled={!label.stage} reason={!label.stage ? '请先标注问题环节' : undefined}><ListPlus size={icon.small} />加入评测集</Button></span>}
        </div>
      </div>;
    })}</div>
  </Capability>;
}
