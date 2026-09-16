import { DEFAULT_PAGE_SIZE } from "./constants";
import type {
  AuctionStatus,
  BodyStyle,
  Drivetrain,
  FuelType,
  TitleStatus,
  Transmission,
  Vehicle,
} from "./types";

/**
 * The search engine: one pure function from (vehicles, query) to a page of
 * results plus facet counts.
 *
 * No React, no I/O, no clock. That keeps the interesting logic testable as
 * plain function calls, and means it could be lifted onto a server unchanged.
 */

export const SORT_KEYS = [
  "ending-soon",
  "price-asc",
  "price-desc",
  "year-desc",
  "odometer-asc",
  "grade-desc",
  "most-bids",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  "ending-soon": "Ending soonest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "year-desc": "Year: newest first",
  "odometer-asc": "Odometer: lowest first",
  "grade-desc": "Condition: best first",
  "most-bids": "Most bids",
};

export interface VehicleFilters {
  makes: string[];
  models: string[];
  bodyStyles: BodyStyle[];
  fuelTypes: FuelType[];
  drivetrains: Drivetrain[];
  transmissions: Transmission[];
  titleStatuses: TitleStatus[];
  provinces: string[];
  statuses: AuctionStatus[];
  priceMin: number | null;
  priceMax: number | null;
  odometerMax: number | null;
  gradeMin: number | null;
  buyNowOnly: boolean;
  noReserveOnly: boolean;
}

