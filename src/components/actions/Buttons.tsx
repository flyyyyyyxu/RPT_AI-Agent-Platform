import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; reason?: string; children: ReactNode };

export function Button({ variant = 'secondary', reason, disabled, title, className = '', children, ...props }: ButtonProps) {
  return <span className="button-wrap" title={disabled ? reason : title}>
    <button className={`button button-${variant} ${className}`} disabled={disabled} {...props}>{children}</button>
    {disabled && reason && <span className="button-reason">{reason}</span>}
  </span>;
}

/** 影响线上的操作：先展开页面内确认区，写清影响范围，再执行。不使用浏览器弹窗，也不用红色实底。 */
export function ConfirmAction({ actionLabel, confirmLabel, impact, onConfirm, variant = 'secondary', disabled, reason, icon }: {
  actionLabel: ReactNode; confirmLabel: string; impact: ReactNode; onConfirm: () => void;
  variant?: 'primary' | 'secondary'; disabled?: boolean; reason?: string; icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <div className="confirm-action">
    {!open && <Button variant={variant} onClick={() => setOpen(true)} disabled={disabled} reason={reason}>{icon}{actionLabel}</Button>}
    {open && <div className="confirmation" role="group" aria-label={`${confirmLabel}二次确认`}>
      <strong>{confirmLabel}？</strong><p>{impact}</p>
      <div className="inline-actions"><Button onClick={() => setOpen(false)}>取消</Button><Button variant={variant} onClick={() => { onConfirm(); setOpen(false); }}>{confirmLabel}</Button></div>
    </div>}
  </div>;
}
