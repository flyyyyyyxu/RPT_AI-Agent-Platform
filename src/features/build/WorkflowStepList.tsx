import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { WorkflowStep, WorkflowStepType } from '../../types/domain';
import { Button } from '../../shared/components/Buttons';
import { ScopeBadge } from '../../shared/components/Badges';

const stepTypes: WorkflowStepType[] = ['模型调用', '检索', '工具调用', '代码节点'];

export function WorkflowStepList({ steps, onChange, readOnly = false }: { steps: WorkflowStep[]; onChange: (steps: WorkflowStep[]) => void; readOnly?: boolean }) {
  const update = (index: number, patch: Partial<WorkflowStep>) => onChange(steps.map((step, itemIndex) => itemIndex === index ? { ...step, ...patch } : step));
  const move = (index: number, offset: number) => { const next = [...steps]; const [item] = next.splice(index, 1); next.splice(index + offset, 0, item); onChange(next); };
  const remove = (index: number) => onChange(steps.filter((_, itemIndex) => itemIndex !== index));
  const add = () => onChange([...steps, { id: `step-${Date.now()}`, name: '新步骤', type: '模型调用', description: '填写这一步的处理说明' }]);
  return <div className="workflow-list">{steps.map((step, index) => <div className="workflow-row" key={step.id}>
    <span className="workflow-index">{index + 1}</span>
    <input className="workflow-name" aria-label={`步骤 ${index + 1} 名称`} value={step.name} readOnly={readOnly} onChange={event => update(index, { name: event.target.value })} />
    <label className="compact-select workflow-type"><select aria-label={`步骤 ${index + 1} 类型`} value={step.type} disabled={readOnly} onChange={event => update(index, { type: event.target.value as WorkflowStepType })}>{stepTypes.map(type => <option key={type}>{type}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
    {!readOnly && <span className="workflow-actions">
      <button type="button" className="icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`上移步骤 ${index + 1}`} title="上移"><ArrowUp size={16} /></button>
      <button type="button" className="icon-button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={`下移步骤 ${index + 1}`} title="下移"><ArrowDown size={16} /></button>
      <button type="button" className="icon-button" onClick={() => remove(index)} disabled={steps.length === 1} aria-label={`删除步骤 ${index + 1}`} title={steps.length === 1 ? '至少保留一个步骤' : '删除'}><Trash2 size={16} /></button>
    </span>}
    <input className="workflow-description" aria-label={`步骤 ${index + 1} 说明`} value={step.description} readOnly={readOnly} onChange={event => update(index, { description: event.target.value })} />
  </div>)}
    {!readOnly && <Button onClick={add}><Plus size={16} />添加步骤</Button>}
    <div className="canvas-entry phase2-block" title="二期建设" aria-disabled="true"><ScopeBadge phase="二期" /><strong>画布编排</strong><span>在可视化画布中连接节点</span></div>
  </div>;
}
