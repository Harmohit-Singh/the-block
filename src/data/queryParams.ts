import {
  AUCTION_STATUSES,
  BODY_STYLES,
  DEFAULT_PAGE_SIZE,
  DRIVETRAINS,
  FUEL_TYPES,
  TITLE_STATUSES,
  TRANSMISSIONS,
} from "./constants";
import {
  DEFAULT_FILTERS,
  DEFAULT_QUERY,
  SORT_KEYS,
  type Query,
  type QueryInput,
  type SortKey,
  type VehicleFilters,
} from "./query";

/**
 * Translation between a `Query` and the URL.
 *
 * Holding search state in the URL rather than component state buys three
 * things for almost no cost: refresh and back-button work, and a buyer can
 * send someone a link to "Ontario SUVs under $20k".
 *
 * Both directions are pure so they can be round-tripped in tests.
 */

const PARAM = {
  makes: "make",
  models: "model",
  bodyStyles: "body",
  fuelTypes: "fuel",
  drivetrains: "drive",
  transmissions: "trans",
  titleStatuses: "title",
  provinces: "prov",
  statuses: "status",
  priceMin: "price_min",
  priceMax: "price_max",
  odometerMax: "odo_max",
  gradeMin: "grade_min",
  buyNowOnly: "buy_now",
  noReserveOnly: "no_reserve",
  sort: "sort",
  page: "page",
  pageSize: "size",
} as const;

/** Multi-select values ride as one comma-separated param to keep URLs short. */
function readList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Drops anything not in the closed set, so a hand-edited URL can't break the app. */
function readEnumList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  return readList(params, key).filter((value): value is T =>
    (allowed as readonly string[]).includes(value),
  );
}

function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function readBoolean(params: URLSearchParams, key: string): boolean {
  return params.get(key) === "1";
}

function readInt(params: URLSearchParams, key: string, fallback: number): number {
  const value = readNumber(params, key);
  if (value === null || !Number.isInteger(value) || value < 1) return fallback;
  return value;
}

export function parseQuery(params: URLSearchParams): Query {
  const sortParam = params.get(PARAM.sort);
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as SortKey)
    : DEFAULT_QUERY.sort;

  const filters: VehicleFilters = {
    makes: readList(params, PARAM.makes),
    models: readList(params, PARAM.models),
    bodyStyles: readEnumList(params, PARAM.bodyStyles, BODY_STYLES),
    fuelTypes: readEnumList(params, PARAM.fuelTypes, FUEL_TYPES),
    drivetrains: readEnumList(params, PARAM.drivetrains, DRIVETRAINS),
    transmissions: readEnumList(params, PARAM.transmissions, TRANSMISSIONS),
    titleStatuses: readEnumList(params, PARAM.titleStatuses, TITLE_STATUSES),
    provinces: readList(params, PARAM.provinces),
    statuses: readEnumList(params, PARAM.statuses, AUCTION_STATUSES),
    priceMin: readNumber(params, PARAM.priceMin),
    priceMax: readNumber(params, PARAM.priceMax),
    odometerMax: readNumber(params, PARAM.odometerMax),
    gradeMin: readNumber(params, PARAM.gradeMin),
    buyNowOnly: readBoolean(params, PARAM.buyNowOnly),
    noReserveOnly: readBoolean(params, PARAM.noReserveOnly),
  };

  return {
    filters,
    sort,
    page: readInt(params, PARAM.page, 1),
    pageSize: readInt(params, PARAM.pageSize, DEFAULT_PAGE_SIZE),
  };
}

/** Defaults are omitted so a browse with no filters leaves a clean URL. */
export function serializeQuery(query: Query): URLSearchParams {
  const params = new URLSearchParams();

  const listKeys = [
    "makes",
    "models",
    "bodyStyles",
    "fuelTypes",
    "drivetrains",
    "transmissions",
    "titleStatuses",
    "provinces",
    "statuses",
  ] as const;

  for (const key of listKeys) {
    const values = query.filters[key];
    if (values.length > 0) params.set(PARAM[key], values.join(","));
  }

  const numberKeys = [
    "priceMin",
    "priceMax",
    "odometerMax",
    "gradeMin",
  ] as const;

  for (const key of numberKeys) {
    const value = query.filters[key];
    if (value !== null) params.set(PARAM[key], String(value));
  }

  if (query.filters.buyNowOnly) params.set(PARAM.buyNowOnly, "1");
  if (query.filters.noReserveOnly) params.set(PARAM.noReserveOnly, "1");

  if (query.sort !== DEFAULT_QUERY.sort) params.set(PARAM.sort, query.sort);
  if (query.page > 1) params.set(PARAM.page, String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set(PARAM.pageSize, String(query.pageSize));
  }

  return params;
}

/**
 * Applies a partial change and resets to page 1.
 *
 * Any change to the result set invalidates the current page — staying on
 * page 4 while switching to a filter with two pages strands the buyer on an
 * empty screen.
 */
export function patchQuery(query: Query, patch: QueryInput): Query {
  const next: Query = {
    ...query,
    ...patch,
    filters: { ...query.filters, ...patch.filters },
  };

  const changedPage = patch.page !== undefined;
  return changedPage ? next : { ...next, page: 1 };
}

export function clearFilters(query: Query): Query {
  return { ...query, filters: { ...DEFAULT_FILTERS }, page: 1 };
}
