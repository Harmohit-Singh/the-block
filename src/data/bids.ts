import { formatCurrency } from "../lib/format";
import { BID_INCREMENT_TIERS } from "./constants";
import type {
  AuctionStatus,
  NormalizedVehicle,
  ReserveState,
  Vehicle,
} from "./types";

/**
 * Bid state, modelled as an append-only log rather than a mutation.
 *
 * Storing bids separately from vehicles means the list and the detail view
 * cannot disagree: both derive their numbers from the same log. It also gives
 * us bid history and undo for free, neither of which is possible if we
 * overwrite `currentBid` in place.
 */

export interface Bid {
  id: string;
  vehicleId: string;
  /** Amount currently committed to the auction. */
  amount: number;
  /** Private ceiling authorized by the buyer for proxy bidding. */
  maxAmount: number;
  placedAt: Date;
  /** Display name for the bidder. The challenge does not require auth. */
  bidder: string;
}

/**
 * The amount a proxy bid commits immediately.
 *
 * A real auction service would call this again when a competing bid arrives.
 * In this single-buyer prototype it gives the UI the same initial behavior:
 * retain the private ceiling while exposing only the smallest valid bid.
 */
export function initialProxyBid(vehicle: Vehicle, maxAmount: number): number {
  return Math.min(minimumBid(vehicle), maxAmount);
}

/** Minimum step up from the current price, coarser on more expensive lots. */
export function bidIncrement(currentPrice: number): number {
  const tier = BID_INCREMENT_TIERS.find(({ below }) => currentPrice < below);
  return tier?.increment ?? 1_000;
}

/**
 * Smallest bid the buyer is allowed to place.
 *
 * The opening bid is the seller's starting bid exactly; every later bid must
 * clear the current bid by at least one increment.
 */
export function minimumBid(vehicle: Vehicle): number {
  if (vehicle.currentBid === null) return vehicle.startingBid;
  return vehicle.currentBid + bidIncrement(vehicle.currentBid);
}

export function deriveAuctionStatus(
  vehicle: Pick<NormalizedVehicle, "auctionStart" | "auctionEnd">,
  now: Date,
): AuctionStatus {
  const time = now.getTime();
  if (time < vehicle.auctionStart.getTime()) return "upcoming";
  if (time < vehicle.auctionEnd.getTime()) return "live";
  return "ended";
}

/**
 * Whether bidding has cleared the reserve.
 *
 * The state is derived separately from the reserve figure so presentation can
 * show both the seller's amount and whether the current bid clears it.
 */
export function deriveReserveState(
  reservePrice: number | null,
  effectivePrice: number,
): ReserveState {
  if (reservePrice === null) return "none";
  return effectivePrice >= reservePrice ? "met" : "not-met";
}

/** Layers a single vehicle's bids over its seed data. */
export function applyBids(
  vehicle: NormalizedVehicle,
  bidsForVehicle: readonly Bid[],
  now: Date,
): Vehicle {
  const highestSessionBid = bidsForVehicle.reduce<number | null>(
    (highest, bid) => (highest === null || bid.amount > highest ? bid.amount : highest),
    null,
  );

  const currentBid =
    highestSessionBid === null
      ? vehicle.seedCurrentBid
      : Math.max(vehicle.seedCurrentBid ?? 0, highestSessionBid);

  const effectivePrice = currentBid ?? vehicle.startingBid;

  return {
    ...vehicle,
    currentBid,
    bidCount: vehicle.seedBidCount + bidsForVehicle.length,
    effectivePrice,
    reserveState: deriveReserveState(vehicle.reservePrice, effectivePrice),
    status: deriveAuctionStatus(vehicle, now),
    hasBuyNow: vehicle.buyNowPrice !== null,
  };
}

/** Groups the log once, then overlays it, so this stays O(vehicles + bids). */
export function applyBidsToAll(
  vehicles: readonly NormalizedVehicle[],
  bids: readonly Bid[],
  now: Date,
): Vehicle[] {
  const byVehicle = new Map<string, Bid[]>();
  for (const bid of bids) {
    const existing = byVehicle.get(bid.vehicleId);
    if (existing) {
      existing.push(bid);
    } else {
      byVehicle.set(bid.vehicleId, [bid]);
    }
  }

  const empty: Bid[] = [];
  return vehicles.map((vehicle) =>
    applyBids(vehicle, byVehicle.get(vehicle.id) ?? empty, now),
  );
}

