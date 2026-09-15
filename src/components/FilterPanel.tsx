import type { UseInventoryResult } from "../data";
import { FacetCheckboxes, FilterSection } from "./FacetGroup";
import { GradeSlider, OdometerSlider, PriceRange } from "./RangeInputs";

/**
 * The filter sidebar.
 *
 * Ordered by how buyers actually narrow inventory: first whether they can bid
 * at all, then what the vehicle is, then what it costs, then condition. The
 * long tail (fuel, drivetrain, title) sits collapsed at the bottom so the
 * panel opens short.
 */
export function FilterPanel({ inventory }: { inventory: UseInventoryResult }) {
  const { facets, query, bounds, toggleFacet, setFilters } = inventory;
  const { filters } = query;

  return (
    <>
      <FilterSection title="Auction status">
        <FacetCheckboxes
          values={facets.status}
          onToggle={(value) => toggleFacet("status", value)}
        />
      </FilterSection>

      <FilterSection title="Make">
        <FacetCheckboxes
          values={facets.make}
          onToggle={(value) => toggleFacet("make", value)}
          limit={8}
        />
      </FilterSection>

      {/* 47 models is too many to list cold, but once a make is chosen the
          facet has already narrowed to that make's models. */}
      {filters.makes.length > 0 ? (
        <FilterSection title="Model">
          <FacetCheckboxes
            values={facets.model}
            onToggle={(value) => toggleFacet("model", value)}
            limit={10}
          />
        </FilterSection>
      ) : null}

      <FilterSection title="Body style">
        <FacetCheckboxes
          values={facets.bodyStyle}
          onToggle={(value) => toggleFacet("bodyStyle", value)}
        />
      </FilterSection>

      <FilterSection title="Price">
        <PriceRange
          min={filters.priceMin}
          max={filters.priceMax}
          bounds={bounds}
          onCommit={setFilters}
        />
      </FilterSection>

      <FilterSection title="Condition">
        <GradeSlider
          value={filters.gradeMin}
          onCommit={(gradeMin) => setFilters({ gradeMin })}
        />
      </FilterSection>

      <FilterSection title="Odometer">
        <OdometerSlider
          value={filters.odometerMax}
          maxKm={bounds.odometerMax}
          onCommit={(odometerMax) => setFilters({ odometerMax })}
        />
      </FilterSection>

      <FilterSection title="Location">
        <FacetCheckboxes
          values={facets.province}
          onToggle={(value) => toggleFacet("province", value)}
          limit={5}
        />
      </FilterSection>

      <FilterSection title="Title status" defaultOpen={false}>
        <FacetCheckboxes
          values={facets.titleStatus}
          onToggle={(value) => toggleFacet("titleStatus", value)}
        />
      </FilterSection>

      <FilterSection title="Drivetrain & fuel" defaultOpen={false}>
        <FacetCheckboxes
          values={facets.drivetrain}
          onToggle={(value) => toggleFacet("drivetrain", value)}
        />
        <hr
          style={{ border: 0, borderTop: "1px solid var(--ink-100)", margin: "8px 0" }}
        />
        <FacetCheckboxes
          values={facets.fuelType}
          onToggle={(value) => toggleFacet("fuelType", value)}
        />
      </FilterSection>

      <FilterSection title="Selling options" defaultOpen={false}>
        <label className="facet__option">
          <input
            type="checkbox"
            checked={filters.buyNowOnly}
            onChange={(event) => setFilters({ buyNowOnly: event.target.checked })}
          />
          <span className="facet__label">Buy Now available</span>
        </label>
        <label className="facet__option">
          <input
            type="checkbox"
            checked={filters.noReserveOnly}
            onChange={(event) => setFilters({ noReserveOnly: event.target.checked })}
          />
          <span className="facet__label">No reserve</span>
        </label>
      </FilterSection>
    </>
  );
}
