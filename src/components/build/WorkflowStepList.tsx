import { ChevronDown, GripVertical, Plus } from 'lucide-react';
import type { WorkflowStep, WorkflowStepType } from '../../types/domain';
import { Button } from '../actions/Buttons';
import { ScopeBadge } from '../badges/Badges';

const stepTypes: WorkflowStepType[] = ['模型调用', '检索', '工具调用', '代码节点'];

export function WorkflowStepList({ steps, onChange }: { steps: WorkflowStep[]; onChange: (steps: WorkflowStep[]) => void }) {
  const update = (index: number, patch: Partial<WorkflowStep>) => onChange(steps.map((step, itemIndex) => itemIndex === index ? { ...step, ...patch } : step));
  const add = () => onChange([...steps, { id: `step-${Date.now()}`, name: '新步骤', type: '模型调用', description: '填写这一步的处理说明' }]);
  return <div className="workflow-list">{steps.map((step, index) => <div className="workflow-row" key={step.id}><GripVertical size={16} strokeWidth={1.5} aria-hidden="true" /><span className="workflow-index">{index + 1}</span><input aria-label={`步骤 ${index + 1} 名称`} value={step.name} onChange={event => update(index, { name: event.target.value })} /><label className="compact-select"><select aria-label={`步骤 ${index + 1} 类型`} value={step.type} onChange={event => update(index, { type: event.target.value as WorkflowStepType })}>{stepTypes.map(type => <option key={type}>{type}</option>)}</select><ChevronDown size={16} /></label><input aria-label={`步骤 ${index + 1} 说明`} value={step.description} onChange={event => update(index, { description: event.target.value })} /></div>)}<Button onClick={add}><Plus size={16} />添加步骤</Button><div className="canvas-entry phase2-block" title="二期建设"><ScopeBadge phase="二期" /><strong>画布编排</strong><span>在可视化画布中连接节点</span></div></div>;
}
