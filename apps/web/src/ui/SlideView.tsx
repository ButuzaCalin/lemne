import type { SlideContent } from '@lemne/shared';

/** A slide as projected: warm off-white with dark ink. `compact` is the phone thumbnail. */
export function SlideView({ slide, compact = false }: { slide: SlideContent; compact?: boolean }) {
  if (slide.kind === 'image') {
    return (
      <div className="size-full overflow-hidden rounded-card bg-projector">
        <img src={slide.src} alt={slide.alt} className="size-full object-contain" draggable={false} />
      </div>
    );
  }
  return (
    <div
      className={`grid size-full place-items-center rounded-card bg-projector text-center font-display font-extrabold text-ink ${compact ? 'p-4 text-xl leading-tight' : 'p-20 text-7xl leading-[1.1]'}`}
    >
      {slide.text}
    </div>
  );
}
