import { useEffect, useState } from "react";

/**
 * A `Date` that advances on an interval, so auction status and countdowns move
 * without a page refresh.
 *
 * The interval is a parameter because the two callers want very different
 * rates: the inventory grid only needs to notice lots opening and closing, so
 * it ticks slowly, while a countdown on the detail page ticks every second.
 * Re-deriving all 200 vehicles once a second would be pure waste.
 */
export function useNow(intervalMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
