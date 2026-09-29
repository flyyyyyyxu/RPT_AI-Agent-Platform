/** 开始剧本：换成剧本初始数据并跳到第一步所在页面。 */
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../core/store/DemoProvider';
import { pagePath, playbookOf } from './playbooks';
import type { PlaybookId } from '../../types/domain';

/** 开始剧本：换成剧本的初始数据，并跳到第一步所在页面。 */
export function useStartPlaybook() {
  const { startPlaybook } = useDemo();
  const navigate = useNavigate();
  return (id: PlaybookId) => { const playbook = playbookOf(id); startPlaybook(id); navigate(pagePath(playbook, playbook.steps[0].page)); };
}
