/** 工作台底部的演示剧本入口：一行三张紧凑卡片。 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Play, RotateCcw } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { pagePath, playbooks, type Playbook } from './playbooks';
import { Button, ConfirmAction } from '../../shared/components/Buttons';
import { SectionHeading } from '../../shared/components/Content';
import { useStartPlaybook } from './useStartPlaybook';
import { icon } from '../../shared/styles/tokens';

export function PlaybookCards() {
  const { state, setPlaybookStep, setPlaybookCollapsed } = useDemo();
  const start = useStartPlaybook();
  const navigate = useNavigate();
  const resume = (playbook: Playbook, step: number) => { setPlaybookStep(step); setPlaybookCollapsed(false); const target = playbook.steps[Math.min(step, playbook.steps.length - 1)]; navigate(pagePath(playbook, target.page)); };
  return <section className="playbook-section" aria-label="演示剧本">
    <SectionHeading eyebrow="演示剧本" title="按业务场景体验一遍" description="三个团队的真实需求，都从新建候选版本开始，走完同一条流程：构建 → 调试 → 评测 → 发布 → 上线后。开始后右下角会提示下一步点哪里。" />
    <div className="playbook-grid">{playbooks.map(playbook => {
      const active = state.playbook?.id === playbook.id ? state.playbook : null;
      return <div key={playbook.id} className={`playbook-card ${active ? 'active' : ''}`}>
        <div className="playbook-card-head"><span className="playbook-letter">{playbook.letter}</span><div><strong>{playbook.title}</strong><span className="meta">剧本 {playbook.letter} · {playbook.steps.length} 步{active ? ` · 进行到第 ${Math.min(active.step + 1, playbook.steps.length)} 步` : ''}</span></div></div>
        <p>{playbook.summary}</p>
        <div className="playbook-card-foot">{active && active.step < playbook.steps.length && <Button onClick={() => resume(playbook, active.step)}><ChevronRight size={icon.small} />继续剧本 {playbook.letter}</Button>}
          <ConfirmAction icon={active ? <RotateCcw size={icon.small} /> : <Play size={icon.small} />} actionLabel={active ? '重新开始' : `开始剧本 ${playbook.letter}`} confirmLabel={`确认${active ? '重新开始' : '开始'}剧本 ${playbook.letter}`}
            impact={`「${playbook.title}」的演示数据会换成剧本 ${playbook.letter} 的初始数据，这个 Agent 当前的演示进度会被覆盖；其它 Agent 不受影响。`} onConfirm={() => start(playbook.id)} /></div>
      </div>;
    })}</div>
  </section>;
}
