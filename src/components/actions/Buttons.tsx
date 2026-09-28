import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; reason?: string; children: ReactNode };

export function Button({ variant = 'secondary', reason, disabled, title, className = '', children, ...props }: ButtonProps) {
  return <span className="button-wrap" title={disabled ? reason : title}>
    <button className={`button button-${variant} ${className}`} disabled={disabled} {...props}>{children}</button>
    {disabled && reason && <span className="button-reason">{reason}</span>}
  </span>;
}

export function ConfirmAction({ actionLabel, impact, onConfirm }: { actionLabel: string; impact: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="confirm-action">
    <Button onClick={() => setOpen(true)}>{actionLabel}</Button>
    {open && <div className="confirmation" role="group" aria-label={`${actionLabel}二次确认`}>
      <strong>确认{actionLabel}？</strong><p>{impact}</p>
      <div className="inline-actions"><Button onClick={() => setOpen(false)}>取消</Button><Button onClick={() => { onConfirm(); setOpen(false); }}>确认{actionLabel}</Button></div>
    </div>}
  </div>;
}
