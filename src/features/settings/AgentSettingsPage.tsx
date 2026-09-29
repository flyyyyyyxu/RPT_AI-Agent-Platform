import { ArrowRight, BellRing, CheckCircle2, ChevronDown, ShieldCheck } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { IntegrationNote, ScopeBadge } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Capability, CapabilityBadges, HeroTag, SkeletonHeading, SkeletonOnly } from '../../shared/components/Capability';
import { Segmented, Switch } from '../../shared/components/controls';
import { AgentShell } from '../shell/AgentShell';
import type { Agent, AgentSettings, ExecMode } from '../../types/domain';
import './settings.css';
import { icon } from '../../shared/styles/tokens';

const degradeOptions = ['返回兜底话术', '切换备用模型 Qwen3-32B', '转人工客服', '暂停批次并告警'];
const overBudgetOptions = ['仅告警', '自动降级到备用模型', '超出后暂停调用'];
const execModes: { value: ExecMode; label: string; description: string }[] = [
  { value: '在线', label: '在线', description: '同步请求，按 P95 延迟和 QPS 保障。' },
  { value: '批量', label: '批量', description: '异步分片跑批，和批量评测共用批处理能力。' },
  { value: '会话', label: '会话', description: '多轮会话，保留上下文并支持转人工。' },
];
const guardRules: { key: keyof AgentSettings['guardrails']; title: string; description: string }[] = [
  { key: 'format', title: '格式校验', description: '按输出格式（JSON 字段、结构化段落）校验，不合格时重试或返回兜底。' },
  { key: 'citation', title: '引用校验', description: '引用的知识条目必须存在且在生效期内，失效条款会被拦截。' },
  { key: 'promise', title: '承诺类话术拦截', description: '拦截赔付金额、时效、功效等承诺表述，改写为引导人工确认。' },
];

