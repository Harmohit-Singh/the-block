import {
  FACET_FILTER_KEYS,
  isFilterActive,
  type FacetKey,
  type UseInventoryResult,
} from "../data";
import { formatCurrency, formatOdometer } from "../lib/format";
import { CloseIcon } from "./icons";

/**
 * Removable chips for everything currently narrowing the inventory.
 *
 * The sidebar can be scrolled away or closed on mobile, so without this a
 * buyer can end up staring at four results with no visible reason why. Each
 * chip is individually removable, which is faster than hunting for the
 * checkbox that caused it.
 */

interface Chip {
  id: string;
  label: string;
  remove: () => void;
}

const FACETS_WITH_CHIPS: FacetKey[] = [
  "status",
  "make",
  "model",
  "bodyStyle",
  "province",
  "titleStatus",
  "drivetrain",
  "fuelType",
];

export function ActiveFilters({ inventory }: { inventory: UseInventoryResult }) {
  const { query, toggleFacet, setFilters, clearAll } = inventory;
  const { filters } = query;
  const chips: Chip[] = [];

  for (const facet of FACETS_WITH_CHIPS) {
    for (const value of filters[FACET_FILTER_KEYS[facet]] as string[]) {
      chips.push({
        id: `${facet}:${value}`,
        label: value,
        remove: () => toggleFacet(facet, value),
      });
    }
  }

  if (filters.priceMin !== null || filters.priceMax !== null) {
    const min = filters.priceMin === null ? null : formatCurrency(filters.priceMin);
    const max = filters.priceMax === null ? null : formatCurrency(filters.priceMax);
    chips.push({
      id: "price",
      label: min && max ? `${min} – ${max}` : min ? `${min}+` : `Under ${max}`,
      remove: () => setFilters({ priceMin: null, priceMax: null }),
    });
  }

  if (filters.gradeMin !== null) {
    chips.push({
      id: "grade",
      label: `Grade ${filters.gradeMin.toFixed(1)}+`,
      remove: () => setFilters({ gradeMin: null }),
    });
  }

  if (filters.odometerMax !== null) {
    chips.push({
      id: "odometer",
      label: `Under ${formatOdometer(filters.odometerMax)}`,
      remove: () => setFilters({ odometerMax: null }),
    });
  }

  if (filters.buyNowOnly) {
    chips.push({
      id: "buy-now",
      label: "Buy Now available",
      remove: () => setFilters({ buyNowOnly: false }),
    });
  }

  if (filters.noReserveOnly) {
    chips.push({
      id: "no-reserve",
      label: "No reserve",
      remove: () => setFilters({ noReserveOnly: false }),
    });
  }

  if (!isFilterActive(query)) return null;

  return (
    <div className="chips">
      {chips.map((chip) => (
        <span key={chip.id} className="chip">
          {chip.label}
          <button type="button" onClick={chip.remove} aria-label={`Remove filter ${chip.label}`}>
            <CloseIcon size={13} />
          </button>
        </span>
      ))}

      {chips.length > 1 ? (
        <button type="button" className="chip chip--clear" onClick={clearAll}>
          Clear all
        </button>
      ) : null}
    </div>
  );
}
