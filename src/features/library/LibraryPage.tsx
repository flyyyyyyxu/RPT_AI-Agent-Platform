/** 资产中心（横轴 · 平台共享）：知识库、数据库、工具、评测集、模型、Prompt 模板六个二级目录，地址为 #/assets/:tab。都带版本，登记一次，任何 Agent 引用。 */
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { assetSections, type AssetSectionId } from '../../data';
import { KnowledgeTab } from './KnowledgeTab';
import { ToolsTab } from './ToolsTab';
import { DatabasesTab } from './DatabasesTab';
import { EvalSetsTab } from './EvalSetsTab';
import { ModelsTab } from './ModelsTab';
import { PromptsTab } from './PromptsTab';
import './library.css';

const isTab = (value: string | null | undefined): value is AssetSectionId => assetSections.some(item => item.id === value);

/** 旧地址 #/assets 和 #/assets?tab=xx：跳到对应二级目录 */
export function AssetsIndex() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  return <Navigate to={`/assets/${isTab(tab) ? tab : 'knowledge'}`} replace />;
}

/** 每个二级目录自己渲染页头（标题 + 新建按钮）、列表和抽屉 */
export function LibraryPage() {
  const { tab } = useParams();
  if (!isTab(tab)) return <Navigate to="/assets/knowledge" replace />;
  return <div className="page-stack">
    {tab === 'knowledge' && <KnowledgeTab />}
    {tab === 'databases' && <DatabasesTab />}
    {tab === 'tools' && <ToolsTab />}
    {tab === 'evalsets' && <EvalSetsTab />}
    {tab === 'models' && <ModelsTab />}
    {tab === 'prompts' && <PromptsTab />}
  </div>;
}
