import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button, ConfirmAction } from '../../shared/components/Buttons';
import { DemoBadge, IntegrationNote, ScopeBadge, StatusBadge, VersionBadge, type Status } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { CompareView, DataTable, MetricCard } from '../../shared/components/DataDisplay';
import { Feedback } from '../../shared/components/Feedback';
import { tokens, icon } from '../../shared/styles/tokens';
import './design-system.css';

const colorNames: Record<keyof typeof tokens.color, string> = {
  page: '页面背景', card: '卡片', border: '边框', text: '正文', secondary: '次要文字', muted: '辅助说明', disabled: '占位 / 禁用',
  coral: '珊瑚红', coralLight: '珊瑚浅底', primary: '主按钮', primaryHover: '主按钮悬停', orange: '暖橙', orangeText: '暖橙文字', orangeLight: '暖橙浅底',
  indigo: '靛蓝', indigoLight: '靛蓝浅底', green: '翠绿', greenText: '翠绿文字', greenLight: '翠绿浅底', error: '错误', errorLight: '错误浅底',
};

const statusValues: Status[] = ['线上', '灰度中', '待审批', '阻断', '草稿', '二期', '通过', '进行中', '警告', '失败', '错误', '待发布', '历史', '成功', '异常'];

export function DesignSystemPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const simulate = () => { setBusy(true); window.setTimeout(() => setBusy(false), 800); };
  return <div className="design-page">
    <div className="page-heading"><span className="eyebrow">全局样板</span><h1>设计规范</h1><p>对照 B1–B5 检查设计变量、组件语义和响应式行为。</p></div>

    <SectionHeading eyebrow="B1 · Design tokens" title="颜色与文字" description="所有界面样式使用同一组变量；强调色按操作或状态语义使用。" />
    <Card><div className="token-grid">{Object.entries(tokens.color).map(([key, value]) => <div className="token-item" key={key}><span className="color-swatch" style={{ background: `var(--color-${key})` }} /><span><strong>{colorNames[key as keyof typeof tokens.color]}</strong><code>{value}</code></span></div>)}</div></Card>
    <div className="sample-grid"><Card><span className="eyebrow">字体与字号</span><div className="type-samples"><h1>页面标题 24 / 32</h1><h2>区块标题 18 / 26</h2><p>正文 14 / 22：让每一次 Agent 变更可追溯。</p><small>辅助文字 12 / 18：2026-09-28 16:13</small><code>Trace ID · v12 → v13</code></div><p className="meta">Noto Sans SC + Inter · 等宽 JetBrains Mono · 数字 tabular-nums</p></Card>
      <Card><span className="eyebrow">间距 / 圆角 / 阴影</span><div className="space-samples">{Object.entries(tokens.space).map(([key, value]) => <div key={key}><span className="space-bar" style={{ width: `var(--space-${key})` }} /><code>{value}</code></div>)}</div><p className="meta">卡片 12px · 控件 8px · 徽章 6px</p><div className="shadow-samples"><span>卡片阴影</span><span>悬停阴影</span></div></Card></div>
    <Card className="token-rule-card"><span className="eyebrow">布局与动效</span><p>内容最大 {tokens.layout.max} · 导航 {tokens.layout.sidebar} / {tokens.layout.sidebarCollapsed} · 辅助区 {tokens.layout.asideMin}–{tokens.layout.asideMax}</p><p>断点 ≥{tokens.breakpoint.wide}px 双栏 · {tokens.breakpoint.mobile}–{tokens.breakpoint.wide - 1}px 辅助抽屉 · &lt;{tokens.breakpoint.mobile}px 单列</p><p>过渡 {tokens.motion.fast}–{tokens.motion.slow} {tokens.motion.ease} · 位移不超过 {tokens.motion.distance} · 尊重减少动态效果</p></Card>

    <SectionHeading eyebrow="B2 / B4 · 语义与标记" title="状态与徽章" description="颜色对应固定含义；二期内容整块置灰且无法操作。" />
    <div className="sample-grid"><Card><h3>状态标签</h3><div className="badge-row">{statusValues.map(status => <StatusBadge key={status} status={status} />)}</div><h3>专属徽章</h3><div className="badge-row"><ScopeBadge phase="MVP" /><ScopeBadge phase="二期" /><VersionBadge version="v12" /><DemoBadge /></div><IntegrationNote platform="实验" /></Card>
      <Card><h3>二期占位</h3><div className="phase2-block mini-phase2" title="二期建设"><ScopeBadge phase="二期" /><strong>扩展能力</strong><p>二期建设</p></div></Card></div>

    <SectionHeading eyebrow="B5 · 操作层级" title="按钮与反馈" description="每个区域最多一个主按钮；影响线上的操作在页面内二次确认。" />
    <div className="sample-grid"><Card><h3>操作状态</h3><div className="button-samples"><Button variant="primary" onClick={simulate}>运行评测</Button><Button onClick={simulate}>查看版本</Button><Button disabled reason="上线门槛未通过">发布 v13</Button></div><p className="meta">禁用原因在按钮下方显示，也可悬停查看。</p></Card>
      <Card><h3>影响线上的操作</h3><ConfirmAction actionLabel="回退到 v12" confirmLabel="确认回退到 v12" impact="确认后，生产流量将从当前版本切换至 v12；当前会话不受影响。" onConfirm={() => setConfirmed(true)} />{confirmed && <Feedback kind="success" title="演示操作已确认" description="样板页展示确认反馈；实际业务状态将在对应页面接入。" />}</Card></div>
    <div className="feedback-grid"><Feedback kind="loading" title="正在加载评测结果" description="请稍候，演示结果即将显示。" /><Feedback kind="empty" title="暂无运行记录" description="运行一次评测后，结果会显示在这里。" /><Feedback kind="error" title="加载失败" description="请检查演示数据后重试。" /><Feedback kind="success" title="评测已完成" description="所有必选门槛均已通过。" /></div>{busy && <Feedback kind="loading" title="正在运行演示" description="预设结果即将返回。" />}

    <SectionHeading eyebrow="B3 · 数据组件" title="指标、表格与对比" description="指标颜色表示好坏；旧版本灰色、新版本靛蓝，门槛线为暖橙虚线。" />
    <div className="metric-grid"><MetricCard label="采纳率" value="42.8%" change="2.3%" direction="up" good detail="较旧版本" /><MetricCard label="P95 延迟" value="1.8s" change="0.3s" direction="up" good={false} detail="较旧版本" /><MetricCard label="过期知识命中" value="12" change="4" direction="down" good detail="较旧版本" /></div>
    <Card><h3>版本记录表格</h3><DataTable columns={[{ key: 'version', label: '版本', width: 'narrow' }, { key: 'note', label: '变更说明', width: 'wide' }, { key: 'rate', label: '采纳率', numeric: true }]} rows={[{ version: 'v13', note: '图片理解与推荐策略：这一段较长的变更说明用于检验截断和悬停全文', rate: '42.8%' }, { version: 'v12', note: '稳定生产版本', rate: '40.5%' }]} /></Card>
    <CompareView leftTitle="v12" rightTitle="v13" left={<div className="compare-content"><p>采纳率 <strong>40.5%</strong></p><div className="chart-track"><div className="chart-bar bar-old" style={{ width: '72%' }} /><span className="chart-threshold" /></div><code className="diff-deleted">− 旧版推荐策略</code></div>} right={<div className="compare-content"><p>采纳率 <strong>42.8%</strong></p><div className="chart-track"><div className="chart-bar bar-new" style={{ width: '78%' }} /><span className="chart-threshold" /></div><code className="diff-added">+ 图片理解策略</code></div>} />
    <div className="chart-legend"><span><i className="legend-old" />旧版本</span><span><i className="legend-new" />新版本</span><span><i className="legend-threshold" />门槛线</span></div>
    <Card><span className="eyebrow">Trace 树样例</span><h3>运行链路 · 2.1s</h3><div className="trace-tree"><div><span>请求进入</span><span className="trace-duration">82ms</span></div><div className="trace-depth-one"><span>知识检索</span><span className="trace-duration">420ms</span></div><div className="trace-depth-two trace-error"><span><CircleAlert size={icon.small} aria-hidden="true" />过期知识命中</span><span className="trace-duration">310ms</span></div><div className="trace-depth-one"><span>输出生成</span><span className="trace-duration">1.3s</span></div></div></Card>
  </div>;
}
