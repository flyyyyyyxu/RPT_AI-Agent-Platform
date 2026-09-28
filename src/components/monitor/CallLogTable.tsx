import { callLogs } from '../../data/mock';
import { StatusBadge, VersionBadge } from '../badges/Badges';

export function CallLogTable({ productionVersion }: { productionVersion: string }) {
  return <div className="table-scroll"><table className="data-table call-log-table"><thead><tr><th>时间</th><th>Trace ID</th><th>版本</th><th>状态</th><th className="numeric">P95 延迟</th><th className="numeric">Token</th></tr></thead><tbody>{callLogs.map((log, index) => <tr key={log.trace}><td>{log.time}</td><td><code>{log.trace}</code></td><td><VersionBadge version={index < 2 ? productionVersion : log.version} /></td><td><StatusBadge status={log.status === '成功' ? '通过' : '失败'} /></td><td className="numeric">{log.latency}</td><td className="numeric">{log.tokens}</td></tr>)}</tbody></table></div>;
}
