import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { duration } from '../motion';

/** Counts from the previous value to the new one instead of jumping. */
export function CountUp({ value, format = String }: { value: number; format?: (n: number) => string }) {
  const reduced = useReducedMotion();
  const prev = useRef(0);
  const [shown, setShown] = useState(reduced ? value : prev.current);

  useEffect(() => {
    if (reduced) {
      prev.current = value;
      return setShown(value);
    }
    const controls = animate(prev.current, value, {
      duration: duration.celebrate,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduced]);

  return <>{format(shown)}</>;
}