export interface Query {
  filters: VehicleFilters;
  sort: SortKey;
  /** 1-based. Clamped to the available range by `searchVehicles`. */
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: VehicleFilters = {
  makes: [],
  models: [],
  bodyStyles: [],
  fuelTypes: [],
  drivetrains: [],
  transmissions: [],
  titleStatuses: [],
  provinces: [],
  statuses: [],
  priceMin: null,
  priceMax: null,
  odometerMax: null,
  gradeMin: null,
  buyNowOnly: false,
  noReserveOnly: false,
};

export const DEFAULT_QUERY: Query = {
  filters: DEFAULT_FILTERS,
  sort: "ending-soon",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

/**
 * A partially specified query. `filters` is itself partial, so callers can
 * name only the filters they care about.
 */
export type QueryInput = Partial<Omit<Query, "filters">> & {
  filters?: Partial<VehicleFilters>;
};

/** Builds a complete query from a partial one, filling defaults. */
export function createQuery(partial: QueryInput = {}): Query {
  return {
    ...DEFAULT_QUERY,
    ...partial,
    filters: { ...DEFAULT_FILTERS, ...partial.filters },
  };
}

/** Facets we return counts for. Each maps to one named predicate below. */
export type FacetKey =
  | "make"
  | "model"
  | "bodyStyle"
  | "fuelType"
  | "drivetrain"
  | "transmission"
  | "titleStatus"
  | "province"
  | "status";

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

export interface SearchResult {
  /** The requested page of results. */
  results: Vehicle[];
  /** Matches across all pages. */
  total: number;
  page: number;
  pageCount: number;
  facets: Record<FacetKey, FacetValue[]>;
}

function includesIfAny<T>(selected: readonly T[], value: T): boolean {
  return selected.length === 0 || selected.includes(value);
}

/**
 * Filters as a keyed record rather than one `&&` chain.
 *
 * Naming each predicate is what makes accurate facet counts cheap: to count a
 * facet we re-run every predicate *except* that facet's own, so ticking "Ford"
 * does not zero out the counts beside every other make.
 */
function buildPredicates(
  filters: VehicleFilters,
): Record<string, (vehicle: Vehicle) => boolean> {
  return {
    make: (v) => includesIfAny(filters.makes, v.make),
    model: (v) => includesIfAny(filters.models, v.model),
    bodyStyle: (v) => includesIfAny(filters.bodyStyles, v.bodyStyle),
    fuelType: (v) => includesIfAny(filters.fuelTypes, v.fuelType),
    drivetrain: (v) => includesIfAny(filters.drivetrains, v.drivetrain),
    transmission: (v) => includesIfAny(filters.transmissions, v.transmission),
    titleStatus: (v) => includesIfAny(filters.titleStatuses, v.titleStatus),
    province: (v) => includesIfAny(filters.provinces, v.province),
    status: (v) => includesIfAny(filters.statuses, v.status),

    price: (v) =>
      (filters.priceMin === null || v.effectivePrice >= filters.priceMin) &&
      (filters.priceMax === null || v.effectivePrice <= filters.priceMax),
    odometer: (v) =>
      filters.odometerMax === null || v.odometerKm <= filters.odometerMax,
    grade: (v) => filters.gradeMin === null || v.conditionGrade >= filters.gradeMin,
    buyNow: (v) => !filters.buyNowOnly || v.hasBuyNow,
    noReserve: (v) => !filters.noReserveOnly || v.reservePrice === null,
  };
}

const FACET_ACCESSORS: Record<FacetKey, (vehicle: Vehicle) => string> = {
  make: (v) => v.make,
  model: (v) => v.model,
  bodyStyle: (v) => v.bodyStyle,
  fuelType: (v) => v.fuelType,
  drivetrain: (v) => v.drivetrain,
  transmission: (v) => v.transmission,
  titleStatus: (v) => v.titleStatus,
  province: (v) => v.province,
  status: (v) => v.status,
};

/** Which `VehicleFilters` array each facet reads from and writes to. */
export const FACET_FILTER_KEYS = {
  make: "makes",
  model: "models",
  bodyStyle: "bodyStyles",
  fuelType: "fuelTypes",
  drivetrain: "drivetrains",
  transmission: "transmissions",
  titleStatus: "titleStatuses",
  province: "provinces",
  status: "statuses",
} as const satisfies Record<FacetKey, keyof VehicleFilters>;

function selectedValues(filters: VehicleFilters, key: FacetKey): string[] {
  return filters[FACET_FILTER_KEYS[key]] as string[];
}

/**
 * Adds or removes one facet value.
 *
 * Lives here rather than in the UI so checkbox handling is a single tested
 * function instead of nine near-identical ones in the filter panel.
 */
export function toggleFacetValue(
  filters: VehicleFilters,
  facet: FacetKey,
  value: string,
): VehicleFilters {
  const filterKey = FACET_FILTER_KEYS[facet];
  const current = filters[filterKey] as string[];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];

  return { ...filters, [filterKey]: next } as VehicleFilters;
}

/**
 * Facets with a meaningful order are listed explicitly; the rest fall back to
 * most-results-first, which puts the useful options at the top of long lists.
 */
const FACET_VALUE_ORDER: Partial<Record<FacetKey, readonly string[]>> = {
  status: ["live", "upcoming", "ended"],
  titleStatus: ["clean", "rebuilt", "salvage"],
};

/**
 * "Ending soonest" means live lots closing first, then what opens next, with
 * finished lots last — sorting purely by end time would lead with dead lots.
 */
const STATUS_RANK: Record<AuctionStatus, number> = {
  live: 0,
  upcoming: 1,
  ended: 2,
};

const COMPARATORS: Record<SortKey, (a: Vehicle, b: Vehicle) => number> = {
  "ending-soon": (a, b) =>
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    a.auctionEnd.getTime() - b.auctionEnd.getTime(),
  "price-asc": (a, b) => a.effectivePrice - b.effectivePrice,
  "price-desc": (a, b) => b.effectivePrice - a.effectivePrice,
  "year-desc": (a, b) => b.year - a.year,
  "odometer-asc": (a, b) => a.odometerKm - b.odometerKm,
  "grade-desc": (a, b) => b.conditionGrade - a.conditionGrade,
  "most-bids": (a, b) => b.bidCount - a.bidCount,
};

/** Lot number breaks every tie, so result order never depends on input order. */
function compareWithTiebreak(sort: SortKey) {
  const comparator = COMPARATORS[sort];
  return (a: Vehicle, b: Vehicle): number =>
    comparator(a, b) || a.lot.localeCompare(b.lot);
}

function countFacet(
  pool: readonly Vehicle[],
  predicates: Record<string, (vehicle: Vehicle) => boolean>,
  key: FacetKey,
  selected: readonly string[],
): FacetValue[] {
  const others = Object.entries(predicates)
    .filter(([name]) => name !== key)
    .map(([, predicate]) => predicate);

  const accessor = FACET_ACCESSORS[key];
  const counts = new Map<string, number>();

  for (const vehicle of pool) {
    if (!others.every((predicate) => predicate(vehicle))) continue;
    const value = accessor(vehicle);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  // Keep selected values visible even at zero, or they become impossible to untick.
  for (const value of selected) {
    if (!counts.has(value)) counts.set(value, 0);
  }

  const canonicalOrder = FACET_VALUE_ORDER[key];
  const values = [...counts.entries()].map(([value, count]) => ({
    value,
    count,
    selected: selected.includes(value),
  }));

  values.sort((a, b) => {
    if (canonicalOrder) {
      // Anything unlisted sorts last rather than jumping to the front on -1.
      const rank = (value: string) => {
        const index = canonicalOrder.indexOf(value);
        return index === -1 ? Number.POSITIVE_INFINITY : index;
      };
      return rank(a.value) - rank(b.value);
    }
    return b.count - a.count || a.value.localeCompare(b.value);
  });

  return values;
}

export function searchVehicles(
  vehicles: readonly Vehicle[],
  query: Query,
): SearchResult {
  const predicates = buildPredicates(query.filters);
  const predicateList = Object.values(predicates);
  const matched = vehicles.filter((vehicle) =>
    predicateList.every((predicate) => predicate(vehicle)),
  );

  matched.sort(compareWithTiebreak(query.sort));

  const pageSize = Math.max(1, query.pageSize);
  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const start = (page - 1) * pageSize;

  const facets = Object.fromEntries(
    (Object.keys(FACET_ACCESSORS) as FacetKey[]).map((key) => [
      key,
      countFacet(vehicles, predicates, key, selectedValues(query.filters, key)),
    ]),
  ) as Record<FacetKey, FacetValue[]>;

  return {
    results: matched.slice(start, start + pageSize),
    total: matched.length,
    page,
    pageCount,
    facets,
  };
}

export interface FilterBounds {
  priceMin: number;
  priceMax: number;
  odometerMax: number;
}

/** Range-slider endpoints, derived from the data rather than hard-coded. */
export function getFilterBounds(vehicles: readonly Vehicle[]): FilterBounds {
  if (vehicles.length === 0) {
    return { priceMin: 0, priceMax: 0, odometerMax: 0 };
  }

  return vehicles.reduce<FilterBounds>(
    (bounds, vehicle) => ({
      priceMin: Math.min(bounds.priceMin, vehicle.effectivePrice),
      priceMax: Math.max(bounds.priceMax, vehicle.effectivePrice),
      odometerMax: Math.max(bounds.odometerMax, vehicle.odometerKm),
    }),
    {
      priceMin: Number.POSITIVE_INFINITY,
      priceMax: 0,
      odometerMax: 0,
    },
  );
}

/** Number of individual constraints narrowing the inventory. */
export function countActiveFilters(query: Query): number {
  return (Object.keys(DEFAULT_FILTERS) as Array<keyof VehicleFilters>).reduce(
    (count, key) => {
      const current = query.filters[key];
      if (Array.isArray(current)) return count + current.length;
      return count + Number(current !== DEFAULT_FILTERS[key]);
    },
    0,
  );
}

/** Whether anything is narrowing the inventory, for a "clear all" affordance. */
export function isFilterActive(query: Query): boolean {
  return countActiveFilters(query) > 0;
}
