/**
 * 构建页中栏：能力配置，分组可折叠。选项都来自资产中心（只列已发布版本），和版本快照一起锁定。
 * 模型（主 + 备用）/ 知识 / 工具 / 记忆 / 执行步骤 / 输出格式与护栏。
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { modelChoices, toolChoices } from '../../core/data-access/assets';
import { knowledgeBasesFor } from '../../core/data-access/scenarioData';
import type { Agent, AgentConfig, AgentSettings } from '../../types/domain';
import { WorkflowStepList } from './WorkflowStepList';
import { icon } from '../../shared/styles/tokens';

export const NO_FALLBACK = '不启用';
export const memoryText = (config: AgentConfig) => `${config.memory.turns ? `会话记忆 ${config.memory.turns} 轮` : '不记忆'}${config.memory.preferences ? ' · 长期偏好' : ''}`;
const withCurrent = (options: string[], value: string) => options.includes(value) ? options : [value, ...options];
const guardLabels: Record<keyof AgentSettings['guardrails'], string> = { format: '格式校验', citation: '引用校验', promise: '承诺类话术拦截', safety: '内容安全' };

function Group({ id, title, summary, open, onToggle, readOnly, children }: { id: string; title: string; summary: ReactNode; open: boolean; onToggle: () => void; readOnly: boolean; children: ReactNode }) {
  return <section className={`config-group ${open ? 'open' : ''}`} data-group={id}>
    <button type="button" className="config-group-head" aria-expanded={open} onClick={onToggle}>
      {open ? <ChevronDown size={icon.small} aria-hidden="true" /> : <ChevronRight size={icon.small} aria-hidden="true" />}<strong>{title}</strong><span className="config-group-summary">{summary}</span>
    </button>
    {open && <fieldset className="config-fieldset config-group-body" disabled={readOnly}>{children}</fieldset>}
  </section>;
}

export function CapabilityPanel({ agent, config, readOnly, patch }: { agent: Agent; config: AgentConfig; readOnly: boolean; patch: (value: Partial<AgentConfig>) => void }) {
  const { state, opsOf } = useDemo();
  const settings = opsOf(agent).settings;
  const [open, setOpen] = useState<Record<string, boolean>>({ model: true, knowledge: true, tools: true, memory: false, steps: true, output: false });
  const toggle = (id: string) => setOpen(value => ({ ...value, [id]: !value[id] }));

  const models = modelChoices(state, [config.model, config.fallbackModel]);
  const main = models.find(item => item.key === config.model);
  const fallback = models.find(item => item.key === config.fallbackModel);
  const knowledgeOptions = [...knowledgeBasesFor(state).flatMap(kb => kb.versions.map(item => `${kb.name} ${item.id}`)), '暂不接入'];
  const { rows: tools, hidden } = toolChoices(state, agent.team, config.tools);
  const toggleTool = (value: string) => patch({ tools: config.tools.includes(value) ? config.tools.filter(item => item !== value) : [...config.tools, value] });
  const degradeToFallback = settings.degrade === '切换备用模型';
  const batch = settings.execMode === '批量';
  const guards = Object.entries(settings.guardrails) as [keyof AgentSettings['guardrails'], boolean][];

  return <div className="build-panel capability-panel">
    <div className="build-panel-head"><div><h3>能力配置</h3><p className="meta">选项来自资产中心，只列已发布版本；保存时连同版本号一起锁进快照。</p></div></div>

    <Group id="model" title="模型" open={open.model} onToggle={() => toggle('model')} readOnly={readOnly} summary={<>{config.model.split(' · ')[0]}{config.fallbackModel !== NO_FALLBACK ? ` · 备用 ${config.fallbackModel.split(' · ')[0]}` : ''}</>}>
      <label className="field-label">主模型<span className="select-field"><select value={config.model} onChange={event => patch({ model: event.target.value, fallbackModel: event.target.value === config.fallbackModel ? NO_FALLBACK : config.fallbackModel })}>{models.map(item => <option key={item.key} value={item.key}>{item.key}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>
        {main?.record ? <span className="meta field-hint">权重 {main.weights} · 上下文 {main.record.versions[0].content.context} · P95 {main.record.versions[0].content.p95} · 输入 ¥{main.record.versions[0].content.priceIn} / 输出 ¥{main.record.versions[0].content.priceOut} 每百万 tokens · {main.record.versions[0].content.dataLevel}</span> : <span className="meta field-hint">资产中心已找不到这个模型，建议更换</span>}</label>
      <label className="field-label">备用模型<span className="select-field"><select value={config.fallbackModel} onChange={event => patch({ fallbackModel: event.target.value })}>{[NO_FALLBACK, ...models.filter(item => item.key !== config.model).map(item => item.key)].map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>
        {degradeToFallback && config.fallbackModel === NO_FALLBACK
          ? <span className="field-hint warning-text"><AlertTriangle size={icon.small} aria-hidden="true" />设置页的降级策略是「切换备用模型」，但这个版本没有备用模型，降级时只能返回兜底话术。</span>
          : <span className="meta field-hint">主模型超时或出错时切换；何时切换由 <Link to={`/agents/${agent.id}/settings`}>设置 · 降级策略</Link> 决定（当前：{settings.degrade}{!degradeToFallback && config.fallbackModel !== NO_FALLBACK ? '，备用模型暂不会被使用' : ''}）。{fallback?.record ? ` 备用模型 P95 ${fallback.record.versions[0].content.p95}。` : ''}</span>}</label>
    </Group>

    <Group id="knowledge" title="知识" open={open.knowledge} onToggle={() => toggle('knowledge')} readOnly={readOnly} summary={config.knowledge}>
      <label className="field-label">知识库版本<span className="select-field"><select value={config.knowledge} onChange={event => patch({ knowledge: event.target.value })}>{withCurrent(knowledgeOptions, config.knowledge).map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>
        <span className="meta field-hint">选的是知识库的具体版本；知识运营发布新版本后，这里不会自动变化，版本快照页会提示升级。</span></label>
    </Group>

    <Group id="tools" title="工具" open={open.tools} onToggle={() => toggle('tools')} readOnly={readOnly} summary={config.tools.length ? `${config.tools.length} 个：${config.tools.join('、')}` : '未接入'}>
      <div className="tool-rows">{tools.map(({ record, versions, latest, pending }) => {
        const inUse = config.tools.filter(item => item.startsWith(`${record.name} v`));
        const allVersions = [...versions, ...inUse.map(item => item.slice(record.name.length + 1)).filter(id => !versions.includes(id))];
        return <div className={`tool-row ${inUse.length ? 'selected' : ''}`} key={record.key}>
          <div className="tool-row-name"><strong>{record.name}</strong><span className="meta">{record.team}{record.visibility !== '全公司' ? ` · ${record.visibility}` : ''}{pending ? ` · ${pending} 审核中` : ''}</span></div>
          <div className="tool-row-versions" role="group" aria-label={`${record.name} 版本`}>{allVersions.map(id => { const value = `${record.name} ${id}`; const checked = config.tools.includes(value); return <label key={id} className={`tool-option ${checked ? 'selected' : ''}`}><input type="checkbox" checked={checked} onChange={() => toggleTool(value)} />{id}{id === latest ? <small>最新</small> : null}</label>; })}</div>
          {inUse.length > 1 && <p className="meta tool-row-note">同时接入 {inUse.length} 个版本：请在执行步骤里写清每一步用哪个版本。</p>}
        </div>;
      })}</div>
      <p className="meta">{hidden ? `另有 ${hidden} 个工具只对其他团队开放，` : ''}需要新工具请到 <Link to="/assets/tools">资产中心 · 工具</Link> 登记，审核通过后出现在这里。</p>
    </Group>

    <Group id="memory" title="记忆" open={open.memory} onToggle={() => toggle('memory')} readOnly={readOnly} summary={memoryText(config)}>
      <label className="field-label">会话记忆<span className="select-field"><select value={config.memory.turns} onChange={event => patch({ memory: { ...config.memory, turns: Number(event.target.value) } })}>{[0, 3, 5, 10, 20].map(turns => <option key={turns} value={turns}>{turns ? `保留最近 ${turns} 轮` : '不记忆（每轮独立）'}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>
        <span className={`field-hint ${batch && config.memory.turns ? 'warning-text' : 'meta'}`}>{batch && config.memory.turns ? '执行模式是「批量」，没有会话，会话记忆不会生效。' : '轮数越多，追问越连贯，但每次请求的 tokens 和延迟也越高。'}</span></label>
      <label className="check-field"><input type="checkbox" checked={config.memory.preferences} onChange={event => patch({ memory: { ...config.memory, preferences: event.target.checked } })} /><span><strong>长期偏好记忆</strong><span className="meta">跨会话保存用户偏好标签（脱敏），例如风格、尺码；用户可在隐私设置里清除。</span></span></label>
    </Group>

    <Group id="steps" title="执行步骤" open={open.steps} onToggle={() => toggle('steps')} readOnly={readOnly} summary={`${config.steps.length} 步`}>
      <WorkflowStepList steps={config.steps} readOnly={readOnly} onChange={steps => patch({ steps })} />
    </Group>

    <Group id="output" title="输出格式与护栏" open={open.output} onToggle={() => toggle('output')} readOnly={readOnly} summary={config.outputFormat}>
      <label className="field-label">输出格式<input value={config.outputFormat} readOnly={readOnly} onChange={event => patch({ outputFormat: event.target.value })} /></label>
      <div className="guard-summary"><span className="meta">护栏（Agent 级，对所有版本生效）</span>
        <div className="guard-chips">{guards.map(([key, on]) => <span key={key} className={`guard-chip ${on ? 'on' : ''}`}>{on && <ShieldCheck size={icon.small} aria-hidden="true" />}{guardLabels[key]}{on ? '' : ' · 未开启'}</span>)}</div>
        <span className="meta">在 <Link to={`/agents/${agent.id}/settings`}>设置 · 护栏</Link> 中修改；不随版本切换，回退时依然生效。</span></div>
    </Group>
  </div>;
}
