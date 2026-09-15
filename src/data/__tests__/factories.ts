import { applyBids } from "../bids";
import type { NormalizedVehicle, RawVehicle, Vehicle } from "../types";

/**
 * Test fixtures.
 *
 * Tests build the narrowest vehicle that expresses their case and let the
 * factory fill the rest, so a schema change touches this file only.
 */

/** Fixed reference time for every test: Mon 14 Sep 2026, 12:00 local. */
export const NOW = new Date(2026, 8, 14, 12, 0, 0);

let sequence = 0;

export function makeRaw(overrides: Partial<RawVehicle> = {}): RawVehicle {
  sequence += 1;
  return {
    id: `vehicle-${sequence}`,
    vin: `VIN${String(sequence).padStart(14, "0")}`,
    year: 2022,
    make: "Ford",
    model: "Bronco",
    trim: "Big Bend",
    body_style: "SUV",
    exterior_color: "Burgundy",
    interior_color: "Beige",
    engine: "2.7L EcoBoost V6",
    transmission: "automatic",
    drivetrain: "4WD",
    odometer_km: 47_731,
    fuel_type: "gasoline",
    condition_grade: 3.8,
    condition_report: "Average condition.",
    damage_notes: ["Scratch on liftgate"],
    title_status: "clean",
    province: "Ontario",
    city: "Toronto",
    auction_start: "2026-04-05T14:00:00",
    starting_bid: 14_500,
    reserve_price: 25_000,
    buy_now_price: null,
    images: ["https://placehold.co/800x600"],
    selling_dealership: "King City Auto",
    lot: `A-${String(sequence).padStart(4, "0")}`,
    current_bid: null,
    bid_count: 0,
    ...overrides,
  };
}

export function makeNormalized(
  overrides: Partial<NormalizedVehicle> = {},
): NormalizedVehicle {
  sequence += 1;
  const base: NormalizedVehicle = {
    id: `vehicle-${sequence}`,
    vin: `VIN${String(sequence).padStart(14, "0")}`,
    lot: `A-${String(sequence).padStart(4, "0")}`,

    year: 2022,
    make: "Ford",
    model: "Bronco",
    trim: "Big Bend",
    displayName: "2022 Ford Bronco Big Bend",

    bodyStyle: "SUV",
    exteriorColor: "Burgundy",
    interiorColor: "Beige",
    engine: "2.7L EcoBoost V6",
    transmission: "automatic",
    drivetrain: "4WD",
    fuelType: "gasoline",
    odometerKm: 47_731,

    conditionGrade: 3.8,
    conditionReport: "Average condition.",
    damageNotes: ["Scratch on liftgate"],
    titleStatus: "clean",

    city: "Toronto",
    province: "Ontario",
    sellingDealership: "King City Auto",
    images: ["https://placehold.co/800x600"],

    // Live by default: opened yesterday, closes tomorrow.
    auctionStart: new Date(2026, 8, 13, 9, 0, 0),
    auctionEnd: new Date(2026, 8, 15, 9, 0, 0),

    startingBid: 14_500,
    reservePrice: 25_000,
    buyNowPrice: null,

    seedCurrentBid: null,
    seedBidCount: 0,
    ...overrides,
  };

  return base;
}

export function makeVehicle(overrides: Partial<NormalizedVehicle> = {}): Vehicle {
  return applyBids(makeNormalized(overrides), [], NOW);
}
