/**
 * 构建页左栏：角色指令（Prompt）。
 * 「优化」按平台检查项生成建议稿，逐行 diff 后由用户决定是否采纳；
 * 「套用模板」从资产中心的 Prompt 模板复制正文进草稿（复制，不做实时引用）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, FileText, Sparkles } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { promptChoices } from '../../core/data-access/assets';
import { diffLines } from '../../core/rules/diff';
import { optimizePrompt, promptChecks } from '../../core/rules/promptOptimize';
import type { AgentConfig } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { Drawer } from '../../shared/components/Drawer';
import { icon } from '../../shared/styles/tokens';

export function PromptPanel({ config, readOnly, onChange }: { config: AgentConfig; readOnly: boolean; onChange: (prompt: string) => void }) {
  const { state } = useDemo();
  const [suggestion, setSuggestion] = useState<ReturnType<typeof optimizePrompt> | null>(null);
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const variables = config.prompt.match(/{{[^}]+}}/g);
  const checks = promptChecks(config);
  const passed = checks.filter(check => check.passed).length;

  const optimize = () => { setNotice(null); setSuggestion(optimizePrompt(config)); };
  const adopt = () => { if (!suggestion) return; onChange(suggestion.suggestion); setNotice(`已采纳 ${suggestion.applied.length} 条优化建议，草稿已自动保存；建议重新调试确认效果。`); setSuggestion(null); };

  return <div className="build-panel prompt-panel">
    <div className="build-panel-head">
      <div><h3>角色指令</h3></div>
      {!readOnly && <div className="build-panel-actions">
        <Button onClick={optimize} disabled={Boolean(suggestion)}><Sparkles size={icon.small} />优化</Button>
        <Button onClick={() => setPicking(true)}><FileText size={icon.small} />套用模板</Button>
      </div>}
    </div>
    <p className="meta prompt-hint">写清角色、任务和要求；用 {'{{变量}}'} 声明输入，例如 {'{{question}}'}。</p>
    <fieldset disabled={readOnly} className="config-fieldset">
      <textarea className="prompt-editor" aria-label="角色指令" rows={16} value={config.prompt} readOnly={readOnly} onChange={event => { setNotice(null); onChange(event.target.value); }} />
    </fieldset>
    <div className="variable-row"><span className="meta">已识别变量</span>{variables ? [...new Set(variables)].map(item => <code key={item}>{item}</code>) : <span className="meta">暂无变量</span>}</div>

    {notice && <p className="shared-note"><CheckCircle2 size={icon.small} aria-hidden="true" />{notice}</p>}
    {suggestion && <OptimizeResult before={config.prompt} result={suggestion} onAdopt={adopt} onDismiss={() => setSuggestion(null)} />}

    <details className="prompt-checks">
      <summary>Prompt 检查项 · {passed} / {checks.length} 已覆盖</summary>
      <ul>{checks.map(check => <li key={check.id} className={check.passed ? 'passed' : ''}>{check.passed ? <CheckCircle2 size={icon.small} aria-hidden="true" /> : <CircleDashed size={icon.small} aria-hidden="true" />}{check.label}</li>)}</ul>
    </details>

    {picking && <TemplatePicker prompts={promptChoices(state)} onClose={() => setPicking(false)}
      onApply={(name, version, body) => { onChange(body); setPicking(false); setSuggestion(null); setNotice(`已套用模板「${name}」${version}。模板正文已复制进草稿，之后模板更新不会影响这个版本；请替换「套用时填写」的变量。`); }} />}
  </div>;
}

function OptimizeResult({ before, result, onAdopt, onDismiss }: { before: string; result: ReturnType<typeof optimizePrompt>; onAdopt: () => void; onDismiss: () => void }) {
  const lines = useMemo(() => diffLines(before, result.suggestion), [before, result.suggestion]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, []);
  if (!result.applied.length) return <div className="optimize-box" ref={ref}><strong>当前 Prompt 已覆盖全部检查项</strong><p className="meta">没有需要补充的内容。</p><div className="inline-actions"><Button onClick={onDismiss}>知道了</Button></div></div>;
  return <div className="optimize-box" data-demo="prompt-optimize" ref={ref}>
    <strong>优化建议 · 补充 {result.applied.length} 项</strong>
    <p className="meta">{result.applied.map(check => check.label).join('、')}。采纳后写入草稿，可以继续修改。</p>
    <pre className="diff-lines">{lines.map((line, index) => <div key={index} className={`diff-line ${line.type}`}><span className="diff-sign">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}</span><span>{line.text || ' '}</span></div>)}</pre>
    <div className="inline-actions"><Button onClick={onDismiss}>放弃</Button><Button variant="primary" onClick={onAdopt}>采纳建议</Button></div>
  </div>;
}

function TemplatePicker({ prompts, onClose, onApply }: { prompts: ReturnType<typeof promptChoices>; onClose: () => void; onApply: (name: string, version: string, body: string) => void }) {
  const [key, setKey] = useState(prompts[0]?.record.key ?? '');
  const [confirming, setConfirming] = useState(false);
  const current = prompts.find(item => item.record.key === key) ?? prompts[0];
  const fill = current?.version.content.variables.filter(variable => variable.source === '套用时填写') ?? [];
  return <Drawer label="套用 Prompt 模板" eyebrow="资产中心 · Prompt 模板" title="套用模板" meta="模板正文复制进当前草稿，不做实时引用；模板之后发布新版本不会改变已保存的 Agent 版本。" onClose={onClose} demo="prompt-template"
    footer={current && (confirming
      ? <div className="template-confirm"><span>当前 Prompt 将被模板正文替换，替换后仍可在草稿中修改。</span><Button onClick={() => setConfirming(false)}>取消</Button><Button variant="primary" onClick={() => onApply(current.record.name, current.version.id, current.version.content.body)}>确认替换</Button></div>
      : <><Button onClick={onClose}>关闭</Button><Button variant="primary" onClick={() => setConfirming(true)}>替换当前 Prompt</Button></>)}>
    <div className="template-list" role="listbox" aria-label="Prompt 模板">{prompts.map(item => <button type="button" role="option" aria-selected={item.record.key === key} key={item.record.key} className={item.record.key === key ? 'selected' : ''} onClick={() => { setKey(item.record.key); setConfirming(false); }}>
      <strong>{item.record.name}</strong><span className="meta">{item.version.content.kind} · {item.version.id}</span></button>)}</div>
    {current && <div className="template-preview">
      <p className="meta">{current.version.content.scene} · 结构：{current.version.content.structure}</p>
      <pre>{current.version.content.body}</pre>
      {fill.length > 0 && <p className="meta">套用后需要填写：{fill.map(variable => `{{${variable.name}}}（${variable.desc}）`).join('、')}</p>}
    </div>}
  </Drawer>;
}
