/**
 * 构建页中栏：能力配置，参照千帆的能力扩展，只保留影响 Agent 行为的部分：
 *   模型（主 / 备用、最大思考次数、参考对话轮数）· 技能（工具、执行步骤）· 知识（知识库、数据库）
 *   · 记忆（记忆变量、记忆表、记忆片段）· 对话（开场白、推荐问、追问）· 输出与安全（输出格式、护栏）。
 * 默认只显示已添加的内容；每个小模块右上角的 ＋ 打开添加弹窗（从资产中心搜索，或上传后入库）。
 * 同一个工具只挂一个版本；知识库、数据库各最多 1 个。批量模式没有会话，记忆和对话整组停用。
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { latestPublished, modelChoices, visibleRecords } from '../../core/data-access/assets';
import { knowledgeBasesFor } from '../../core/data-access/scenarioData';
import type { Agent, AgentConfig, AgentSettings, FollowUpMode, TuneTarget } from '../../types/domain';
import { Switch } from '../../shared/components/controls';
import { WorkflowStepList } from './WorkflowStepList';
import { AddDialog } from './AddDialog';
import { ToolForm } from '../library/ToolsTab';
import { KnowledgeCreate } from '../library/KnowledgeTab';
import { DatabaseForm } from '../library/DatabasesTab';
import { icon } from '../../shared/styles/tokens';

export const NO_FALLBACK = '不启用';
export const NO_KNOWLEDGE = '暂不接入';
export const memoryText = (config: AgentConfig) => `参考 ${config.memory.turns} 轮 · 变量 ${config.memory.variables.length} 个 · 记忆表 ${config.memory.tables.length} 张 · 记忆片段${config.memory.fragments ? '开' : '关'}`;
export const dialogText = (config: AgentConfig) => config.dialog.opening || config.dialog.suggestions.length || config.dialog.followUp !== '关闭'
  ? `开场白${config.dialog.opening ? '已设置' : '未设置'} · 推荐问 ${config.dialog.suggestions.length} 条 · 追问${config.dialog.followUp}` : '未设置';
const toolName = (value: string) => value.replace(/ v\d+$/, '');
const guardLabels: Record<keyof AgentSettings['guardrails'], string> = { format: '格式校验', citation: '引用校验', promise: '承诺类话术拦截', safety: '内容安全' };

type Dialog = 'tools' | 'knowledge' | 'database';
type Form = 'tool' | 'knowledge' | 'database';

/** 一级分组的标题（灰色小字），停用时写明原因 */
function Section({ title, disabled, children }: { title: string; disabled?: string; children: ReactNode }) {
  return <section className={`cap-section ${disabled ? 'is-disabled' : ''}`}><h4>{title}</h4>{disabled && <p className="cap-disabled"><AlertTriangle size={icon.small} aria-hidden="true" />{disabled}</p>}{children}</section>;
}

/** 小模块：左侧折叠标题，右侧是 ＋ / 开关 / 下拉等操作 */
function Module({ id, title, hint, action, open, onToggle, readOnly, focused, children }: { id: string; title: string; hint?: string; action?: ReactNode; open: boolean; onToggle: () => void; readOnly: boolean; focused?: boolean; children: ReactNode }) {
  return <div className={`cap-module ${open ? 'open' : ''} ${focused ? 'is-focus' : ''}`} data-group={id}>
    <div className="cap-module-head">
      <button type="button" className="cap-module-toggle" aria-expanded={open} onClick={onToggle}>{open ? <ChevronDown size={icon.small} aria-hidden="true" /> : <ChevronRight size={icon.small} aria-hidden="true" />}<strong>{title}</strong>{focused && <span className="focus-tag">本轮调优</span>}</button>
      {!readOnly && action && <span className="cap-module-action">{action}</span>}
    </div>
    {hint && !open && <p className="cap-module-hint">{hint}</p>}
    {open && <fieldset className="config-fieldset cap-module-body" disabled={readOnly}>{children}</fieldset>}
  </div>;
}

