import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  bidsReducer,
  deserializeBids,
  initialProxyBid,
  serializeBids,
  validateBid,
  type Bid,
  type BidValidation,
} from "./bids";
import { BIDS_STORAGE_KEY } from "./constants";
import type { Vehicle } from "./types";

/**
 * React wiring around the bid log. All the logic lives in `bids.ts`; this file
 * only owns the reducer instance, persistence, and context plumbing.
 *
 * One provider at the app root is what guarantees the inventory grid and the
 * detail page can never show different numbers for the same lot.
 */

interface BidsContextValue {
  bids: Bid[];
  /** Validates, then appends on success. Returns the outcome for the UI. */
  placeBid: (vehicle: Vehicle, amount: number) => BidValidation;
  /** Stores a private ceiling while committing only the minimum valid bid. */
  placeMaxBid: (vehicle: Vehicle, maxAmount: number) => BidValidation;
  retractBid: (bidId: string) => void;
  clearBids: () => void;
}

const BidsContext = createContext<BidsContextValue | null>(null);

/** Prototype stand-in: the challenge explicitly does not require accounts. */
const CURRENT_BIDDER = "You";

function readPersistedBids(): Bid[] {
  if (typeof window === "undefined") return [];
  try {
    return deserializeBids(window.localStorage.getItem(BIDS_STORAGE_KEY));
  } catch {
    // Private browsing and disabled storage both throw on access.
    return [];
  }
}

export function BidsProvider({ children }: { children: ReactNode }) {
  const [bids, dispatch] = useReducer(bidsReducer, undefined, readPersistedBids);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(BIDS_STORAGE_KEY, serializeBids(bids));
    } catch {
      // A full or unavailable quota must not break bidding; bids stay in memory.
    }
  }, [bids]);

  const placeBid = useCallback(
    (vehicle: Vehicle, amount: number): BidValidation => {
      // Re-validated here rather than trusting the caller, so the log can only
      // ever contain bids that passed the same rules the form displayed.
      const validation = validateBid(vehicle, amount);
      if (!validation.ok) return validation;

      dispatch({
        type: "place",
        bid: {
          id: crypto.randomUUID(),
          vehicleId: vehicle.id,
          amount,
          maxAmount: amount,
          placedAt: new Date(),
          bidder: CURRENT_BIDDER,
        },
      });

      return validation;
    },
    [],
  );

  const placeMaxBid = useCallback(
    (vehicle: Vehicle, maxAmount: number): BidValidation => {
      const validation = validateBid(vehicle, maxAmount);
      if (!validation.ok) return validation;

      dispatch({
        type: "place",
        bid: {
          id: crypto.randomUUID(),
          vehicleId: vehicle.id,
          amount: initialProxyBid(vehicle, maxAmount),
          maxAmount,
          placedAt: new Date(),
          bidder: CURRENT_BIDDER,
        },
      });

      return validation;
    },
    [],
  );

  const retractBid = useCallback((bidId: string) => {
    dispatch({ type: "retract", bidId });
  }, []);

  const clearBids = useCallback(() => dispatch({ type: "reset" }), []);

  const value = useMemo<BidsContextValue>(
    () => ({ bids, placeBid, placeMaxBid, retractBid, clearBids }),
    [bids, placeBid, placeMaxBid, retractBid, clearBids],
  );

  return <BidsContext.Provider value={value}>{children}</BidsContext.Provider>;
}

export function useBids(): BidsContextValue {
  const context = useContext(BidsContext);
  if (context === null) {
    throw new Error("useBids must be used within a <BidsProvider>");
  }
  return context;
}
