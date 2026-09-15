/**
 * Tunable constants for the data layer. Every value here encodes a product
 * assumption rather than a fact from the dataset — see ASSUMPTIONS.md.
 */

export const MS_PER_DAY = 86_400_000;

/**
 * Closed value sets, verified exhaustively against all 200 records in
 * `data/vehicles.json`. The union types in `types.ts` are derived from these,
 * so adding a value here is the only edit needed to teach the app about it.
 */
export const BODY_STYLES = ["SUV", "sedan", "truck", "hatchback", "coupe"] as const;
export const FUEL_TYPES = ["gasoline", "hybrid", "diesel", "electric"] as const;
export const DRIVETRAINS = ["AWD", "FWD", "4WD", "RWD"] as const;
export const TRANSMISSIONS = ["automatic", "CVT", "manual", "single-speed"] as const;
export const TITLE_STATUSES = ["clean", "rebuilt", "salvage"] as const;
export const AUCTION_STATUSES = ["upcoming", "live", "ended"] as const;

/**
 * How long a lot stays open after `auctionStart`.
 *
 * The dataset has no auction end time, but countdowns and an "ending soon"
 * sort both need one, so we invent a uniform run length.
 */
export const AUCTION_DURATION_HOURS = 48;

/**
 * How far into the rebased auction window "now" should sit.
 *
 * Landing the earliest auction exactly on today would leave all 200 lots in
 * the future, with nothing live to bid on and nothing closed. Pushing "now"
 * four days in lands all three states at once — roughly 58 live, 93 upcoming,
 * and 49 closed — so the majority of inventory is still biddable while sold
 * lots are visible too.
 *
 * Sensitive to AUCTION_DURATION_HOURS: at 48 hours an offset of 2 yields no
 * closed lots at all, and 5 or more tips the balance to mostly closed.
 */
export const REBASE_WINDOW_OFFSET_DAYS = 4;

/** Default results per page in the inventory grid. */
export const DEFAULT_PAGE_SIZE = 24;

/**
 * Minimum bid increments by current price, mirroring how physical auction
 * lanes step up more coarsely on expensive lots.
 */
export const BID_INCREMENT_TIERS: ReadonlyArray<{ below: number; increment: number }> = [
  { below: 5_000, increment: 100 },
  { below: 20_000, increment: 250 },
  { below: 50_000, increment: 500 },
  { below: Number.POSITIVE_INFINITY, increment: 1_000 },
];

/** localStorage key for bids placed in this session. */
export const BIDS_STORAGE_KEY = "the-block:bids:v1";
