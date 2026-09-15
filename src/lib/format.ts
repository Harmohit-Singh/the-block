/**
 * Display formatting, centralised so prices and distances can't drift between
 * the grid, the detail page, and validation messages.
 *
 * The dataset is entirely Canadian (provinces, kilometres), so amounts are
 * formatted as CAD in en-CA.
 */

const CURRENCY = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });

/** Whole-dollar amounts; auction prices are never quoted in cents. */
export function formatCurrency(amount: number): string {
  return CURRENCY.format(amount);
}

export function formatOdometer(km: number): string {
  return `${NUMBER.format(km)} km`;
}

/** Grades are one decimal out of 5, e.g. `"3.8 / 5"`. */
export function formatConditionGrade(grade: number): string {
  return `${grade.toFixed(1)} / 5`;
}

/**
 * Coarse countdown: the largest two units that still carry information.
 *
 * Showing seconds on a lot that closes in three days is noise, but they matter
 * in the final minutes, so the unit pair slides with the remaining time.
 */
export function formatTimeRemaining(target: Date, now: Date): string {
  const totalSeconds = Math.floor((target.getTime() - now.getTime()) / 1000);
  if (totalSeconds <= 0) return "Closed";

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

const DATE_TIME = new Intl.DateTimeFormat("en-CA", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatAuctionTime(date: Date): string {
  return DATE_TIME.format(date);
}
