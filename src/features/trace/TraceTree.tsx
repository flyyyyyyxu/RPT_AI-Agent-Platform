/** ⑧ Trace 树：按 OpenTelemetry span 结构展示每一步的耗时、引用依据和版本号。 */
import { AlertCircle, Info, Network } from 'lucide-react';
import { DemoTag, StatusBadge, VersionBadge } from '../../shared/components/Badges';
import type { TraceRecord } from '../../types/domain';

export const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;

export function TraceTree({ trace, agentName }: { trace: TraceRecord; agentName: string }) {
  const total = trace.steps.reduce((sum, step) => sum + step.ms, 0);
  const issueIndex = trace.steps.findIndex(step => step.isNew || step.error);
  let offset = 0;
  return <>{trace.note && <p className="trace-note"><Info size={16} aria-hidden="true" />{trace.note}<DemoTag /></p>}<div className="span-tree" role="tree" aria-label={`Trace ${trace.id}`}>
    <div className="span-row root" role="treeitem"><div className="span-main"><div className="span-title"><Network size={16} strokeWidth={1.5} aria-hidden="true" /><strong>agent.run · {agentName}</strong><VersionBadge version={trace.version} />{trace.env && <span className={`env-tag ${trace.env === '隔离评测' ? 'isolated' : ''}`}>{trace.env}</span>}<StatusBadge status={trace.status === '成功' ? '通过' : '警告'} /></div><span className="span-detail">trace_id={trace.id} · service.version={trace.version} · {trace.time}</span></div>
      <div className="span-timing"><div className="span-bar"><span style={{ left: 0, width: '100%' }} /></div><span className="span-ms">{fmtMs(total)}</span></div></div>
    {trace.steps.map((step, index) => {
      const left = (offset / total) * 100; offset += step.ms;
      return <div key={index} role="treeitem" data-demo={index === issueIndex ? 'trace-issue' : undefined} className={`span-row span-depth-${step.depth} ${step.error ? 'has-error' : ''}`}>
        <div className="span-main"><div className="span-title"><span className="span-kind">{step.kind}</span><strong>{step.name}</strong><VersionBadge version={trace.version} />{step.isNew && <span className="new-tag">{trace.version} 新增</span>}</div>
          <span className="span-detail">{step.detail}</span>
          {step.evidence && <div className="span-evidence">{step.evidence.map(item => <span key={item.entry} className={`evidence-chip ${item.expired ? 'expired' : ''}`}>依据：{item.entry}<code>{item.version}</code>{item.expired && <span className="expired-tag"><AlertCircle size={16} aria-hidden="true" />已失效</span>}</span>)}</div>}
          {step.error && <span className="span-error"><AlertCircle size={16} aria-hidden="true" />{step.error}</span>}</div>
        <div className="span-timing"><div className="span-bar"><span style={{ left: `${left}%`, width: `${Math.max(1.5, (step.ms / total) * 100)}%` }} /></div><span className="span-ms">{fmtMs(step.ms)}</span></div>
      </div>;
    })}
  </div></>;
}
