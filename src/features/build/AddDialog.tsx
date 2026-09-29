/**
 * 构建页的「添加」弹窗：从资产中心搜索已发布的资产添加到草稿，或者直接上传 / 创建（同时入库到资产中心）。
 * 工具、知识库、数据库共用。limit 为 1 时，添加会替换当前已挂的那个。
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Button } from '../../shared/components/Buttons';
import { icon } from '../../shared/styles/tokens';

export interface AddItem { key: string; title: string; sub: string; meta?: ReactNode; added: boolean }

export function AddDialog({ title, limit, noun, items, createLabel, libraryPath, onAdd, onCreate, onClose }: {
  title: string; limit?: string; noun: string; items: AddItem[]; createLabel: string; libraryPath: string;
  onAdd: (key: string) => void; onCreate: () => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const text = query.trim();
  const shown = items.filter(item => !text || item.title.includes(text) || item.sub.includes(text));
  return <div className="add-dialog-layer">
    <button type="button" className="side-drawer-backdrop" aria-label="关闭" onClick={onClose} />
    <section className="add-dialog" role="dialog" aria-modal="true" aria-label={title} data-demo="add-dialog">
      <header className="add-dialog-head"><h2>{title}</h2>{limit && <span className="add-dialog-limit">{limit}</span>}<button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={icon.large} /></button></header>
      <div className="add-dialog-tools">
        <label className="add-dialog-search"><span className="sr-only">搜索{noun}</span><input value={query} placeholder={`搜索${noun}名称`} onChange={event => setQuery(event.target.value)} /><Search size={icon.small} aria-hidden="true" /></label>
        <Button variant="primary" onClick={onCreate}>{createLabel}</Button>
      </div>
      <div className="add-dialog-body">
        {shown.length ? <ul className="add-list">{shown.map(item => <li key={item.key}>
          <div><strong>{item.title}</strong><span className="meta">{item.sub}</span>{item.meta && <span className="add-list-meta">{item.meta}</span>}</div>
          {item.added ? <span className="meta add-added">已添加</span> : <Button onClick={() => onAdd(item.key)}>{limit ? '选用' : '添加'}</Button>}
        </li>)}</ul>
          : <div className="add-empty"><strong>暂无{noun}</strong><p>没有符合条件的{noun}。去 <button type="button" className="link-button" onClick={onCreate}>{createLabel}</button> 或 <Link className="link-button" to={libraryPath}>查看资产中心</Link></p></div>}
      </div>
      <footer className="add-dialog-foot meta">只列出你的团队可用、已发布的{noun}。{createLabel}后会同时入库到资产中心，其他 Agent 也可以复用。</footer>
    </section>
  </div>;
}
