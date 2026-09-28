import { ArrowLeft, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../app/DemoProvider';
import { Button } from '../components/actions/Buttons';
import { ScenarioTemplatePicker } from '../components/agents/ScenarioTemplatePicker';
import { Card, SectionHeading } from '../components/content/Content';
import { Feedback } from '../components/feedback/Feedback';
import { templateConfigs } from '../data/mock';

export function CreateAgentPage() {
  const { createAgent } = useDemo();
  const navigate = useNavigate();
  const [method, setMethod] = useState<'natural' | 'template'>('natural');
  const [name, setName] = useState('员工福利问答');
  const [description, setDescription] = useState('帮助员工查询福利、休假和报销制度，回答时引用具体条款');
  const [template, setTemplate] = useState('conversation');
  const [generating, setGenerating] = useState(false);
  const submit = async () => {
    setGenerating(true);
    await new Promise(resolve => window.setTimeout(resolve, method === 'natural' ? 1100 : 650));
    const agent = createAgent({ name: name.trim() || '未命名 Agent', description, template, config: structuredClone(templateConfigs[method === 'natural' ? 'conversation' : template]) });
    navigate(`/agents/${agent.id}/build?version=v1`);
  };
  return <div className="create-agent-page"><Link className="back-link" to="/"><ArrowLeft size={16} />返回 Agent 目录</Link><div className="page-heading"><span className="eyebrow">新建 Agent</span><h1>创建初始配置</h1><p>描述需求或选择模板，平台将生成一份可继续编辑的配置。</p></div>
    <div className="create-method-tabs" role="tablist"><button className={method === 'natural' ? 'active' : ''} onClick={() => setMethod('natural')} role="tab" aria-selected={method === 'natural'}>自然语言生成</button><button className={method === 'template' ? 'active' : ''} onClick={() => setMethod('template')} role="tab" aria-selected={method === 'template'}>选择场景模板</button></div>
    <Card><div className="form-grid"><label className="field-label">Agent 名称<input value={name} onChange={event => setName(event.target.value)} /></label><label className="field-label field-span">需求描述<textarea rows={5} value={description} onChange={event => setDescription(event.target.value)} placeholder="例如：帮助员工查询公司制度，回答时引用有效条款。" /></label></div>
      {method === 'template' && <><SectionHeading eyebrow="场景模板" title="选择起点" description="模板只填充基础配置，创建后仍可修改。" /><ScenarioTemplatePicker value={template} onChange={setTemplate} /></>}
      {generating ? <Feedback kind="loading" title={method === 'natural' ? '正在理解需求并生成配置' : '正在应用场景模板'} description="正在准备 Prompt、模型、知识库和步骤列表…" /> : <div className="form-actions"><Button variant="primary" onClick={submit} disabled={!name.trim() || !description.trim()} reason={!name.trim() || !description.trim() ? '请填写名称和需求描述' : undefined}><Sparkles size={16} />{method === 'natural' ? '生成初始配置' : '使用此模板创建'}</Button></div>}
    </Card>
  </div>;
}
