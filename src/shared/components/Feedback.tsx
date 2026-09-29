import { AlertCircle, CheckCircle2, Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { icon } from '../styles/tokens';

export function Feedback({ kind, title, description, action }: { kind: 'loading' | 'empty' | 'error' | 'success'; title: string; description: string; action?: ReactNode }) {
  const Icon = { loading: LoaderCircle, empty: Inbox, error: AlertCircle, success: CheckCircle2 }[kind];
  return <div className={`feedback feedback-${kind}`} role={kind === 'error' ? 'alert' : 'status'}><Icon size={icon.large} className={kind === 'loading' ? 'spin' : ''} aria-hidden="true" />
    <div><strong>{title}</strong><p>{description}</p>{action}</div></div>;
}
