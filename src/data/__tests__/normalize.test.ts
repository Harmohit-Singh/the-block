import { describe, expect, it } from "vitest";
import { deriveAuctionStatus } from "../bids";
import { AUCTION_DURATION_HOURS, REBASE_WINDOW_OFFSET_DAYS } from "../constants";
import {
  calculateScheduleShiftDays,
  normalizeVehicles,
  parseLocalDateTime,
} from "../normalize";
import { VEHICLES } from "../inventory";
import { NOW, makeRaw } from "./factories";

describe("parseLocalDateTime", () => {
  it("reads the timestamp as local wall-clock time", () => {
    const parsed = parseLocalDateTime("2026-04-05T14:00:00");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(3);
    expect(parsed.getDate()).toBe(5);
    expect(parsed.getHours()).toBe(14);
  });

  it("rejects a timestamp it does not recognise", () => {
    expect(() => parseLocalDateTime("2026-04-05")).toThrow(/Unrecognised/);
  });
});

describe("calculateScheduleShiftDays", () => {
  it("lands now inside the auction window rather than at its edge", () => {
    const raw = [makeRaw({ auction_start: "2026-09-01T09:00:00" })];
    const [normalized] = normalizeVehicles(raw, NOW);
    const daysIntoWindow =
      (NOW.getTime() - normalized.auctionStart.getTime()) / 86_400_000;

    // Rounding to whole days makes the offset a range, not an exact figure:
    // the earliest lot opened between one and two days ago.
    expect(daysIntoWindow).toBeGreaterThan(REBASE_WINDOW_OFFSET_DAYS - 1);
    expect(daysIntoWindow).toBeLessThanOrEqual(REBASE_WINDOW_OFFSET_DAYS);
  });

  it("shifts by a whole number of days", () => {
    const shift = calculateScheduleShiftDays(
      [makeRaw({ auction_start: "2026-09-01T09:00:00" })],
      NOW,
    );

    expect(Number.isInteger(shift)).toBe(true);
  });

  it("returns zero for an empty dataset rather than -Infinity", () => {
    expect(calculateScheduleShiftDays([], NOW)).toBe(0);
  });
});

describe("normalizeVehicles", () => {
  it("preserves the local time of day when rebasing", () => {
    const raw = [
      makeRaw({ auction_start: "2026-04-05T09:00:00" }),
      makeRaw({ auction_start: "2026-04-07T20:00:00" }),
    ];

    const normalized = normalizeVehicles(raw, NOW);

    expect(normalized.map((v) => v.auctionStart.getHours())).toEqual([9, 20]);
  });

  it("shifts every vehicle by the same offset, preserving order and spacing", () => {
    const raw = [
      makeRaw({ auction_start: "2026-04-01T10:00:00" }),
      makeRaw({ auction_start: "2026-04-04T10:00:00" }),
      makeRaw({ auction_start: "2026-04-07T10:00:00" }),
    ];

    const [first, second, third] = normalizeVehicles(raw, NOW);
    const gapOne = second.auctionStart.getTime() - first.auctionStart.getTime();
    const gapTwo = third.auctionStart.getTime() - second.auctionStart.getTime();

    expect(gapOne).toBe(3 * 86_400_000);
    expect(gapTwo).toBe(3 * 86_400_000);
  });

  it("derives an auction end, which the source data does not provide", () => {
    const [vehicle] = normalizeVehicles([makeRaw()], NOW);
    const hours =
      (vehicle.auctionEnd.getTime() - vehicle.auctionStart.getTime()) / 3_600_000;

    expect(hours).toBe(AUCTION_DURATION_HOURS);
  });

  it("maps snake_case source fields onto the camelCase shape", () => {
    const [vehicle] = normalizeVehicles(
      [makeRaw({ odometer_km: 1234, title_status: "salvage", current_bid: 9_000, bid_count: 4 })],
      NOW,
    );

    expect(vehicle.odometerKm).toBe(1234);
    expect(vehicle.titleStatus).toBe("salvage");
    expect(vehicle.seedCurrentBid).toBe(9_000);
    expect(vehicle.seedBidCount).toBe(4);
  });

  it("builds the vehicle display name", () => {
    const [vehicle] = normalizeVehicles(
      [makeRaw({ year: 2023, make: "Ford", model: "Bronco", trim: "Big Bend", city: "Toronto" })],
      NOW,
    );

    expect(vehicle.displayName).toBe("2023 Ford Bronco Big Bend");
  });
});

describe("the real dataset", () => {
  it("normalizes all 200 records", () => {
    expect(VEHICLES).toHaveLength(200);
  });

  it("rebases the window so all three auction states are represented", () => {
    const now = new Date();
    const counts = { upcoming: 0, live: 0, ended: 0 };
    for (const vehicle of VEHICLES) {
      counts[deriveAuctionStatus(vehicle, now)] += 1;
    }

    expect(counts.live).toBeGreaterThan(0);
    expect(counts.upcoming).toBeGreaterThan(0);
    expect(counts.ended).toBeGreaterThan(0);
  });

  it("keeps most of the inventory biddable", () => {
    const now = new Date();
    const biddable = VEHICLES.filter(
      (vehicle) => deriveAuctionStatus(vehicle, now) !== "ended",
    );

    expect(biddable.length).toBeGreaterThan(VEHICLES.length / 2);
  });

  it("keeps every auction start within realistic hours", () => {
    const hours = new Set(VEHICLES.map((v) => v.auctionStart.getHours()));
    for (const hour of hours) {
      expect(hour).toBeGreaterThanOrEqual(9);
      expect(hour).toBeLessThanOrEqual(20);
    }
  });

  it("gives every vehicle a unique id and lot", () => {
    expect(new Set(VEHICLES.map((v) => v.id)).size).toBe(200);
    expect(new Set(VEHICLES.map((v) => v.lot)).size).toBe(200);
  });
});
