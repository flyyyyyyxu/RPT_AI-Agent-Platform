/** 工作台上的演示剧本入口卡片。 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Play, RotateCcw } from 'lucide-react';
import { useDemo } from '../../core/store/DemoProvider';
import { pagePath, playbooks, type Playbook } from './playbooks';
import { Button, ConfirmAction } from '../../shared/components/Buttons';
import { DemoTag } from '../../shared/components/Badges';
import { Card, SectionHeading } from '../../shared/components/Content';
import { HeroTag } from '../../shared/components/Capability';
import { useStartPlaybook } from './useStartPlaybook';
import { icon } from '../../shared/styles/tokens';

/** 工作台上的剧本入口。 */
export function PlaybookCards() {
  const { state, setPlaybookStep } = useDemo();
  const start = useStartPlaybook();
  const navigate = useNavigate();
  const resume = (playbook: Playbook, step: number) => { setPlaybookStep(step); const target = playbook.steps[Math.min(step, playbook.steps.length - 1)]; navigate(pagePath(playbook, target.page)); };
  return <section className="playbook-section" aria-label="演示剧本">
    <SectionHeading eyebrow="演示剧本" title="从一个真实问题走完一遍" description="每条剧本都复用现有页面，只换数据；右下角「演示步骤」浮层会告诉你下一步点哪里。所有数字均为演示数据。" aside={<DemoTag />} />
    <div className="playbook-grid">{playbooks.map(playbook => {
      const active = state.playbook?.id === playbook.id ? state.playbook : null;
      return <Card key={playbook.id} className={`playbook-card ${active ? 'active' : ''}`}>
        <div className="playbook-card-head"><span className="playbook-letter">{playbook.letter}</span><div><span className="eyebrow">剧本 {playbook.letter} · 体现「{playbook.theme}」</span><h3>{playbook.title}</h3></div></div>
        <p>{playbook.summary}</p>
        <ol className="playbook-flow">{playbook.flow.map(item => <li key={item}>{item}</li>)}</ol>
        <div className="playbook-heroes">{playbook.heroes.map(n => <HeroTag key={n} n={n} compact />)}</div>
        <div className="playbook-card-foot"><span className="meta">{playbook.steps.length} 步{active ? ` · 进行到第 ${Math.min(active.step + 1, playbook.steps.length)} 步` : ''}</span>
          <span className="inline-actions">{active && active.step < playbook.steps.length && <Button onClick={() => resume(playbook, active.step)}><ChevronRight size={icon.small} />继续剧本 {playbook.letter}</Button>}
            <ConfirmAction icon={active ? <RotateCcw size={icon.small} /> : <Play size={icon.small} />} actionLabel={active ? '重新开始' : `开始剧本 ${playbook.letter}`} confirmLabel={`确认${active ? '重新开始' : '开始'}剧本 ${playbook.letter}`}
              impact={`「${playbook.title}」的演示数据会换成剧本 ${playbook.letter} 的初始数据，这个 Agent 当前的演示进度会被覆盖；其它 Agent 不受影响。`} onConfirm={() => start(playbook.id)} /></span></div>
      </Card>;
    })}</div>
  </section>;
}