/** A vehicle's bids, newest first, for the detail page's history panel. */
export function getBidHistory(bids: readonly Bid[], vehicleId: string): Bid[] {
  return bids
    .filter((bid) => bid.vehicleId === vehicleId)
    .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
}

export type BidRejectionCode =
  | "auction-ended"
  | "invalid-amount"
  | "below-minimum"
  | "at-or-above-buy-now";

export type BidValidation =
  | { ok: true }
  | { ok: false; code: BidRejectionCode; message: string };

/**
 * Gate for placing a bid.
 *
 * Kept pure and separate from the store so the bid form can call it on every
 * keystroke for inline feedback, and the store can call it again on submit as
 * the authoritative check.
 */
export function validateBid(vehicle: Vehicle, amount: number): BidValidation {
  if (vehicle.status === "ended") {
    return {
      ok: false,
      code: "auction-ended",
      message: "Bidding on this lot has closed.",
    };
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false,
      code: "invalid-amount",
      message: "Enter a whole dollar amount.",
    };
  }

  const minimum = minimumBid(vehicle);
  if (amount < minimum) {
    return {
      ok: false,
      code: "below-minimum",
      message: `Bid must be at least ${formatCurrency(minimum)}.`,
    };
  }

  if (vehicle.buyNowPrice !== null && amount >= vehicle.buyNowPrice) {
    return {
      ok: false,
      code: "at-or-above-buy-now",
      message: `Bids must stay below the ${formatCurrency(vehicle.buyNowPrice)} Buy Now price.`,
    };
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------
 * Bid log state transitions
 *
 * Kept as a pure reducer so it can be tested without React, and so the store
 * in `bidsStore.tsx` is nothing but wiring.
 * ---------------------------------------------------------------------- */

export type BidAction =
  | { type: "place"; bid: Bid }
  | { type: "retract"; bidId: string }
  | { type: "reset" };

export function bidsReducer(state: readonly Bid[], action: BidAction): Bid[] {
  switch (action.type) {
    case "place":
      return [...state, action.bid];
    case "retract":
      return state.filter((bid) => bid.id !== action.bidId);
    case "reset":
      return [];
    default:
      return state as Bid[];
  }
}

/** Wire format for persistence: `Date` does not survive `JSON.stringify`. */
interface SerializedBid extends Omit<Bid, "placedAt"> {
  placedAt: string;
}

export function serializeBids(bids: readonly Bid[]): string {
  const payload: SerializedBid[] = bids.map((bid) => ({
    ...bid,
    placedAt: bid.placedAt.toISOString(),
  }));
  return JSON.stringify(payload);
}

/**
 * Reads persisted bids, tolerating anything malformed.
 *
 * Stored data outlives code, so a stale or hand-edited payload must degrade to
 * an empty log rather than crashing the app on boot.
 */
export function deserializeBids(raw: string | null): Bid[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry: Partial<SerializedBid>): Bid[] => {
      const placedAt = entry.placedAt ? new Date(entry.placedAt) : null;
      const isValid =
        typeof entry.id === "string" &&
        typeof entry.vehicleId === "string" &&
        typeof entry.amount === "number" &&
        Number.isFinite(entry.amount) &&
        (entry.maxAmount === undefined ||
          (typeof entry.maxAmount === "number" &&
            Number.isFinite(entry.maxAmount) &&
            entry.maxAmount >= entry.amount)) &&
        placedAt !== null &&
        !Number.isNaN(placedAt.getTime());

      if (!isValid) return [];

      return [
        {
          id: entry.id as string,
          vehicleId: entry.vehicleId as string,
          amount: entry.amount as number,
          // Bids saved by older versions were direct bids, so their ceiling
          // is the amount that was committed.
          maxAmount:
            typeof entry.maxAmount === "number"
              ? entry.maxAmount
              : (entry.amount as number),
          placedAt: placedAt as Date,
          bidder: typeof entry.bidder === "string" ? entry.bidder : "You",
        },
      ];
    });
  } catch {
    return [];
  }
}
