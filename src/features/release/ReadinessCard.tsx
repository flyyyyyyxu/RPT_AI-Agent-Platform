/** ③ 生产就绪检查：任一项未完成时发布按钮禁用。 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed, AlertTriangle, LoaderCircle } from 'lucide-react';
import type { AgentVersion } from '../../types/domain';
import type { ReadinessItem } from '../../core/rules/gate';
import { Button } from '../../shared/components/Buttons';
import { StatusBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';

/* ---------------- ③ 生产就绪检查 ---------------- */
export function ReadinessCard({ candidate, experiment, checks, approvalPending, onSubmitApproval, onApprove, approving, children }: {
  approvalPending: boolean; candidate: AgentVersion | null; experiment: AgentVersion | null; checks: ReadinessItem[];
  onSubmitApproval: () => void; onApprove: () => void; approving: boolean; children: ReactNode;
}) {
  const doneCount = checks.filter(item => item.done).length;
  return <Capability skeleton={[3]} hero={1} demo="readiness" title="生产就绪检查" description="发布前逐项确认；任一项未完成，发布按钮禁用并写明原因。门槛、护栏、告警的配置变化会实时反映在这里。"
    actions={candidate ? <span className="meta">{candidate.id} · 已完成 {doneCount} / {checks.length}</span> : undefined}>
    {!candidate ? <p className="meta">{experiment ? `${experiment.id} 已完成生产就绪检查，当前${experiment.status}${experiment.traffic ? ` ${experiment.traffic}%` : ''}；放量与回退见「流量指向」。` : '没有候选版本。请先在构建页新建草稿，完成配置、调试和评测后再发布。'}</p>
      : <ul className="check-list">{checks.map(item => <li key={item.key} data-demo={`check-${item.key}`} className={`check-item ${item.done ? item.warn ? 'warn' : 'done' : ''}`}>
        <span className="check-icon">{item.done ? item.warn ? <AlertTriangle size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" /> : <CircleDashed size={20} aria-hidden="true" />}</span>
        <span><strong>{item.label}</strong><small className="meta">{item.detail}</small></span>
        <span className="check-actions">
          {item.key === 'approval' && !item.done && !item.optional && <>{approvalPending ? <Button onClick={onApprove} disabled={approving}>{approving ? <LoaderCircle size={16} className="spin" /> : null}模拟审批通过</Button> : <Button onClick={onSubmitApproval}>提交审批</Button>}</>}
          {item.key !== 'approval' && !item.done && item.link && <Link className="button button-secondary" to={item.link.to}>{item.link.label}</Link>}
          {item.done ? <StatusBadge status={item.warn ? '警告' : '通过'} /> : item.optional ? <span className="meta">全量前需要</span> : <StatusBadge status={item.key === 'approval' && approvalPending ? '待审批' : '未完成'} />}
        </span></li>)}</ul>}
    {children}
  </Capability>;
}