export function AgentSettingsPage({ agent }: { agent: Agent }) {
  const { opsOf, updateOps } = useDemo();
  const settings = opsOf(agent).settings;
  const patch = (value: Partial<AgentSettings>) => updateOps(agent.id, current => ({ ...current, settings: { ...current.settings, ...value } }));
  const guard = (key: keyof AgentSettings['guardrails'], value: boolean) => patch({ guardrails: { ...settings.guardrails, [key]: value } });
  const used = agent.costThisMonth;
  const ratio = Math.min(100, (used / Math.max(1, settings.monthlyBudget)) * 100);
  const costSplit = [{ label: '模型调用', share: 0.72 }, { label: '检索', share: 0.12 }, { label: '工具调用', share: 0.09 }, { label: '护栏检查', share: 0.07 }];
  const savedHint = <span className="meta saved-hint"><CheckCircle2 size={icon.small} aria-hidden="true" />修改即时生效（演示）</span>;

  const aside = <><Card><span className="eyebrow">基础资料</span><h3>{agent.name}</h3><p>负责人 {agent.owner} · {agent.team}</p><p className="meta">设置按 Agent 生效，所有版本共用；版本快照里只锁定模型、Prompt、工具和知识。</p></Card>
    <SkeletonOnly><Card><div className="sub-heading"><span className="eyebrow">发布联动</span><CapabilityBadges skeleton={[3]} /></div><h3>生产就绪检查会读取这里</h3><p className="meta">「已配置护栏」要求开启内容安全和至少一条其他规则；「已配置告警」对应下方告警开关。</p></Card></SkeletonOnly></>;

  return <AgentShell agent={agent} stepId="settings" aside={aside}>
    <SectionHeading eyebrow="基础能力 · 设置" title="Agent 设置" description="基础资料和运行策略。" aside={<ScopeBadge phase="MVP" />} />
    <Card><dl className="basic-info"><div><dt>名称</dt><dd>{agent.name}</dd></div><div><dt>负责人</dt><dd>{agent.owner}</dd></div><div><dt>所属团队</dt><dd>{agent.team}</dd></div><div><dt>等级</dt><dd>{agent.level}</dd></div><div><dt>场景</dt><dd>{agent.mode}</dd></div></dl></Card>

    <SkeletonHeading skeleton={[7]} title="运行保障" description="执行模式、限流与配额、降级和转人工，保证业务高峰和下游故障时可用。" />
    <Capability skeleton={[7]} title="执行模式与流量保障" description="同一套 Agent 定义可以按在线、批量、会话三种模式运行。" actions={savedHint}>
      <div className="settings-grid">
        <div><span className="field-label">执行模式</span><Segmented label="执行模式" value={settings.execMode} options={execModes.map(item => ({ value: item.value, label: item.label }))} onChange={value => patch({ execMode: value })} />
          <p className="meta">{execModes.find(item => item.value === settings.execMode)?.description}</p></div>
        <div className="inline-fields">
          <label className="field-label">限流（QPS）<input type="number" min={1} value={settings.qps} onChange={event => patch({ qps: Math.max(1, Number(event.target.value) || 1) })} /><span className="meta field-hint">超出后排队，排队超过 2s 触发降级</span></label>
          <label className="field-label">每日调用配额<input type="number" min={0} step={1000} value={settings.dailyQuota} onChange={event => patch({ dailyQuota: Math.max(0, Number(event.target.value) || 0) })} /><span className="meta field-hint">团队配额由平台统一分配</span></label>
          <label className="field-label">降级策略<span className="select-field"><select value={settings.degrade} onChange={event => patch({ degrade: event.target.value })}>{degradeOptions.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span><span className="meta field-hint">模型超时、下游故障或超配额时执行</span></label>
        </div>
        <div className="range-field"><span className="field-label">低置信度转人工阈值<span className="range-value">{settings.handoffThreshold.toFixed(2)}</span></span>
          <input type="range" min={0.3} max={0.9} step={0.05} value={settings.handoffThreshold} aria-label="低置信度转人工阈值" onChange={event => patch({ handoffThreshold: Number(event.target.value) })} />
          <span className="range-scale meta"><span>0.30 少转人工</span><span>置信度低于阈值时{settings.execMode === '批量' ? '送人工复核' : '转人工'}</span><span>0.90 多转人工</span></span></div>
      </div>
    </Capability>
    <Capability skeleton={[7, 8]} hero={4} title="告警规则" description="异常第一时间通知负责人和值班组。" actions={<IntegrationNote platform="监控" />}>
      <Switch checked={settings.alerts} onChange={value => patch({ alerts: value })} label="启用告警" />
      <ul className="check-list">{[['错误率 > 1%（5 分钟）', '电话 + 群消息'], ['P95 延迟超过门槛 20%（10 分钟）', '群消息'], [`本月成本达到预算 ${settings.budgetAlert}%`, '邮件'], ['护栏拦截率突增 3 倍', '群消息']].map(([rule, channel]) => <li key={rule} className={`check-item ${settings.alerts ? 'done' : ''}`}><BellRing className="check-icon" size={icon.large} aria-hidden="true" /><span><strong>{rule}</strong><small className="meta">通知：{agent.owner}、{agent.team}值班组 · {channel}</small></span><span className="meta">{settings.alerts ? '已生效' : '未启用'}</span></li>)}</ul>
    </Capability>

    <SkeletonHeading skeleton={[9]} title="输出安全护栏" description="所有 Agent 的输出在返回前经过平台网关统一检查，业务不用各自实现。" />
    <Capability skeleton={[9]} title="护栏规则" description="规则在网关统一执行，对该 Agent 的所有版本生效；版本回退不会绕过护栏。" actions={savedHint}>
      <div className="gateway-flow" aria-label="执行位置"><span>Agent 生成</span><ArrowRight size={icon.small} aria-hidden="true" /><span className="gateway"><ShieldCheck size={icon.small} aria-hidden="true" /> 平台网关 · 护栏统一执行</span><ArrowRight size={icon.small} aria-hidden="true" /><span>返回用户 / 写回业务</span></div>
      <div className="guard-list">
        {guardRules.map(rule => <div className="guard-row" key={rule.key}><div><strong>{rule.title}</strong><p>{rule.description}</p></div><Switch checked={settings.guardrails[rule.key]} onChange={value => guard(rule.key, value)} label={rule.title} hideLabel /></div>)}
        <div className="guard-row hero-row"><div><div className="guard-row-title"><strong>内容安全</strong><HeroTag n={4} compact /><IntegrationNote platform="内容安全" /></div><p>调用公司内容安全服务检测违法违规、隐私和未成年人相关风险；审核策略与社区一致，平台不重复建设。</p></div><Switch checked={settings.guardrails.safety} onChange={value => guard('safety', value)} label="内容安全" hideLabel /></div>
      </div>
    </Capability>

    <SkeletonHeading skeleton={[10]} title="合规与成本" description="按 Agent 记账，预算提前告警，超预算按策略处理。" />
    <Capability skeleton={[10]} title="成本与预算" description="成本按版本和调用归集，来自公司计费数据（演示数据）。" actions={savedHint}>
      <div className="settings-grid">
        <div><div className="sub-heading"><h4>本月已用 ¥{used.toLocaleString('zh-CN')} / 预算 ¥{settings.monthlyBudget.toLocaleString('zh-CN')}</h4><span className={ratio >= settings.budgetAlert ? 'warning-text' : 'meta'}>{ratio.toFixed(1)}%{ratio >= settings.budgetAlert ? ' · 已达告警线' : ''}</span></div>
          <div className="budget-bar" aria-label={`预算使用 ${ratio.toFixed(1)}%`}><span className={ratio >= settings.budgetAlert ? 'over' : ''} style={{ width: `${ratio}%` }} /><i style={{ left: `${settings.budgetAlert}%` }} title="预算告警线" /></div>
          <div className="traffic-legend"><span><i className="traffic-new" />已用</span><span><i className="legend-threshold" />告警线 {settings.budgetAlert}%</span></div></div>
        <div className="cost-split">{costSplit.map(item => <div key={item.label}><span className="meta">{item.label}</span><strong>¥{Math.round(used * item.share).toLocaleString('zh-CN')}</strong><span className="meta">{(item.share * 100).toFixed(1)}%</span></div>)}</div>
        <div className="inline-fields">
          <label className="field-label">月预算（元）<input type="number" min={0} step={500} value={settings.monthlyBudget} onChange={event => patch({ monthlyBudget: Math.max(0, Number(event.target.value) || 0) })} /></label>
          <label className="field-label">预算告警线（%）<input type="number" min={50} max={100} step={5} value={settings.budgetAlert} onChange={event => patch({ budgetAlert: Math.min(100, Math.max(50, Number(event.target.value) || 80)) })} /></label>
          <label className="field-label">超预算策略<span className="select-field"><select value={settings.overBudget} onChange={event => patch({ overBudget: event.target.value })}>{overBudgetOptions.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span></label>
        </div>
      </div>
    </Capability>
  </AgentShell>;
}
