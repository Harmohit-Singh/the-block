// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { minimumBid } from "../bids";
import { BidsProvider, useBids } from "../bidsStore";
import { BIDS_STORAGE_KEY } from "../constants";
import type { Vehicle } from "../types";
import { useInventory, useVehicle } from "../useInventory";

/**
 * Integration coverage for the React bindings.
 *
 * The pure modules are tested exhaustively elsewhere; what these tests protect
 * is the wiring that the unit tests cannot see — that the URL really is the
 * source of truth for the query, that a bid placed in one place is visible
 * everywhere, and that bids survive a remount.
 */

/**
 * Picks a lot that is unambiguously biddable.
 *
 * Choosing `results[0]` and inventing an amount is fragile: whichever lot sorts
 * first depends on the clock, and it may carry a Buy Now ceiling that a made-up
 * bid would breach. Asking the layer for the minimum valid bid on a lot with no
 * ceiling keeps these tests about wiring rather than about bid rules, which are
 * covered in `bids.test.ts`.
 */
function pickBiddable(results: Vehicle[]): { target: Vehicle; amount: number } {
  const target = results.find(
    (vehicle) => vehicle.status !== "ended" && vehicle.buyNowPrice === null,
  );
  if (!target) throw new Error("No biddable lot on the first page of results");
  return { target, amount: minimumBid(target) };
}

function wrapper(initialUrl: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialUrl]}>
        <BidsProvider>{children}</BidsProvider>
      </MemoryRouter>
    );
  };
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("useInventory", () => {
  it("returns the full inventory for a bare URL", () => {
    const { result } = renderHook(() => useInventory(), { wrapper: wrapper("/") });

    expect(result.current.total).toBe(200);
    expect(result.current.results).toHaveLength(24);
    expect(result.current.pageCount).toBe(9);
  });

  it("reads the query out of the URL on first render", () => {
    const { result } = renderHook(() => useInventory(), {
      wrapper: wrapper("/?make=Tesla"),
    });

    expect(result.current.query.filters.makes).toEqual(["Tesla"]);
    expect(result.current.results.every((v) => v.make === "Tesla")).toBe(true);
  });

  it("narrows results when a facet is toggled", () => {
    const { result } = renderHook(() => useInventory(), { wrapper: wrapper("/") });

    act(() => result.current.toggleFacet("make", "Tesla"));

    expect(result.current.total).toBeLessThan(200);
    expect(result.current.total).toBeGreaterThan(0);
    expect(result.current.results.every((v) => v.make === "Tesla")).toBe(true);
  });

  it("returns to page 1 when a filter changes", () => {
    const { result } = renderHook(() => useInventory(), { wrapper: wrapper("/?page=4") });
    expect(result.current.page).toBe(4);

    act(() => result.current.toggleFacet("bodyStyle", "truck"));

    expect(result.current.page).toBe(1);
  });

  it("clears all filters together", () => {
    const { result } = renderHook(() => useInventory(), {
      wrapper: wrapper("/?make=Ford&buy_now=1"),
    });
    expect(result.current.total).toBeLessThan(200);

    act(() => result.current.clearAll());

    expect(result.current.total).toBe(200);
  });

  it("derives filter bounds from the real dataset", () => {
    const { result } = renderHook(() => useInventory(), { wrapper: wrapper("/") });

    expect(result.current.bounds.priceMin).toBeGreaterThan(0);
    expect(result.current.bounds.priceMax).toBeGreaterThan(result.current.bounds.priceMin);
    expect(result.current.bounds.odometerMax).toBeGreaterThan(0);
  });
});

describe("bidding through the store", () => {
  it("stores a private max while committing only the minimum bid", () => {
    const { result } = renderHook(
      () => ({ inventory: useInventory(), bids: useBids() }),
      { wrapper: wrapper("/") },
    );

    const { target, amount } = pickBiddable(result.current.inventory.results);
    const maxAmount = amount + 5_000;

    act(() => {
      expect(result.current.bids.placeMaxBid(target, maxAmount).ok).toBe(true);
    });

    const placed = result.current.bids.bids.at(-1);
    const after = result.current.inventory.results.find((v) => v.id === target.id);
    expect(placed).toMatchObject({ amount, maxAmount });
    expect(after?.effectivePrice).toBe(amount);
  });

  it("shows a new bid in the inventory list, not just on the vehicle", () => {
    const { result } = renderHook(
      () => {
        const inventory = useInventory();
        return { inventory, bids: useBids() };
      },
      { wrapper: wrapper("/") },
    );

    const { target, amount } = pickBiddable(result.current.inventory.results);

    act(() => {
      expect(result.current.bids.placeBid(target, amount).ok).toBe(true);
    });

    const after = result.current.inventory.results.find((v) => v.id === target.id);
    expect(after?.effectivePrice).toBe(amount);
    expect(after?.bidCount).toBe(target.bidCount + 1);
  });

  it("keeps the list and the detail view in agreement", () => {
    const { result } = renderHook(
      () => {
        const inventory = useInventory();
        return {
          inventory,
          // Same lot the assertions bid on, viewed through the detail hook.
          detail: useVehicle(pickBiddable(inventory.results).target.id),
          bids: useBids(),
        };
      },
      { wrapper: wrapper("/") },
    );

    const { target, amount } = pickBiddable(result.current.inventory.results);

    act(() => {
      expect(result.current.bids.placeBid(target, amount).ok).toBe(true);
    });

    const listed = result.current.inventory.results.find((v) => v.id === target.id);
    expect(result.current.detail?.effectivePrice).toBe(amount);
    expect(listed?.effectivePrice).toBe(amount);
  });

  it("rejects an invalid bid without changing the price", () => {
    const { result } = renderHook(
      () => ({ inventory: useInventory(), bids: useBids() }),
      { wrapper: wrapper("/") },
    );

    const target = result.current.inventory.results[0];
    let outcome: { ok: boolean } | undefined;

    act(() => {
      outcome = result.current.bids.placeBid(target, 1);
    });

    expect(outcome?.ok).toBe(false);
    const after = result.current.inventory.results.find((v) => v.id === target.id);
    expect(after?.effectivePrice).toBe(target.effectivePrice);
  });

  it("persists bids across a remount", () => {
    const first = renderHook(
      () => ({ inventory: useInventory(), bids: useBids() }),
      { wrapper: wrapper("/") },
    );

    const { target, amount } = pickBiddable(first.result.current.inventory.results);

    act(() => {
      expect(first.result.current.bids.placeBid(target, amount).ok).toBe(true);
    });
    first.unmount();

    expect(window.localStorage.getItem(BIDS_STORAGE_KEY)).toContain(target.id);

    const second = renderHook(() => useVehicle(target.id), { wrapper: wrapper("/") });
    expect(second.result.current?.effectivePrice).toBe(amount);
  });

  it("starts clean when stored bids are corrupt", () => {
    window.localStorage.setItem(BIDS_STORAGE_KEY, "{ not json");

    const { result } = renderHook(() => useInventory(), { wrapper: wrapper("/") });

    expect(result.current.total).toBe(200);
  });
});