import { Blocks, FileText, ListChecks, MessagesSquare, Sparkles } from 'lucide-react';
import { icon } from '../../shared/styles/tokens';

export const scenarios = [
  { id: 'blank', title: '空白', description: '从最小配置开始', icon: FileText },
  { id: 'recommendation', title: '推荐生成', description: '基于偏好生成推荐', icon: Sparkles },
  { id: 'classification', title: '分类判定', description: '输出类别和置信度', icon: ListChecks },
  { id: 'conversation', title: '多轮问答', description: '知识检索与连续对话', icon: MessagesSquare },
];

export function ScenarioTemplatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="scenario-grid" role="radiogroup" aria-label="场景模板">{scenarios.map(({ id, title, description, icon: Icon }) => <button key={id} type="button" className={`scenario-card ${value === id ? 'selected' : ''}`} role="radio" aria-checked={value === id} onClick={() => onChange(id)}><Icon size={icon.large} /><strong>{title}</strong><span>{description}</span></button>)}<div className="scenario-card phase2-block" title="二期建设"><Blocks size={icon.large} /><strong>更多模板</strong><span>二期建设</span></div></div>;
}
