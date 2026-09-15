/**
 * Public surface of the data layer.
 *
 * UI code should import from `@/data` (this file) and never reach into the
 * individual modules — that keeps the internal layout free to change and makes
 * the boundary obvious in review.
 */

export type {
  AuctionStatus,
  BodyStyle,
  Drivetrain,
  FuelType,
  NormalizedVehicle,
  ReserveState,
  TitleStatus,
  Transmission,
  Vehicle,
} from "./types";

export {
  AUCTION_DURATION_HOURS,
  AUCTION_STATUSES,
  BODY_STYLES,
  DEFAULT_PAGE_SIZE,
  DRIVETRAINS,
  FUEL_TYPES,
  TITLE_STATUSES,
  TRANSMISSIONS,
} from "./constants";

export { VEHICLES, getNormalizedVehicle } from "./inventory";

export {
  applyBids,
  applyBidsToAll,
  bidIncrement,
  deriveAuctionStatus,
  deriveReserveState,
  getBidHistory,
  initialProxyBid,
  minimumBid,
  validateBid,
  type Bid,
  type BidRejectionCode,
  type BidValidation,
} from "./bids";

export { BidsProvider, useBids } from "./bidsStore";

export {
  DEFAULT_FILTERS,
  DEFAULT_QUERY,
  FACET_FILTER_KEYS,
  SORT_KEYS,
  SORT_LABELS,
  createQuery,
  getFilterBounds,
  isFilterActive,
  searchVehicles,
  toggleFacetValue,
  type FacetKey,
  type FacetValue,
  type FilterBounds,
  type Query,
  type SearchResult,
  type SortKey,
  type VehicleFilters,
} from "./query";

export { clearFilters, parseQuery, patchQuery, serializeQuery } from "./queryParams";

export {
  useBidHistory,
  useInventory,
  useLiveVehicles,
  useVehicle,
  type UseInventoryResult,
} from "./useInventory";
