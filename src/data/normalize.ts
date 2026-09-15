import {
  AUCTION_DURATION_HOURS,
  MS_PER_DAY,
  REBASE_WINDOW_OFFSET_DAYS,
} from "./constants";
import type { NormalizedVehicle, RawVehicle } from "./types";

/**
 * One-time derivation from the raw dataset.
 *
 * Everything here is independent of bidding, so it runs once at startup:
 * camelCase mapping, display-name creation, and auction schedule rebasing.
 */

/**
 * Parses `"2026-04-05T14:00:00"` as local wall-clock time.
 *
 * Done by hand rather than via `Date.parse` so the absence of a timezone in
 * the dataset is handled explicitly instead of relying on engine behaviour.
 */
export function parseLocalDateTime(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Unrecognised auction timestamp: ${value}`);
  }
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

/**
 * Adds whole calendar days, preserving the local time of day.
 *
 * Adding `days * MS_PER_DAY` would drift by an hour across a daylight saving
 * boundary and drop auctions that start at 9am onto 8am or 10am.
 */
function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * How many whole days to slide every auction forward.
 *
 * The dataset's auction window is frozen at whenever `scripts/generate_vehicles.mjs`
 * last ran, so on any real run date every lot has already expired. We move the
 * entire window by a single offset, which keeps the generator's deliberate
 * 7-day stagger and relative ordering intact, and round to whole days so the
 * realistic 9am–8pm start times survive.
 *
 * The offset lands `now` partway into the window rather than at its very
 * start, so the app opens with closed, live, and upcoming lots all present.
 */
export function calculateScheduleShiftDays(raw: readonly RawVehicle[], now: Date): number {
  if (raw.length === 0) return 0;

  const earliest = Math.min(
    ...raw.map((vehicle) => parseLocalDateTime(vehicle.auction_start).getTime()),
  );
  const daysToToday = Math.ceil((now.getTime() - earliest) / MS_PER_DAY);
  return daysToToday - REBASE_WINDOW_OFFSET_DAYS;
}

function normalizeVehicle(
  vehicle: RawVehicle,
  shiftDays: number,
): NormalizedVehicle {
  const displayName = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`.trim();
  const auctionStart = addCalendarDays(
    parseLocalDateTime(vehicle.auction_start),
    shiftDays,
  );

  return {
    id: vehicle.id,
    vin: vehicle.vin,
    lot: vehicle.lot,

    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    displayName,

    bodyStyle: vehicle.body_style,
    exteriorColor: vehicle.exterior_color,
    interiorColor: vehicle.interior_color,
    engine: vehicle.engine,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    fuelType: vehicle.fuel_type,
    odometerKm: vehicle.odometer_km,

    conditionGrade: vehicle.condition_grade,
    conditionReport: vehicle.condition_report,
    damageNotes: vehicle.damage_notes,
    titleStatus: vehicle.title_status,

    city: vehicle.city,
    province: vehicle.province,
    sellingDealership: vehicle.selling_dealership,
    images: vehicle.images,

    auctionStart,
    auctionEnd: addHours(auctionStart, AUCTION_DURATION_HOURS),

    startingBid: vehicle.starting_bid,
    reservePrice: vehicle.reserve_price,
    buyNowPrice: vehicle.buy_now_price,

    seedCurrentBid: vehicle.current_bid,
    seedBidCount: vehicle.bid_count,
  };
}

/**
 * Normalizes the whole dataset against a reference time.
 *
 * `now` is injected rather than read from the clock so tests are deterministic.
 */
export function normalizeVehicles(
  raw: readonly RawVehicle[],
  now: Date = new Date(),
): NormalizedVehicle[] {
  const shiftDays = calculateScheduleShiftDays(raw, now);
  return raw.map((vehicle) => normalizeVehicle(vehicle, shiftDays));
}
