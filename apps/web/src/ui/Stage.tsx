import type { ReactNode } from 'react';

/**
 * Host (TV) backdrop: a shabby conference stage with velvet curtains, a valance and a
 * wooden floor. Never scrolls. `className` styles the content area inside the set.
 */
export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className="relative h-dvh overflow-hidden bg-stage">
      <div aria-hidden className="stage-glow absolute inset-0" />
      <div aria-hidden className="stage-floor" />
      <div aria-hidden className="curtain-side left-0" />
      <div aria-hidden className="curtain-side right-0 -scale-x-100" />
      <div aria-hidden className="valance" />
      <div className={`relative h-full px-28 pt-20 pb-24 ${className}`}>{children}</div>
    </main>
  );
}
