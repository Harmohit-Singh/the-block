import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useNow } from "../hooks/useNow";
import { applyBids, applyBidsToAll, getBidHistory, type Bid } from "./bids";
import { useBids } from "./bidsStore";
import { VEHICLES, getNormalizedVehicle } from "./inventory";
import {
  getFilterBounds,
  searchVehicles,
  toggleFacetValue,
  type FacetKey,
  type FilterBounds,
  type Query,
  type SearchResult,
  type VehicleFilters,
} from "./query";
import { clearFilters, parseQuery, patchQuery, serializeQuery } from "./queryParams";
import type { Vehicle } from "./types";

/**
 * React bindings that compose the pure modules into the pipeline the UI uses:
 *
 *   inventory -> overlay bids -> search -> page of results
 *
 * Everything below is memoized glue. If any real logic ends up in this file,
 * it belongs in `query.ts` or `bids.ts` instead, where it can be tested.
 */

/**
 * The grid only needs to notice lots opening and closing, so it re-derives
 * twice a minute. Second-by-second countdowns are the detail page's job.
 */
const INVENTORY_TICK_MS = 30_000;
const DETAIL_TICK_MS = 1_000;

/** Every vehicle with live bid state applied. */
export function useLiveVehicles(tickMs = INVENTORY_TICK_MS): Vehicle[] {
  const { bids } = useBids();
  const now = useNow(tickMs);
  return useMemo(() => applyBidsToAll(VEHICLES, bids, now), [bids, now]);
}

export interface UseInventoryResult extends SearchResult {
  query: Query;
  bounds: FilterBounds;
  setSort: (sort: Query["sort"]) => void;
  setPage: (page: number) => void;
  toggleFacet: (facet: FacetKey, value: string) => void;
  setFilters: (patch: Partial<VehicleFilters>) => void;
  clearAll: () => void;
}

export function useInventory(): UseInventoryResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const vehicles = useLiveVehicles();

  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const result = useMemo(() => searchVehicles(vehicles, query), [vehicles, query]);
  const bounds = useMemo(() => getFilterBounds(vehicles), [vehicles]);

  const commit = useCallback(
    (next: Query, { push = false }: { push?: boolean } = {}) => {
      // Filter changes replace the history entry so Back leaves the inventory
      // instead of walking the buyer through every checkbox they ticked.
      // Paging is a real navigation, so it pushes.
      setSearchParams(serializeQuery(next), { replace: !push });
    },
    [setSearchParams],
  );

  const setSort = useCallback(
    (sort: Query["sort"]) => commit(patchQuery(query, { sort })),
    [commit, query],
  );

  const setPage = useCallback(
    (page: number) => commit(patchQuery(query, { page }), { push: true }),
    [commit, query],
  );

  const toggleFacet = useCallback(
    (facet: FacetKey, value: string) =>
      commit(patchQuery(query, { filters: toggleFacetValue(query.filters, facet, value) })),
    [commit, query],
  );

  const setFilters = useCallback(
    (patch: Partial<VehicleFilters>) => commit(patchQuery(query, { filters: patch })),
    [commit, query],
  );

  const clearAll = useCallback(() => commit(clearFilters(query)), [commit, query]);

  return {
    ...result,
    query,
    bounds,
    setSort,
    setPage,
    toggleFacet,
    setFilters,
    clearAll,
  };
}

/** A single vehicle with live bid state, for the detail route. */
export function useVehicle(id: string | undefined): Vehicle | undefined {
  const { bids } = useBids();
  const now = useNow(DETAIL_TICK_MS);

  return useMemo(() => {
    if (id === undefined) return undefined;
    const vehicle = getNormalizedVehicle(id);
    if (vehicle === undefined) return undefined;
    return applyBids(
      vehicle,
      bids.filter((bid) => bid.vehicleId === id),
      now,
    );
  }, [id, bids, now]);
}

/** This session's bids on one vehicle, newest first. */
export function useBidHistory(vehicleId: string | undefined): Bid[] {
  const { bids } = useBids();
  return useMemo(
    () => (vehicleId === undefined ? [] : getBidHistory(bids, vehicleId)),
    [bids, vehicleId],
  );
}
