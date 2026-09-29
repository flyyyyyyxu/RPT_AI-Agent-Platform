import { ArrowLeft, Check, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../core/store/DemoProvider';
import { Button } from '../../shared/components/Buttons';
import { ScenarioTemplatePicker, scenarios } from './ScenarioTemplatePicker';
import { Card, SectionHeading } from '../../shared/components/Content';
import { Feedback } from '../../shared/components/Feedback';
import { applyTemplate, generateFromDescription, generationStages, templateMode, templateProfile } from '../../data';
import type { AgentConfig, ProfileId } from '../../types/domain';
import './create.css';
import { icon } from '../../shared/styles/tokens';

type Draft = { config: AgentConfig; profile: ProfileId; mode: string; matched: string };

export function CreateAgentPage() {
  const { state, createAgent } = useDemo();
  const navigate = useNavigate();
  const [method, setMethod] = useState<'natural' | 'template'>('natural');
  const [name, setName] = useState('员工福利问答');
  const [description, setDescription] = useState('帮助员工查询福利、休假和报销制度，回答时引用具体条款');
  const [template, setTemplate] = useState('conversation');
  const [stage, setStage] = useState(-1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const team = state.team === '全部团队' ? '企业服务' : state.team;
  const generating = stage >= 0 && stage < generationStages.length;
  const missing = !name.trim() ? '请填写 Agent 名称' : method === 'natural' && !description.trim() ? '请描述需求' : undefined;

  const generate = () => {
    setDraft(null); setStage(0);
    generationStages.forEach((_, index) => timers.current.push(window.setTimeout(() => setStage(index + 1), 300 * (index + 1))));
    timers.current.push(window.setTimeout(() => setDraft(generateFromDescription(name.trim(), description.trim())), 300 * generationStages.length));
  };
  const finish = (input: Draft) => {
    const agent = createAgent({ name: name.trim(), mode: input.mode, profile: input.profile, config: input.config, team });
    navigate(`/agents/${agent.id}/build`);
  };
  const useTemplate = () => {
    setCreating(true);
    timers.current.push(window.setTimeout(() => finish({ config: applyTemplate(template, name.trim()), profile: templateProfile[template], mode: templateMode[template], matched: template }), 650));
  };
  const switchMethod = (next: 'natural' | 'template') => { setMethod(next); setDraft(null); setStage(-1); };

  return <div className="create-agent-page"><Link className="back-link" to="/"><ArrowLeft size={icon.small} />返回 Agent 目录</Link><div className="page-heading"><span className="eyebrow">新建 Agent</span><h1>创建初始配置</h1><p>描述需求或选择模板，平台生成一份初始配置，保存为草稿 v1，之后可在构建页继续修改。</p></div>
    <div className="create-method-tabs" role="tablist"><button className={method === 'natural' ? 'active' : ''} onClick={() => switchMethod('natural')} role="tab" aria-selected={method === 'natural'}>自然语言生成</button><button className={method === 'template' ? 'active' : ''} onClick={() => switchMethod('template')} role="tab" aria-selected={method === 'template'}>选择场景模板</button></div>
    <Card><div className="form-grid"><label className="field-label">Agent 名称<input value={name} onChange={event => { setName(event.target.value); setDraft(null); }} /></label><label className="field-label">所属团队<input value={team} readOnly aria-readonly="true" /></label>
      <label className="field-label field-span">{method === 'natural' ? '需求描述' : '需求描述（可选）'}<textarea rows={4} value={description} onChange={event => { setDescription(event.target.value); setDraft(null); }} placeholder="例如：帮助员工查询公司制度，回答时引用有效条款。" /></label></div>
      {method === 'template' && <><SectionHeading eyebrow="场景模板" title="选择起点" description="模板只填充基础配置，创建后仍可修改。" /><ScenarioTemplatePicker value={template} onChange={setTemplate} /></>}

      {method === 'natural' && (generating || draft) && <div className="generation-panel" aria-live="polite">
        <ol className="generation-stages">{generationStages.map((label, index) => <li key={label} className={stage > index ? 'done' : stage === index ? 'active' : ''}>{stage > index ? <Check size={icon.small} /> : stage === index ? <LoaderCircle size={icon.small} className="spin" /> : <span className="stage-dot" />}{label}</li>)}</ol>
        {draft && <div className="generated-config"><div className="generated-heading"><strong>已生成初始配置</strong><span className="meta">匹配场景：{draft.matched} · 演示数据</span></div>
          <dl><div><dt>Prompt</dt><dd><pre>{draft.config.prompt}</pre></dd></div><div><dt>模型</dt><dd>{draft.config.model}</dd></div><div><dt>知识库</dt><dd>{draft.config.knowledge}</dd></div><div><dt>工具</dt><dd>{draft.config.tools.join('、') || '暂不接入'}</dd></div><div><dt>输出格式</dt><dd>{draft.config.outputFormat}</dd></div><div><dt>执行步骤</dt><dd>{draft.config.steps.map((step, index) => `${index + 1}. ${step.name}（${step.type}）`).join('  ')}</dd></div></dl></div>}
      </div>}

      {creating ? <Feedback kind="loading" title="正在应用场景模板" description={`正在准备「${scenarios.find(item => item.id === template)?.title}」的 Prompt、模型和步骤…`} />
        : <div className="form-actions">
          {method === 'natural' && draft && <Button onClick={generate}><RotateCcw size={icon.small} />重新生成</Button>}
          {method === 'natural' && !draft && <Button variant="primary" onClick={generate} disabled={Boolean(missing) || generating} reason={missing}><Sparkles size={icon.small} />{generating ? '正在生成' : '生成初始配置'}</Button>}
          {method === 'natural' && draft && <Button variant="primary" onClick={() => finish(draft)} disabled={Boolean(missing)} reason={missing}>创建草稿 v1 并进入构建</Button>}
          {method === 'template' && <Button variant="primary" onClick={useTemplate} disabled={Boolean(missing)} reason={missing}><Sparkles size={icon.small} />使用此模板创建</Button>}
        </div>}
    </Card>
  </div>;
}
