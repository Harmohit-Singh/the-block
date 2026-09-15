/**
 * Type boundary between `data/vehicles.json` and the rest of the app.
 *
 * `RawVehicle` mirrors the file byte-for-byte (snake_case, nullable prices).
 * `Vehicle` is what components consume: camelCase, real `Date`s, and no
 * nullable fields that the UI would otherwise have to branch on.
 *
 * Nothing outside `normalize.ts` should ever import `RawVehicle`.
 */

import type {
  AUCTION_STATUSES,
  BODY_STYLES,
  DRIVETRAINS,
  FUEL_TYPES,
  TITLE_STATUSES,
  TRANSMISSIONS,
} from "./constants";

/** Legal status of the vehicle's ownership document. */
export type TitleStatus = (typeof TITLE_STATUSES)[number];

export type FuelType = (typeof FUEL_TYPES)[number];

export type BodyStyle = (typeof BODY_STYLES)[number];

export type Drivetrain = (typeof DRIVETRAINS)[number];

export type Transmission = (typeof TRANSMISSIONS)[number];

/** Where a lot sits relative to now. Derived, never stored. */
export type AuctionStatus = (typeof AUCTION_STATUSES)[number];

/**
 * Whether bidding has cleared the seller's reserve.
 * `"none"` means the lot was listed without a reserve and sells at any price.
 */
export type ReserveState = "none" | "met" | "not-met";

/** A row of `data/vehicles.json`, exactly as it appears on disk. */
export interface RawVehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  body_style: BodyStyle;
  exterior_color: string;
  interior_color: string;
  engine: string;
  transmission: Transmission;
  drivetrain: Drivetrain;
  odometer_km: number;
  fuel_type: FuelType;
  condition_grade: number;
  condition_report: string;
  damage_notes: string[];
  title_status: TitleStatus;
  province: string;
  city: string;
  /** Local ISO timestamp without a zone, e.g. `"2026-04-05T14:00:00"`. */
  auction_start: string;
  starting_bid: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  images: string[];
  selling_dealership: string;
  lot: string;
  current_bid: number | null;
  bid_count: number;
}

/**
 * A vehicle after one-time derivation, but before this session's bids are
 * layered on. Produced by `normalizeVehicles`, cached for the life of the app.
 */
export interface NormalizedVehicle {
  id: string;
  vin: string;
  lot: string;

  year: number;
  make: string;
  model: string;
  trim: string;
  /** Human label, e.g. `"2023 Ford Bronco Big Bend"`. Not the legal title. */
  displayName: string;

  bodyStyle: BodyStyle;
  exteriorColor: string;
  interiorColor: string;
  engine: string;
  transmission: Transmission;
  drivetrain: Drivetrain;
  fuelType: FuelType;
  odometerKm: number;

  conditionGrade: number;
  conditionReport: string;
  damageNotes: string[];
  /** Legal ownership status. Distinct from `displayName`. */
  titleStatus: TitleStatus;

  city: string;
  province: string;
  sellingDealership: string;
  images: string[];

  /** Rebased onto the current week. See `normalize.ts`. */
  auctionStart: Date;
  /** Derived as `auctionStart + AUCTION_DURATION_HOURS`; not present in the source data. */
  auctionEnd: Date;

  startingBid: number;
  reservePrice: number | null;
  buyNowPrice: number | null;

  /** Seed bid from the dataset, before any bids placed in this session. */
  seedCurrentBid: number | null;
  seedBidCount: number;
}

/**
 * A vehicle with live bid state applied. This is the only vehicle shape the
 * UI should see.
 */
export interface Vehicle extends NormalizedVehicle {
  /** Highest bid, seed or session. `null` when nobody has bid yet. */
  currentBid: number | null;
  bidCount: number;
  /**
   * The number to sort, filter, and lead with in the UI:
   * `currentBid ?? startingBid`. Always present, so callers never null-check.
   */
  effectivePrice: number;
  reserveState: ReserveState;
  status: AuctionStatus;
  hasBuyNow: boolean;
}
