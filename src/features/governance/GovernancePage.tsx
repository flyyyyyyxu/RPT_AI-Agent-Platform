/** 治理（横轴 · 平台共享）：团队与权限、输出安全护栏覆盖、审计日志。 */
import { Link } from 'react-router-dom';
import { Check, Minus, PenLine, Rocket, ShieldCheck } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { approverOf } from '../../core/data-access/scenarioData';
import { IntegrationNote, VersionBadge } from '../../shared/components/Badges';
import { SectionHeading } from '../../shared/components/Content';
import { Capability, Phase2Row } from '../../shared/components/Capability';
import type { AgentSettings } from '../../types/domain';
import './governance.css';
import { icon } from '../../shared/styles/tokens';

const roles = [
  { icon: PenLine, title: '编辑', description: '修改候选版本的配置、跑调试和评测；不能改线上版本。' },
  { icon: Rocket, title: '发布', description: '发起发布、放量、回退和下线；影响线上的操作都需要二次确认。' },
  { icon: ShieldCheck, title: '审核', description: '审批上线真实用户的发布；不能审批自己提交的发布。' },
];
const guardColumns: { key: keyof AgentSettings['guardrails']; label: string }[] = [
  { key: 'format', label: '格式校验' }, { key: 'citation', label: '引用校验' }, { key: 'promise', label: '承诺类话术' }, { key: 'safety', label: '内容安全' },
];

export function GovernancePage() {
  const { state, opsOf } = useDemo();
  const audit = state.agents.flatMap(agent => [
    ...opsOf(agent).approvals.map(item => ({ time: item.time, agent: agent.name, who: item.who, action: item.action })),
    ...(agent.lastReleaseAt && agent.productionVersion ? [{ time: agent.lastReleaseAt, agent: agent.name, who: agent.owner, action: `线上指向切换到 ${agent.productionVersion}` }] : []),
  ]).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 12);

  return <div className="page-stack">
    <div className="page-heading"><span className="eyebrow">平台共享 · 跨 Agent</span><h1>治理</h1><p>谁能改、谁能发、谁来审批都有明确规定；输出安全规则在平台网关统一执行，所有操作留痕可查。</p></div>

    <SectionHeading eyebrow="团队与权限" title="三种角色" description="按 Agent 授权；同一个人可以同时是编辑和发布，但审核必须是另一个人。" />
    <div className="role-cards">{roles.map(({ icon: Icon, title, description }) => <div className="role-card" key={title}><Icon size={icon.large} aria-hidden="true" /><strong>{title}</strong><p>{description}</p></div>)}</div>
    <Capability title="Agent 授权" description="负责人默认拥有编辑和发布权限；审批人来自业务线负责人。">
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Agent</th><th>团队</th><th>编辑 / 发布</th><th>审核</th><th>等级</th></tr></thead>
        <tbody>{state.agents.map(agent => <tr key={agent.id}><td><Link to={`/agents/${agent.id}/settings`}>{agent.name}</Link></td><td>{agent.team}</td><td>{agent.owner}</td><td><span className="truncate" title={approverOf(agent)}>{approverOf(agent)}</span></td><td><span className="level-badge">{agent.level}</span></td></tr>)}</tbody></table></div>
    </Capability>

    <SectionHeading eyebrow="输出安全" title="护栏覆盖" description="护栏在平台网关统一执行，对 Agent 的所有版本生效，回退也绕不过；每个 Agent 开哪些规则在它的设置页修改。" aside={<IntegrationNote platform="内容安全" />} />
    <Capability title="各 Agent 护栏开启情况" description="发布前的生产就绪检查要求至少开启内容安全和另一条规则。">
      <div className="table-scroll"><table className="data-table guard-table"><thead><tr><th>Agent</th>{guardColumns.map(column => <th key={column.key} className="col-guard">{column.label}</th>)}</tr></thead>
        <tbody>{state.agents.map(agent => { const guardrails = opsOf(agent).settings.guardrails; return <tr key={agent.id}><td><Link to={`/agents/${agent.id}/settings`}>{agent.name}</Link></td>
          {guardColumns.map(column => <td key={column.key} className="col-guard">{guardrails[column.key] ? <span className="guard-on"><Check size={icon.small} aria-hidden="true" />已开启</span> : <span className="guard-off"><Minus size={icon.small} aria-hidden="true" />未开启</span>}</td>)}</tr>; })}</tbody></table></div>
    </Capability>

    <SectionHeading eyebrow="审计" title="审计日志" description="提交审批、审批通过、发布、放量和回退都留痕；可按 Agent 回查某个版本是谁、在什么时候放到线上的。" />
    <Capability title="最近操作" description={`最近 ${audit.length} 条，按时间倒序。`}>
      <div className="table-scroll"><table className="data-table audit-table"><thead><tr><th className="col-time">时间</th><th className="col-agent">Agent</th><th className="col-who">操作人</th><th>操作</th></tr></thead>
        <tbody>{audit.map((item, index) => <tr key={`${item.time}-${index}`}><td className="nowrap">{item.time}</td><td><span className="truncate" title={item.agent}>{item.agent}</span></td><td><span className="truncate" title={item.who}>{item.who}</span></td><td><span className="truncate" title={item.action}>{item.action.split(/(v\d+)/).map((part, i) => /^v\d+$/.test(part) ? <VersionBadge key={i} version={part} /> : part)}</span></td></tr>)}</tbody></table></div>
    </Capability>

    <Phase2Row items={[
      { title: '细粒度资源权限', description: '按知识库、工具、评测集单独授权，跨团队只读引用。' },
      { title: '合规报表', description: '按月导出发布、回退、护栏拦截和人工复核记录。' },
      { title: '可配置策略引擎', description: '业务方自定义护栏规则，平台统一执行和审计。' },
    ]} />
  </div>;
}
