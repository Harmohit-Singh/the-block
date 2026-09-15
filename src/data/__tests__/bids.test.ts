import { describe, expect, it } from "vitest";
import {
  applyBids,
  applyBidsToAll,
  bidIncrement,
  bidsReducer,
  deriveAuctionStatus,
  deserializeBids,
  getBidHistory,
  initialProxyBid,
  minimumBid,
  serializeBids,
  validateBid,
  type Bid,
} from "../bids";
import { NOW, makeNormalized, makeVehicle } from "./factories";

function makeBid(overrides: Partial<Bid> = {}): Bid {
  return {
    id: "bid-1",
    vehicleId: "vehicle-1",
    amount: 20_000,
    maxAmount: 20_000,
    placedAt: NOW,
    bidder: "You",
    ...overrides,
  };
}

describe("bidIncrement", () => {
  it("steps up more coarsely as the price rises", () => {
    expect(bidIncrement(2_000)).toBe(100);
    expect(bidIncrement(10_000)).toBe(250);
    expect(bidIncrement(30_000)).toBe(500);
    expect(bidIncrement(80_000)).toBe(1_000);
  });

  it("uses the next tier exactly at a boundary", () => {
    expect(bidIncrement(5_000)).toBe(250);
    expect(bidIncrement(20_000)).toBe(500);
  });
});

describe("minimumBid", () => {
  it("opens at the seller's starting bid when nobody has bid", () => {
    const vehicle = makeVehicle({ startingBid: 14_500, seedCurrentBid: null });
    expect(minimumBid(vehicle)).toBe(14_500);
  });

  it("requires one increment over the current bid afterwards", () => {
    const vehicle = makeVehicle({ startingBid: 14_500, seedCurrentBid: 22_800 });
    expect(minimumBid(vehicle)).toBe(23_300);
  });
});

describe("initialProxyBid", () => {
  it("commits only the opening bid while retaining a higher ceiling", () => {
    const vehicle = makeVehicle({ startingBid: 14_500, seedCurrentBid: null });
    expect(initialProxyBid(vehicle, 25_000)).toBe(14_500);
  });

  it("commits one increment over an existing competing bid", () => {
    const vehicle = makeVehicle({ seedCurrentBid: 22_800 });
    expect(initialProxyBid(vehicle, 30_000)).toBe(23_300);
  });
});

describe("applyBids", () => {
  it("falls back to the starting bid when there is no current bid", () => {
    const vehicle = applyBids(
      makeNormalized({ startingBid: 14_500, seedCurrentBid: null }),
      [],
      NOW,
    );

    expect(vehicle.currentBid).toBeNull();
    expect(vehicle.effectivePrice).toBe(14_500);
  });

  it("uses the session bid once it beats the seed", () => {
    const normalized = makeNormalized({ startingBid: 10_000, seedCurrentBid: 12_000, seedBidCount: 3 });
    const vehicle = applyBids(normalized, [makeBid({ amount: 15_000 })], NOW);

    expect(vehicle.currentBid).toBe(15_000);
    expect(vehicle.effectivePrice).toBe(15_000);
    expect(vehicle.bidCount).toBe(4);
  });

  it("never lets a lower session bid pull the price down", () => {
    const normalized = makeNormalized({ seedCurrentBid: 30_000 });
    const vehicle = applyBids(normalized, [makeBid({ amount: 1_000 })], NOW);

    expect(vehicle.currentBid).toBe(30_000);
  });

  it("reports reserve state without exposing the reserve", () => {
    const noReserve = applyBids(makeNormalized({ reservePrice: null }), [], NOW);
    const notMet = applyBids(
      makeNormalized({ reservePrice: 25_000, startingBid: 14_500, seedCurrentBid: null }),
      [],
      NOW,
    );
    const met = applyBids(
      makeNormalized({ reservePrice: 25_000, seedCurrentBid: 26_000 }),
      [],
      NOW,
    );

    expect(noReserve.reserveState).toBe("none");
    expect(notMet.reserveState).toBe("not-met");
    expect(met.reserveState).toBe("met");
  });

  it("flags whether a Buy Now price exists", () => {
    expect(makeVehicle({ buyNowPrice: null }).hasBuyNow).toBe(false);
    expect(makeVehicle({ buyNowPrice: 30_000 }).hasBuyNow).toBe(true);
  });
});

describe("deriveAuctionStatus", () => {
  const window = {
    auctionStart: new Date(2026, 8, 14, 10, 0, 0),
    auctionEnd: new Date(2026, 8, 16, 10, 0, 0),
  };

  it("classifies a lot against the current time", () => {
    expect(deriveAuctionStatus(window, new Date(2026, 8, 13))).toBe("upcoming");
    expect(deriveAuctionStatus(window, new Date(2026, 8, 15))).toBe("live");
    expect(deriveAuctionStatus(window, new Date(2026, 8, 17))).toBe("ended");
  });

  it("treats the opening instant as live and the closing instant as ended", () => {
    expect(deriveAuctionStatus(window, window.auctionStart)).toBe("live");
    expect(deriveAuctionStatus(window, window.auctionEnd)).toBe("ended");
  });
});

