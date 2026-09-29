import type { MonitorProfile } from '../../types/domain';
import { Link } from 'react-router-dom';
import { StatusBadge, VersionBadge } from '../../shared/components/Badges';

export function CallLogTable({ logs, versionFor, traceHref }: { logs: MonitorProfile['logs']; versionFor: (index: number) => string; traceHref?: (trace: string) => string }) {
  return <div className="table-scroll"><table className="data-table call-log-table"><thead><tr><th className="col-time">时间</th><th className="col-trace">Trace ID</th><th className="col-version">版本</th><th className="col-status">状态</th><th className="col-latency numeric">耗时</th><th className="col-tokens numeric">Token</th></tr></thead>
    <tbody>{logs.map((log, index) => <tr key={log.trace}><td className="nowrap">{log.time}</td><td>{traceHref ? <Link className="link-button" to={traceHref(log.trace)} title="查看 Trace 树"><code>{log.trace}</code></Link> : <code>{log.trace}</code>}</td><td><VersionBadge version={versionFor(index)} /></td><td><StatusBadge status={log.status === '成功' ? '通过' : '失败'} /></td><td className="numeric">{log.latency}</td><td className="numeric">{log.tokens}</td></tr>)}</tbody></table></div>;
}
