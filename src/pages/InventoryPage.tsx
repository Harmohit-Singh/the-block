import { useEffect, useState } from "react";
import { ActiveFilters } from "../components/ActiveFilters";
import { FilterPanel } from "../components/FilterPanel";
import { Pagination } from "../components/Pagination";
import { VehicleCard } from "../components/VehicleCard";
import { CloseIcon, SlidersIcon } from "../components/icons";
import {
  SORT_KEYS,
  SORT_LABELS,
  isFilterActive,
  useInventory,
  type SortKey,
} from "../data";

/**
 * The buyer's main view: browse, search, filter, and sort the lane.
 *
 * All state lives in the URL via `useInventory`, so this component holds only
 * the mobile drawer's open/closed flag.
 */
export function InventoryPage() {
  const inventory = useInventory();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = countActiveFilters(inventory);

  return (
    <>
      <div className="page">
        <aside className="filters filters--sidebar" aria-label="Filters">
          <div className="filters__head">
            <h2>Filters</h2>
            {isFilterActive(inventory.query) ? (
              <button type="button" className="btn btn--link" onClick={inventory.clearAll}>
                Clear all
              </button>
            ) : null}
          </div>
          <FilterPanel inventory={inventory} />
        </aside>

        <main>
          <div className="toolbar">
            <button
              type="button"
              className="filters-trigger"
              onClick={() => setDrawerOpen(true)}
            >
              <SlidersIcon size={16} />
              Filters
              {activeCount > 0 ? (
                <span className="filters-trigger__badge">{activeCount}</span>
              ) : null}
            </button>

            <p className="toolbar__count" aria-live="polite">
              <strong className="numeric">{inventory.total.toLocaleString("en-CA")}</strong>{" "}
              {inventory.total === 1 ? "vehicle" : "vehicles"}
            </p>

            <span className="toolbar__spacer" />

            <label className="sr-only" htmlFor="sort">
              Sort results
            </label>
            <select
              id="sort"
              className="select"
              value={inventory.query.sort}
              onChange={(event) => inventory.setSort(event.target.value as SortKey)}
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <ActiveFilters inventory={inventory} />

          {inventory.total === 0 ? (
            <EmptyState onClear={inventory.clearAll} />
          ) : (
            <>
              <ul className="grid">
                {inventory.results.map((vehicle, index) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    // The first row is above the fold on every breakpoint, so
                    // those images should not wait for the lazy observer.
                    eagerImage={index < 3}
                  />
                ))}
              </ul>

              <Pagination
                page={inventory.page}
                pageCount={inventory.pageCount}
                onChange={(page) => {
                  inventory.setPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </main>
      </div>

      {drawerOpen ? (
        <FilterDrawer inventory={inventory} onClose={() => setDrawerOpen(false)} />
      ) : null}
    </>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="empty">
      <h2>No vehicles match those filters</h2>
      <p>
        Try widening your price range or removing a filter. Every filter option shows how many
        vehicles it would return.
      </p>
      <button type="button" className="btn btn--primary" onClick={onClear}>
        Clear all filters
      </button>
    </div>
  );
}

/**
 * Mobile filter drawer.
 *
 * Filters apply immediately rather than behind an "Apply" button, so the
 * result count in the footer updates as the buyer works and doubles as the
 * confirmation that dismisses the drawer.
 */
function FilterDrawer({
  inventory,
  onClose,
}: {
  inventory: ReturnType<typeof useInventory>;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);

    // Stop the page behind the drawer from scrolling with it.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Filters">
        <div className="drawer__head">
          <h2>Filters</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close filters">
            <CloseIcon size={19} />
          </button>
        </div>

        <div className="drawer__body">
          <div className="filters">
            <FilterPanel inventory={inventory} />
          </div>
        </div>

        <div className="drawer__foot">
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            Show {inventory.total.toLocaleString("en-CA")}{" "}
            {inventory.total === 1 ? "vehicle" : "vehicles"}
          </button>
        </div>
      </div>
    </>
  );
}

/** Chip count for the mobile trigger badge. */
function countActiveFilters({ query }: ReturnType<typeof useInventory>): number {
  const { filters } = query;
  const listTotal = [
    filters.makes,
    filters.models,
    filters.bodyStyles,
    filters.fuelTypes,
    filters.drivetrains,
    filters.transmissions,
    filters.titleStatuses,
    filters.provinces,
    filters.statuses,
  ].reduce((total, list) => total + list.length, 0);

  const scalars = [
    filters.yearMin,
    filters.yearMax,
    filters.priceMin,
    filters.priceMax,
    filters.odometerMax,
    filters.gradeMin,
  ].filter((value) => value !== null).length;

  const toggles = Number(filters.buyNowOnly) + Number(filters.noReserveOnly);

  return listTotal + scalars + toggles;
}