const AddButton = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: string }) =>
  <button type="button" className="icon-button cap-add" onClick={onClick} disabled={Boolean(disabled)} aria-label={label} title={disabled ?? label}><Plus size={icon.large} /></button>;
const RemoveButton = ({ label, onClick }: { label: string; onClick: () => void }) =>
  <button type="button" className="icon-button" onClick={onClick} aria-label={label} title={label}><Trash2 size={icon.small} /></button>;

/** 本轮优化目标的调优对象 → 要展开并高亮的模块 */
const focusModules: Record<TuneTarget, string[]> = { Prompt: [], 知识: ['knowledge', 'database'], 模型: ['model'], 工具: ['tools'], 编排: ['steps', 'tools'], 策略: ['model', 'output'] };

export function CapabilityPanel({ agent, config, readOnly, focus = [], patch }: { agent: Agent; config: AgentConfig; readOnly: boolean; focus?: TuneTarget[]; patch: (value: Partial<AgentConfig>) => void }) {
  const focused = new Set(focus.flatMap(target => focusModules[target]));
  const { state, opsOf } = useDemo();
  const settings = opsOf(agent).settings;
  const batch = settings.execMode === '批量';
  const noSession = batch ? '执行模式是「批量」，没有会话：记忆和对话体验不生效。' : undefined;
  const [open, setOpen] = useState<Record<string, boolean>>(() => { const base: Record<string, boolean> = { model: true, tools: true, steps: true, knowledge: true, database: true, variables: true, tables: true, fragments: false, opening: true, suggestions: true, followUp: false, output: false }; focused.forEach(id => { base[id] = true; }); return base; });
  const toggle = (id: string) => setOpen(value => ({ ...value, [id]: !value[id] }));
  const expand = (id: string) => setOpen(value => ({ ...value, [id]: true }));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const defaults = { team: agent.team, owner: agent.owner };

  /* 模型 */
  const models = modelChoices(state, [config.model, config.fallbackModel]);
  const main = models.find(item => item.key === config.model);
  const degradeToFallback = settings.degrade === '切换备用模型';

  /* 工具：同一个工具只挂一个版本 */
  const toolRecords = state.assets.tools;
  const recordOf = (value: string) => toolRecords.find(item => item.name === toolName(value));
  const setToolVersion = (value: string, next: string) => patch({ tools: config.tools.map(item => item === value ? `${toolName(value)} ${next}` : item) });
  const addTool = (name: string) => { const record = toolRecords.find(item => item.name === name); const latest = record && latestPublished(record); if (!latest) return; patch({ tools: [...config.tools.filter(item => toolName(item) !== name), `${name} ${latest.id}`] }); expand('tools'); setDialog(null); };

  /* 知识库、数据库：各最多 1 个 */
  const kbs = knowledgeBasesFor(state);
  const kbOf = (value: string) => kbs.find(kb => kb.versions.some(version => `${kb.name} ${version.id}` === value));
  const currentKb = kbOf(config.knowledge);
  const databaseRecord = config.database ? state.assets.databases.find(item => item.key === config.database) : undefined;
  const databaseLatest = databaseRecord ? latestPublished(databaseRecord) : null;

  /* 记忆、对话 */
  const setMemory = (value: Partial<AgentConfig['memory']>) => patch({ memory: { ...config.memory, ...value } });
  const setDialog_ = (value: Partial<AgentConfig['dialog']>) => patch({ dialog: { ...config.dialog, ...value } });
  const guards = Object.entries(settings.guardrails) as [keyof AgentSettings['guardrails'], boolean][];

  return <div className="build-panel capability-panel">
    <div className="build-panel-head"><div><h3>能力配置</h3><p className="meta">只显示已添加的内容，点各模块右上角 ＋ 从资产中心添加或上传；保存时连同版本号一起锁进快照。</p></div></div>
    {notice && <p className="shared-note cap-notice"><CheckCircle2 size={icon.small} aria-hidden="true" />{notice}</p>}

    <Section title="模型">
      <Module id="model" focused={focused.has('model')} title="模型" open={open.model} onToggle={() => toggle('model')} readOnly={readOnly} hint={`${config.model.split(' · ')[0]}${config.fallbackModel !== NO_FALLBACK ? ` · 备用 ${config.fallbackModel.split(' · ')[0]}` : ''} · 思考 ${config.maxThinking} 次 · 参考 ${config.memory.turns} 轮`}>
        <label className="field-label">主模型<span className="select-field"><select value={config.model} onChange={event => patch({ model: event.target.value, fallbackModel: event.target.value === config.fallbackModel ? NO_FALLBACK : config.fallbackModel })}>{models.map(item => <option key={item.key} value={item.key}>{item.key}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>
          {main?.record ? <span className="meta field-hint">权重 {main.weights} · 上下文 {main.record.versions[0].content.context} · P95 {main.record.versions[0].content.p95} · 输入 ¥{main.record.versions[0].content.priceIn} / 输出 ¥{main.record.versions[0].content.priceOut} 每百万 tokens</span> : <span className="meta field-hint">资产中心已找不到这个模型，建议更换</span>}</label>
        <label className="field-label">备用模型<span className="select-field"><select value={config.fallbackModel} onChange={event => patch({ fallbackModel: event.target.value })}>{[NO_FALLBACK, ...models.filter(item => item.key !== config.model).map(item => item.key)].map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></span>
          {degradeToFallback && config.fallbackModel === NO_FALLBACK
            ? <span className="field-hint warning-text"><AlertTriangle size={icon.small} aria-hidden="true" />设置页的降级策略是「切换备用模型」，但这个版本没有备用模型，降级时只能返回兜底话术。</span>
            : <span className="meta field-hint">主模型超时或出错时切换；何时切换由 <Link to={`/agents/${agent.id}/settings`}>设置 · 降级策略</Link> 决定（当前：{settings.degrade}）。</span>}</label>
        <Slider label="最大思考次数" value={config.maxThinking} min={1} max={5} onChange={value => patch({ maxThinking: value })} hint="规划 → 调用工具 → 观察结果算一次。次数越多越能处理复杂问题，也越慢越贵。" />
        <Slider label="参考对话轮数" value={config.memory.turns} min={0} max={20} disabled={noSession} onChange={value => setMemory({ turns: value })} hint={noSession ?? '回答时带上最近几轮对话；轮数越多追问越连贯，tokens 和延迟也越高。'} />
      </Module>
    </Section>

    <Section title="技能">
      <Module id="tools" focused={focused.has('tools')} title="工具" open={open.tools} onToggle={() => toggle('tools')} readOnly={readOnly} hint={config.tools.length ? `${config.tools.length} 个：${config.tools.join('、')}` : '未添加工具'}
        action={<span data-demo="add-tool"><AddButton label="添加工具" onClick={() => setDialog('tools')} /></span>}>
        {config.tools.length ? <div className="cap-cards">{config.tools.map(value => { const record = recordOf(value); const versions = record ? record.versions.filter(item => item.status === '已发布').map(item => item.id) : []; const pinned = value.slice(toolName(value).length + 1); const latest = versions[0];
          return <div className="cap-card tool-card" key={value}>
            <div className="cap-card-main"><strong>{toolName(value)}</strong><span className="meta">{record ? `${record.team} · ${record.description}` : '资产中心已找不到这个工具'}</span></div>
            <label className="compact-select cap-version"><span className="sr-only">{toolName(value)} 版本</span><select value={pinned} onChange={event => setToolVersion(value, event.target.value)}>{[...new Set([pinned, ...versions])].map(id => <option key={id} value={id}>{id}{id === latest ? ' · 最新' : ''}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></label>
            {!readOnly && <RemoveButton label={`移除 ${toolName(value)}`} onClick={() => patch({ tools: config.tools.filter(item => item !== value) })} />}
          </div>; })}</div>
          : <p className="cap-empty">还没有添加工具。点右上角 ＋ 从资产中心搜索，或上传新工具。</p>}
        <p className="meta">同一个工具只能挂一个版本，要换版本在这里切换；模型根据工具的调用说明决定何时调用。</p>
      </Module>
      <Module id="steps" focused={focused.has('steps')} title="执行步骤" open={open.steps} onToggle={() => toggle('steps')} readOnly={readOnly} hint={`${config.steps.length} 步`}
        action={<AddButton label="添加步骤" onClick={() => { patch({ steps: [...config.steps, { id: `step-${Date.now()}`, name: '新步骤', type: '模型调用', description: '填写这一步的处理说明' }] }); expand('steps'); }} />}>
        <WorkflowStepList steps={config.steps} readOnly={readOnly} hideAdd onChange={steps => patch({ steps })} />
      </Module>
    </Section>

    <Section title="知识">
      <Module id="knowledge" focused={focused.has('knowledge')} title="知识库" open={open.knowledge} onToggle={() => toggle('knowledge')} readOnly={readOnly} hint={config.knowledge === NO_KNOWLEDGE ? '未添加知识库' : config.knowledge}
        action={<span data-demo="add-knowledge"><AddButton label="添加知识库" onClick={() => setDialog('knowledge')} /></span>}>
        {config.knowledge !== NO_KNOWLEDGE ? <>
          <div className="cap-card">
            <div className="cap-card-main"><strong>{currentKb?.name ?? config.knowledge}</strong><span className="meta">{currentKb ? `${currentKb.owner} · ${currentKb.description}` : '资产中心已找不到这个知识库'}</span></div>
            {currentKb && <label className="compact-select cap-version"><span className="sr-only">知识库版本</span><select value={config.knowledge} onChange={event => patch({ knowledge: event.target.value })}>{currentKb.versions.map((version, index) => <option key={version.id} value={`${currentKb.name} ${version.id}`}>{version.id}{index === 0 ? ' · 最新' : ''}</option>)}</select><ChevronDown size={icon.small} aria-hidden="true" /></label>}
            {!readOnly && <RemoveButton label="移除知识库" onClick={() => patch({ knowledge: NO_KNOWLEDGE })} />}
          </div>
          <div className="cap-inline">
            <label className="field-label">召回条数<input type="number" min={1} max={20} value={config.retrieval.topK} onChange={event => patch({ retrieval: { ...config.retrieval, topK: Math.min(20, Math.max(1, Number(event.target.value) || 1)) } })} /></label>
            <label className="field-label">相似度阈值<input type="number" min={0} max={1} step={0.05} value={config.retrieval.threshold} onChange={event => patch({ retrieval: { ...config.retrieval, threshold: Math.min(1, Math.max(0, Number(event.target.value) || 0)) } })} /></label>
          </div>
          <p className="meta">选的是知识库的具体版本；知识运营发布新版本后不会自动切换，页面上方会提示升级。一个版本只挂 1 个知识库。</p>
        </> : <p className="cap-empty">未添加知识库。上传文本、FAQ 或表格型知识后，回答时可以引用知识并给出出处。</p>}
      </Module>
      <Module id="database" focused={focused.has('database')} title="数据库" open={open.database} onToggle={() => toggle('database')} readOnly={readOnly} hint={config.database ?? '未添加数据库'}
        action={<span data-demo="add-database"><AddButton label="添加数据库" onClick={() => setDialog('database')} /></span>}>
        {config.database ? <div className="cap-card">
          <div className="cap-card-main"><strong>{config.database}</strong><span className="meta">{databaseLatest ? `表结构 ${databaseLatest.id} · ${databaseLatest.content.tables.map(table => table.name).join('、')} · ${databaseLatest.content.access}` : '资产中心已找不到这个数据库'}</span></div>
          {!readOnly && <RemoveButton label="移除数据库" onClick={() => patch({ database: null })} />}
        </div> : <p className="cap-empty">未添加数据库。上传表格或连接业务库的只读视图后，用户问数值类问题时可以查询、计算并回答。最多 1 个。</p>}
      </Module>
    </Section>

    <Section title="记忆" disabled={noSession}>
      <Module id="variables" title="记忆变量" open={open.variables} onToggle={() => toggle('variables')} readOnly={readOnly || batch} hint={config.memory.variables.length ? config.memory.variables.map(item => item.name).join('、') : '未添加'}
        action={!batch && <AddButton label="添加记忆变量" onClick={() => { setMemory({ variables: [...config.memory.variables, { name: '', desc: '', defaultValue: '' }] }); expand('variables'); }} />}>
        {config.memory.variables.length ? <div className="cap-rows">{config.memory.variables.map((item, index) => <div className="cap-row cap-row-3" key={index}>
          <input aria-label="变量名" value={item.name} placeholder="变量名，例如 常穿尺码" onChange={event => setMemory({ variables: config.memory.variables.map((v, i) => i === index ? { ...v, name: event.target.value } : v) })} />
          <input aria-label="变量说明" value={item.desc} placeholder="说明" onChange={event => setMemory({ variables: config.memory.variables.map((v, i) => i === index ? { ...v, desc: event.target.value } : v) })} />
          <input aria-label="默认值" value={item.defaultValue} placeholder="默认值" onChange={event => setMemory({ variables: config.memory.variables.map((v, i) => i === index ? { ...v, defaultValue: event.target.value } : v) })} />
          {!readOnly && <RemoveButton label="删除记忆变量" onClick={() => setMemory({ variables: config.memory.variables.filter((_, i) => i !== index) })} />}
        </div>)}</div> : <p className="cap-empty">记录对话中一维、单个的用户或应用信息，例如常穿尺码、所在城市，让回答更个性化。</p>}
      </Module>
      <Module id="tables" title="记忆表" open={open.tables} onToggle={() => toggle('tables')} readOnly={readOnly || batch} hint={config.memory.tables.length ? config.memory.tables.map(item => item.name).join('、') : '未添加'}
        action={!batch && <AddButton label="添加记忆表" onClick={() => { setMemory({ tables: [...config.memory.tables, { name: '', fields: '' }] }); expand('tables'); }} />}>
        {config.memory.tables.length ? <div className="cap-rows">{config.memory.tables.map((item, index) => <div className="cap-row cap-row-2" key={index}>
          <input aria-label="表名" value={item.name} placeholder="表名，例如 历史售后单" onChange={event => setMemory({ tables: config.memory.tables.map((t, i) => i === index ? { ...t, name: event.target.value } : t) })} />
          <input aria-label="字段" value={item.fields} placeholder="字段，用顿号分隔" onChange={event => setMemory({ tables: config.memory.tables.map((t, i) => i === index ? { ...t, fields: event.target.value } : t) })} />
          {!readOnly && <RemoveButton label="删除记忆表" onClick={() => setMemory({ tables: config.memory.tables.filter((_, i) => i !== index) })} />}
        </div>)}</div> : <p className="cap-empty">记录对话中多维、大量的信息，例如历史售后单，支持按字段问数。</p>}
      </Module>
      <Module id="fragments" title="记忆片段" open={open.fragments} onToggle={() => toggle('fragments')} readOnly={readOnly || batch} hint={config.memory.fragments ? '已开启：自动记录用户信息、偏好、计划' : '未开启'}
        action={<Switch hideLabel label="记忆片段" checked={config.memory.fragments} disabled={batch} onChange={value => setMemory({ fragments: value })} />}>
        <p className="meta">开启后自动总结对话中关于用户信息、偏好、计划的片段，跨会话生效；片段脱敏存储，用户可在隐私设置里清除。</p>
      </Module>
    </Section>

    <Section title="对话" disabled={noSession}>
      <Module id="opening" title="开场白" open={open.opening} onToggle={() => toggle('opening')} readOnly={readOnly || batch} hint={config.dialog.opening || '未设置'}>
        <textarea aria-label="开场白" rows={3} value={config.dialog.opening} placeholder="用户进入对话时看到的第一句话" onChange={event => setDialog_({ opening: event.target.value })} />
      </Module>
      <Module id="suggestions" title="推荐问" open={open.suggestions} onToggle={() => toggle('suggestions')} readOnly={readOnly || batch} hint={config.dialog.suggestions.length ? `${config.dialog.suggestions.length} 条` : '未设置'}
        action={!batch && <AddButton label="添加推荐问" disabled={config.dialog.suggestions.length >= 5 ? '最多 5 条推荐问' : undefined} onClick={() => { setDialog_({ suggestions: [...config.dialog.suggestions, ''] }); expand('suggestions'); }} />}>
        {config.dialog.suggestions.length ? <div className="cap-rows">{config.dialog.suggestions.map((item, index) => <div className="cap-row cap-row-1" key={index}>
          <input aria-label={`推荐问 ${index + 1}`} value={item} placeholder="例如 帮我查一下物流" onChange={event => setDialog_({ suggestions: config.dialog.suggestions.map((s, i) => i === index ? event.target.value : s) })} />
          {!readOnly && <RemoveButton label={`删除推荐问 ${index + 1}`} onClick={() => setDialog_({ suggestions: config.dialog.suggestions.filter((_, i) => i !== index) })} />}
        </div>)}</div> : <p className="cap-empty">显示在对话框下方，引导用户提出 Agent 擅长的问题，最多 5 条。</p>}
      </Module>
      <Module id="followUp" title="追问" open={open.followUp} onToggle={() => toggle('followUp')} readOnly={readOnly || batch} hint={config.dialog.followUp === '关闭' ? '关闭：回答后不给追问建议' : '自动生成：每轮回答后给 2–3 个追问建议'}
        action={<label className="compact-select cap-followup"><span className="sr-only">追问</span><select value={config.dialog.followUp} disabled={batch} onChange={event => setDialog_({ followUp: event.target.value as FollowUpMode })}><option>关闭</option><option>自动生成</option></select><ChevronDown size={icon.small} aria-hidden="true" /></label>}>
        <p className="meta">自动生成：每轮回答后，按当前对话给出 2–3 个用户可能想问的问题。</p>
      </Module>
    </Section>

    <Section title="输出与安全">
      <Module id="output" focused={focused.has('output')} title="输出格式与护栏" open={open.output} onToggle={() => toggle('output')} readOnly={readOnly} hint={config.outputFormat}>
        <label className="field-label">输出格式<input value={config.outputFormat} readOnly={readOnly} onChange={event => patch({ outputFormat: event.target.value })} /></label>
        <div className="guard-summary"><span className="meta">护栏（Agent 级，对所有版本生效）</span>
          <div className="guard-chips">{guards.map(([key, on]) => <span key={key} className={`guard-chip ${on ? 'on' : ''}`}>{on && <ShieldCheck size={icon.small} aria-hidden="true" />}{guardLabels[key]}{on ? '' : ' · 未开启'}</span>)}</div>
          <span className="meta">在 <Link to={`/agents/${agent.id}/settings`}>设置 · 护栏</Link> 中修改；不随版本切换，回退时依然生效。</span></div>
      </Module>
    </Section>

    {dialog === 'tools' && <AddDialog title="添加工具" noun="工具" createLabel="上传工具" libraryPath="/assets/tools" onClose={() => setDialog(null)} onAdd={addTool}
      onCreate={() => { setDialog(null); setForm('tool'); }}
      items={visibleRecords(toolRecords, agent.team).map(record => { const latest = latestPublished(record)!; return { key: record.name, title: record.name, sub: `${record.team} · ${record.description}`, meta: `最新 ${latest.id}${record.visibility !== '全公司' ? ` · ${record.visibility}` : ''}`, added: config.tools.some(item => toolName(item) === record.name) }; })} />}
    {dialog === 'knowledge' && <AddDialog title="添加知识库" limit="仅支持添加 1 个知识库" noun="知识库" createLabel="上传文档" libraryPath="/assets/knowledge" onClose={() => setDialog(null)}
      onAdd={key => { const kb = kbs.find(item => item.id === key); if (kb) patch({ knowledge: `${kb.name} ${kb.versions[0].id}` }); expand('knowledge'); setDialog(null); }}
      onCreate={() => { setDialog(null); setForm('knowledge'); }}
      items={kbs.map(kb => ({ key: kb.id, title: kb.name, sub: `${kb.owner} · ${kb.description}`, meta: `最新 ${kb.versions[0].id}${currentKb && currentKb.id !== kb.id ? ' · 选用后替换当前知识库' : ''}`, added: currentKb?.id === kb.id }))} />}
    {dialog === 'database' && <AddDialog title="添加数据" limit="仅支持添加 1 个数据库" noun="数据库" createLabel="创建数据库" libraryPath="/assets/databases" onClose={() => setDialog(null)}
      onAdd={key => { patch({ database: key }); expand('database'); setDialog(null); }}
      onCreate={() => { setDialog(null); setForm('database'); }}
      items={visibleRecords(state.assets.databases, agent.team).map(record => { const latest = latestPublished(record)!; return { key: record.key, title: record.name, sub: `${record.team} · ${record.description}`, meta: `${latest.content.source} · ${latest.content.tables.length} 张表${config.database && config.database !== record.key ? ' · 选用后替换当前数据库' : ''}`, added: config.database === record.key }; })} />}

    {form === 'tool' && <ToolForm defaults={{ ...defaults, visibility: '本团队' }} onClose={() => setForm(null)}
      onSaved={(key, status) => { setForm(null); if (status === '已发布') { patch({ tools: [...config.tools.filter(item => toolName(item) !== key), `${key} v1`] }); setNotice(`已上传工具「${key}」v1 并入库到资产中心，已添加到草稿。`); } else setNotice(`工具「${key}」对全公司开放，已提交平台审核；审核通过后可在这里添加。`); expand('tools'); }} />}
    {form === 'knowledge' && <KnowledgeCreate defaults={defaults} onClose={() => setForm(null)} onCreated={(_, label) => { setForm(null); patch({ knowledge: label }); setNotice(`已上传知识库「${label}」并入库到资产中心，已添加到草稿。`); expand('knowledge'); }} />}
    {form === 'database' && <DatabaseForm defaults={defaults} onClose={() => setForm(null)} onSaved={key => { setForm(null); patch({ database: key }); setNotice(`已创建数据库「${key}」v1 并入库到资产中心，已添加到草稿。`); expand('database'); }} />}
  </div>;
}

function Slider({ label, value, min, max, onChange, hint, disabled }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void; hint: string; disabled?: string }) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)));
  return <div className="field-label cap-slider"><span>{label}</span>
    <div className="cap-slider-row"><input type="range" aria-label={label} min={min} max={max} value={value} disabled={Boolean(disabled)} onChange={event => onChange(clamp(Number(event.target.value)))} />
      <input type="number" aria-label={`${label}数值`} min={min} max={max} value={value} disabled={Boolean(disabled)} onChange={event => onChange(clamp(Number(event.target.value) || min))} /></div>
    <span className="meta field-hint">{hint}</span></div>;
}