describe("applyBidsToAll", () => {
  it("routes each bid to its own vehicle", () => {
    const first = makeNormalized({ id: "a", seedCurrentBid: null, startingBid: 5_000 });
    const second = makeNormalized({ id: "b", seedCurrentBid: null, startingBid: 7_000 });

    const [a, b] = applyBidsToAll(
      [first, second],
      [makeBid({ vehicleId: "a", amount: 9_000 })],
      NOW,
    );

    expect(a.currentBid).toBe(9_000);
    expect(b.currentBid).toBeNull();
  });
});

describe("validateBid", () => {
  it("accepts a bid at exactly the minimum", () => {
    const vehicle = makeVehicle({ startingBid: 14_500, seedCurrentBid: null });
    expect(validateBid(vehicle, 14_500)).toEqual({ ok: true });
  });

  it("rejects a bid below the minimum", () => {
    const vehicle = makeVehicle({ startingBid: 14_500, seedCurrentBid: null });
    const result = validateBid(vehicle, 14_499);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.code).toBe("below-minimum");
  });

  it("rejects bids on a closed lot", () => {
    const vehicle = makeVehicle({
      auctionStart: new Date(2026, 7, 1, 9, 0, 0),
      auctionEnd: new Date(2026, 7, 3, 9, 0, 0),
    });
    const result = validateBid(vehicle, 99_000);

    expect(result.ok === false && result.code).toBe("auction-ended");
  });

  it("allows a pre-bid on a lot that has not opened yet", () => {
    const vehicle = makeVehicle({
      auctionStart: new Date(2026, 9, 1, 9, 0, 0),
      auctionEnd: new Date(2026, 9, 3, 9, 0, 0),
      startingBid: 10_000,
      seedCurrentBid: null,
    });

    expect(validateBid(vehicle, 10_000).ok).toBe(true);
  });

  it("rejects fractional and non-positive amounts", () => {
    const vehicle = makeVehicle({ startingBid: 1_000, seedCurrentBid: null });

    expect(validateBid(vehicle, 1_000.5).ok).toBe(false);
    expect(validateBid(vehicle, 0).ok).toBe(false);
    expect(validateBid(vehicle, Number.NaN).ok).toBe(false);
  });

  it("sends buyers at or above the Buy Now price to Buy Now instead", () => {
    const vehicle = makeVehicle({
      startingBid: 10_000,
      seedCurrentBid: null,
      buyNowPrice: 30_000,
    });
    const result = validateBid(vehicle, 30_000);

    expect(result.ok === false && result.code).toBe("at-or-above-buy-now");
  });
});

describe("bidsReducer", () => {
  it("appends, retracts, and resets without mutating the previous state", () => {
    const initial: Bid[] = [];
    const placed = bidsReducer(initial, { type: "place", bid: makeBid({ id: "x" }) });

    expect(initial).toHaveLength(0);
    expect(placed).toHaveLength(1);
    expect(bidsReducer(placed, { type: "retract", bidId: "x" })).toHaveLength(0);
    expect(bidsReducer(placed, { type: "reset" })).toHaveLength(0);
  });
});

describe("getBidHistory", () => {
  it("returns one vehicle's bids, newest first", () => {
    const bids = [
      makeBid({ id: "1", vehicleId: "a", placedAt: new Date(2026, 8, 14, 9) }),
      makeBid({ id: "2", vehicleId: "b", placedAt: new Date(2026, 8, 14, 10) }),
      makeBid({ id: "3", vehicleId: "a", placedAt: new Date(2026, 8, 14, 11) }),
    ];

    expect(getBidHistory(bids, "a").map((bid) => bid.id)).toEqual(["3", "1"]);
  });
});

describe("bid persistence", () => {
  it("round-trips through storage, restoring Date objects", () => {
    const bids = [makeBid({ id: "abc", amount: 18_250 })];
    const restored = deserializeBids(serializeBids(bids));

    expect(restored).toHaveLength(1);
    expect(restored[0].amount).toBe(18_250);
    expect(restored[0].maxAmount).toBe(20_000);
    expect(restored[0].placedAt).toBeInstanceOf(Date);
    expect(restored[0].placedAt.getTime()).toBe(NOW.getTime());
  });

  it("degrades to an empty log rather than throwing on bad data", () => {
    expect(deserializeBids(null)).toEqual([]);
    expect(deserializeBids("not json")).toEqual([]);
    expect(deserializeBids('{"not":"an array"}')).toEqual([]);
  });

  it("drops individual malformed entries but keeps the good ones", () => {
    const payload = JSON.stringify([
      { id: "ok", vehicleId: "v", amount: 100, placedAt: NOW.toISOString(), bidder: "You" },
      { id: "bad", vehicleId: "v", amount: "lots", placedAt: NOW.toISOString() },
      { id: "also-bad", vehicleId: "v", amount: 100, placedAt: "nonsense" },
    ]);

    const restored = deserializeBids(payload);
    expect(restored.map((bid) => bid.id)).toEqual(["ok"]);
  });

  it("restores old direct bids with their amount as the maximum", () => {
    const payload = JSON.stringify([
      { id: "old", vehicleId: "v", amount: 100, placedAt: NOW.toISOString(), bidder: "You" },
    ]);

    expect(deserializeBids(payload)[0].maxAmount).toBe(100);
  });
});
