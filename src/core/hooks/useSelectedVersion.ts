import { useSearchParams } from 'react-router-dom';
import type { Agent } from '../../types/domain';
import { focusVersion, getVersion } from '../rules/versions';

/** 页头版本选择器写入 ?version=vX；没有参数时使用默认聚焦版本（候选版本优先，其次线上）。 */
export function useSelectedVersion(agent: Agent) {
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = focusVersion(agent);
  const selected = getVersion(agent, searchParams.get('version')) ?? focus;
  const select = (id: string) => setSearchParams(id === focus.id ? {} : { version: id }, { replace: true });
  const search = selected.id === focus.id ? '' : `?version=${selected.id}`;
  return { selected, focus, select, search };
}
