import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

const variants: Record<Variant, string> = {
  primary: 'bg-spotlight text-ink shadow-podium',
  secondary: 'bg-stage-raised text-projector ring-2 ring-wood-light/60',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`min-h-14 rounded-button px-8 font-display text-xl font-bold transition-transform duration-(--duration-tap) active:translate-y-1 active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}
