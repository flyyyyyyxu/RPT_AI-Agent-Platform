/**
 * 接入方式：业务方怎么调用这个 Agent。
 *   - 默认「按线上指向」调用：发布、灰度、回退对调用方透明，响应头带实际命中的版本号，用于埋点归因；
 *   - 「指定版本」只用于回放、对账、申诉复核这类需要复现旧行为的场景；
 *   - 调用方必须登记（服务名、负责人、QPS 配额），网关拒绝未登记的服务；登记的配额合计不能超过设置页的限流。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, Copy, Plus } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { nowStamp } from '../../core/rules/clock';
import { getVersion } from '../../core/rules/versions';
import { appIdOf, gatewayBase } from '../../data';
import type { Agent, AgentOps, CallerRecord } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { VersionBadge } from '../../shared/components/Badges';
import { Capability } from '../../shared/components/Capability';
import { Segmented } from '../../shared/components/controls';
import { icon } from '../../shared/styles/tokens';

type Tab = 'online' | 'batch' | 'sdk';
type Mode = 'pointer' | 'pinned';

function sample(tab: Tab, { appId, version, inputs, session }: { appId: string; version: string | null; inputs: string[]; session: boolean }) {
  const inputJson = `{ ${inputs.map(name => `"${name}": "…"`).join(', ')} }`;
  const versionLine = version ? `\n    "version": "${version}",` : '';
  if (tab === 'online') return `curl -X POST ${gatewayBase}/apps/${appId}/invoke \\
  -H "Authorization: Bearer $SERVICE_TOKEN" \\
  -H "X-Caller: <已登记的服务名>" \\
  -d '{${versionLine}
    "inputs": ${inputJson}${session ? ',\n    "session_id": "<会话 ID，开启会话粘性时同一会话命中同一版本>"' : ''}
  }'
# 响应头 X-Agent-Version：实际命中的版本（灰度期间可能是候选版本），写入埋点用于归因`;
  if (tab === 'batch') return `curl -X POST ${gatewayBase}/apps/${appId}/batch-jobs \\
  -H "Authorization: Bearer $SERVICE_TOKEN" \\
  -H "X-Caller: <已登记的服务名>" \\
  -d '{${versionLine}
    "input_file": "hdfs://…/inputs.jsonl",      # 每行 ${inputJson}
    "callback_url": "https://…/agent-callback",
    "shard_size": 500
  }'
# 返回 job_id；分片跑批，结果逐行写回并带 agent_version 字段`;
  return `from xhs_agent import AgentClient   # 公司内部 SDK

client = AgentClient(app_id="${appId}", caller="<已登记的服务名>")
resp = client.invoke(
    inputs=${inputJson.replace(/"…"/g, '...')},${version ? `\n    version="${version}",   # 锁定版本：发布和回退都不影响` : '\n    # 不传 version：跟随线上指向'}${session ? '\n    session_id=session_id,' : ''}
)
print(resp.output, resp.agent_version, resp.trace_id)`;
}

export function AccessCard({ agent, ops }: { agent: Agent; ops: AgentOps }) {
  const { updateOps } = useDemo();
  const settings = ops.settings;
  const production = getVersion(agent, agent.productionVersion);
  const pinnable = agent.versions.filter(version => version.everOnline);
  const [mode, setMode] = useState<Mode>('pointer');
  const [pinned, setPinned] = useState(production?.id ?? pinnable[0]?.id ?? '');
  const [tab, setTab] = useState<Tab>(settings.execMode === '批量' ? 'batch' : 'online');
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const appId = appIdOf(agent.id);
  const inputs = [...new Set((production ?? agent.versions[0]).config.prompt.match(/{{([^}]+)}}/g)?.map(item => item.slice(2, -2)) ?? ['input'])];
  const code = sample(tab, { appId, version: mode === 'pinned' ? pinned : null, inputs, session: settings.execMode === '会话' });
  const allocated = ops.callers.reduce((sum, caller) => sum + caller.qps, 0);
  const log = (action: string) => updateOps(agent.id, current => ({ ...current, approvals: [{ time: nowStamp(), who: agent.owner, action }, ...current.approvals] }));
  const follow = (caller: CallerRecord) => { updateOps(agent.id, current => ({ ...current, callers: current.callers.map(item => item.id === caller.id ? { ...item, pin: null } : item) })); log(`调用方 ${caller.service} 改为跟随线上指向（原锁定 ${caller.pin}）`); };
  const copy = () => { void navigator.clipboard?.writeText(code).catch(() => undefined); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  return <Capability title="接入方式" demo="access" description="业务方默认按线上指向调用：发布、灰度、回退对调用方透明，不需要改代码。只有回放、对账、申诉复核这类要复现旧行为的场景才锁定版本。"
    actions={<Link className="link-button" to={`/agents/${agent.id}/settings`}>限流 {settings.qps.toLocaleString('zh-CN')} QPS · {settings.execMode}模式</Link>}>
    <dl className="access-kv">
      <div><dt>app_id</dt><dd><code>{appId}</code></dd></div>
      <div><dt>调用地址</dt><dd><code>POST {gatewayBase}/apps/{appId}/{settings.execMode === '批量' ? 'batch-jobs' : 'invoke'}</code></dd></div>
      <div><dt>鉴权</dt><dd>公司服务账号 + 调用方登记；网关拒绝未登记的服务</dd></div>
      <div><dt>当前线上</dt><dd>{production ? <><VersionBadge version={production.id} /> 不传 version 时命中线上指向；灰度期间按分桶命中</> : '尚未发布，接口暂不可用'}</dd></div>
    </dl>

    <div className="access-controls">
      <Segmented label="调用方式" value={mode} onChange={setMode} options={[{ value: 'pointer', label: '按线上指向（推荐）' }, { value: 'pinned', label: '指定版本' }]} />
      {mode === 'pinned' && <label className="compact-select access-pin"><span className="sr-only">锁定的版本</span><select value={pinned} onChange={event => setPinned(event.target.value)}>{pinnable.map(version => <option key={version.id} value={version.id}>锁定 {version.id} · {version.status}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></label>}
      <Segmented label="示例类型" value={tab} onChange={setTab} options={[{ value: 'online', label: '在线 API' }, { value: 'batch', label: '批量 API' }, { value: 'sdk', label: 'SDK 示例' }]} />
    </div>
    <p className="meta">{mode === 'pointer' ? '不传 version：请求跟着线上指向走，回退后下一次请求立即回到旧版本。' : `锁定 ${pinned}：之后的发布、回退都不会改变这个调用方的行为，版本下线前平台会通知负责人。只能锁定上过线的版本。`}</p>
    <div className="code-sample"><pre>{code}</pre><button type="button" className="icon-button" onClick={copy} aria-label="复制示例代码" title="复制">{copied ? '已复制' : <Copy size={icon.small} />}</button></div>

    <div className="callers-head"><strong>调用方登记 · {ops.callers.length} 个</strong><span className={allocated > settings.qps ? 'warning-text' : 'meta'}>已分配 {allocated.toLocaleString('zh-CN')} / 限流 {settings.qps.toLocaleString('zh-CN')} QPS</span>
      {!adding && <Button onClick={() => setAdding(true)}><Plus size={icon.small} />登记调用方</Button>}</div>
    {adding && <CallerForm agent={agent} ops={ops} remaining={Math.max(0, settings.qps - allocated)} onCancel={() => setAdding(false)} onSubmit={caller => { updateOps(agent.id, current => ({ ...current, callers: [...current.callers, caller] })); log(`登记调用方 ${caller.service}（${caller.pin ? `锁定 ${caller.pin}` : '跟随线上指向'}，${caller.qps} QPS）`); setAdding(false); }} />}
    <div className="table-scroll"><table className="data-table callers-table"><thead><tr><th>调用方</th><th>负责人</th><th className="numeric">QPS 配额</th><th>调用方式</th><th>接口</th><th>登记时间</th></tr></thead>
      <tbody>{ops.callers.map(caller => { const stale = caller.pin && caller.pin !== agent.productionVersion; return <tr key={caller.id}>
        <td><span className="caller-name"><strong className="truncate" title={caller.service}>{caller.service}</strong><span className="meta truncate" title={caller.scene}>{caller.scene}</span></span></td>
        <td>{caller.owner}</td><td className="numeric">{caller.qps.toLocaleString('zh-CN')}</td>
        <td>{caller.pin ? <span className={`caller-pin ${stale ? 'stale' : ''}`}>{stale && <AlertTriangle size={icon.small} aria-hidden="true" />}锁定 {caller.pin}{stale ? ` · 线上已是 ${agent.productionVersion ?? '—'}` : ''}</span> : <span className="caller-follow">跟随线上</span>}
          {caller.pin && stale && <button type="button" className="link-button" onClick={() => follow(caller)}>改为跟随线上</button>}</td>
        <td className="nowrap">{caller.api}</td><td className="nowrap">{caller.since}</td></tr>; })}</tbody></table></div>
  </Capability>;
}

function CallerForm({ agent, ops, remaining, onCancel, onSubmit }: { agent: Agent; ops: AgentOps; remaining: number; onCancel: () => void; onSubmit: (caller: CallerRecord) => void }) {
  const pinnable = agent.versions.filter(version => version.everOnline);
  const [service, setService] = useState('');
  const [scene, setScene] = useState('');
  const [owner, setOwner] = useState('');
  const [qps, setQps] = useState(Math.min(50, remaining));
  const [pin, setPin] = useState('');
  const [api, setApi] = useState<CallerRecord['api']>(ops.settings.execMode === '批量' ? '批量 API' : '在线 API');
  const duplicate = ops.callers.some(caller => caller.service === service.trim());
  const missing = !service.trim() ? '服务名' : !owner.trim() ? '负责人' : qps <= 0 ? 'QPS 配额' : null;
  const problem = duplicate ? `服务 ${service.trim()} 已登记` : qps > remaining ? `超出剩余可分配的 ${remaining} QPS，请先在设置页调高限流` : missing ? `还差一步：填写${missing}` : null;
  return <div className="caller-form" data-demo="caller-form">
    <div className="caller-form-grid">
      <label className="field-label">服务名<input value={service} placeholder="例如 note-feed-service" onChange={event => setService(event.target.value)} /></label>
      <label className="field-label">使用场景<input value={scene} placeholder="例如 发现页穿搭卡片" onChange={event => setScene(event.target.value)} /></label>
      <label className="field-label">负责人<input value={owner} onChange={event => setOwner(event.target.value)} /></label>
      <label className="field-label">QPS 配额<input type="number" min={1} value={qps} onChange={event => setQps(Math.max(0, Number(event.target.value) || 0))} /></label>
      <label className="field-label">调用方式<span className="select-field"><select value={pin} onChange={event => setPin(event.target.value)}><option value="">跟随线上指向（推荐）</option>{pinnable.map(version => <option key={version.id} value={version.id}>锁定 {version.id}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span></label>
      <label className="field-label">接口<span className="select-field"><select value={api} onChange={event => setApi(event.target.value as CallerRecord['api'])}><option>在线 API</option><option>批量 API</option></select><ChevronDown size={icon.small} aria-hidden="true" /></span></label>
    </div>
    <div className="caller-form-foot"><span className={problem ? 'warning-text' : 'meta'}>{problem ?? `登记后网关放行该服务，配额 ${qps} QPS。`}</span>
      <Button onClick={onCancel}>取消</Button><Button variant="primary" disabled={Boolean(problem)} onClick={() => onSubmit({ id: `cl-${Date.now()}`, service: service.trim(), scene: scene.trim() || '—', owner: owner.trim(), qps, pin: pin || null, api, since: nowStamp().slice(0, 10) })}>登记</Button></div>
  </div>;
}
