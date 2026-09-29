/**
 * 右侧抽屉：资产的详情、新建、修改都在这里打开，列表留在左侧可见。
 * 按 Esc 或点遮罩关闭；页面内展开，不使用浏览器弹窗。
 */
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { icon } from '../styles/tokens';

export function Drawer({ label, eyebrow, title, meta, onClose, footer, children, demo }: {
  label: string; eyebrow?: ReactNode; title: ReactNode; meta?: ReactNode; onClose: () => void; footer?: ReactNode; children: ReactNode; demo?: string;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className="side-drawer-layer">
    <button type="button" className="side-drawer-backdrop" aria-label="关闭" onClick={onClose} />
    <aside className="side-drawer" role="dialog" aria-modal="true" aria-label={label} data-demo={demo}>
      <header className="side-drawer-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{meta && <p className="meta">{meta}</p>}</div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="关闭"><X size={icon.large} /></button></header>
      <div className="side-drawer-body">{children}</div>
      {footer && <footer className="side-drawer-foot">{footer}</footer>}
    </aside>
  </div>;
}
