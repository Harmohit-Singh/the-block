import rawVehicles from "../../data/vehicles.json";
import { normalizeVehicles } from "./normalize";
import type { NormalizedVehicle, RawVehicle } from "./types";

/**
 * The single place the app touches the dataset.
 *
 * At 200 records (34 KB gzipped) the whole inventory is bundled and normalized
 * once at startup, which is faster than any network round trip would be. If
 * this ever moves behind an HTTP API, this module is the only file that
 * changes — `normalize`, `bids`, and `query` never learn where the data came
 * from.
 */

/**
 * Cheap structural check on the bundled JSON.
 *
 * The import is typed by assertion, so a malformed row would otherwise surface
 * as a confusing `undefined` deep in the UI. This turns it into one clear error
 * naming the offending record.
 */
function assertRawVehicles(value: unknown): asserts value is RawVehicle[] {
  if (!Array.isArray(value)) {
    throw new Error("vehicles.json did not parse to an array");
  }

  const required = [
    "id",
    "vin",
    "lot",
    "year",
    "make",
    "model",
    "auction_start",
    "starting_bid",
  ] as const;

  value.forEach((vehicle: Record<string, unknown>, index) => {
    const missing = required.filter((key) => vehicle?.[key] === undefined);
    if (missing.length > 0) {
      throw new Error(
        `vehicles.json record ${index} is missing: ${missing.join(", ")}`,
      );
    }
  });
}

assertRawVehicles(rawVehicles);

/**
 * Every vehicle, normalized once against app start time.
 *
 * Frozen because this is shared module state: a stray mutation here would be
 * invisible and would poison every subsequent query.
 */
export const VEHICLES: readonly NormalizedVehicle[] = Object.freeze(
  normalizeVehicles(rawVehicles),
);

/** Index for detail-page lookups, so routing by id stays O(1). */
const VEHICLES_BY_ID = new Map(VEHICLES.map((vehicle) => [vehicle.id, vehicle]));

export function getNormalizedVehicle(id: string): NormalizedVehicle | undefined {
  return VEHICLES_BY_ID.get(id);
}
