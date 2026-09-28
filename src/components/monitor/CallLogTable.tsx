import type { MonitorProfile } from '../../types/domain';
import { StatusBadge, VersionBadge } from '../badges/Badges';

export function CallLogTable({ logs, versionFor }: { logs: MonitorProfile['logs']; versionFor: (index: number) => string }) {
  return <div className="table-scroll"><table className="data-table call-log-table"><thead><tr><th className="col-time">时间</th><th className="col-trace">Trace ID</th><th className="col-version">版本</th><th className="col-status">状态</th><th className="col-latency numeric">耗时</th><th className="col-tokens numeric">Token</th></tr></thead>
    <tbody>{logs.map((log, index) => <tr key={log.trace}><td className="nowrap">{log.time}</td><td><code>{log.trace}</code></td><td><VersionBadge version={versionFor(index)} /></td><td><StatusBadge status={log.status === '成功' ? '通过' : '失败'} /></td><td className="numeric">{log.latency}</td><td className="numeric">{log.tokens}</td></tr>)}</tbody></table></div>;
}
