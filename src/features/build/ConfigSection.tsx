import type { ReactNode } from 'react';

export function ConfigSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="config-section"><div className="config-section-heading"><h3>{title}</h3><p>{description}</p></div><div className="config-section-body">{children}</div></section>;
}
