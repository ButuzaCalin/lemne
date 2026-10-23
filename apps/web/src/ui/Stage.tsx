import type { ReactNode } from 'react';

/** Host (TV) backdrop: dark stage with the curtain-red glow from the top. Never scrolls. */
export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_top,var(--color-curtain)_0%,var(--color-curtain-deep)_45%,var(--color-stage)_100%)] p-16 ${className}`}
    >
      {children}
    </main>
  );
}
