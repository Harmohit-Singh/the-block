import { describe, expect, it } from "vitest";
import {
  createQuery,
  getFilterBounds,
  isFilterActive,
  searchVehicles,
  toggleFacetValue,
  DEFAULT_FILTERS,
} from "../query";
import { makeVehicle } from "./factories";

const FLEET = [
  makeVehicle({
    id: "bronco",
    make: "Ford",
    model: "Bronco",
    displayName: "2023 Ford Bronco Big Bend",
    bodyStyle: "SUV",
    province: "Ontario",
    city: "Toronto",
    vin: "TRD7L1KS0HNB5X3K3",
    lot: "A-0043",
    startingBid: 14_500,
    seedCurrentBid: 22_800,
    conditionGrade: 3.8,
    odometerKm: 47_731,
    year: 2023,
    titleStatus: "clean",
    buyNowPrice: null,
    reservePrice: 25_000,
  }),
  makeVehicle({
    id: "civic",
    make: "Honda",
    model: "Civic",
    displayName: "2019 Honda Civic LX",
    bodyStyle: "sedan",
    province: "Quebec",
    city: "Montreal",
    vin: "HND1A2B3C4D5E6F7G",
    lot: "B-0007",
    startingBid: 8_000,
    seedCurrentBid: null,
    conditionGrade: 4.5,
    odometerKm: 120_000,
    year: 2019,
    titleStatus: "clean",
    buyNowPrice: 12_000,
    reservePrice: null,
  }),
  makeVehicle({
    id: "ram",
    make: "Ram",
    model: "1500",
    displayName: "2021 Ram 1500 Rebel",
    bodyStyle: "truck",
    province: "Ontario",
    city: "Ottawa",
    vin: "RAM9Z8Y7X6W5V4U3T",
    lot: "C-0011",
    startingBid: 30_000,
    seedCurrentBid: 44_000,
    conditionGrade: 2.1,
    odometerKm: 90_000,
    year: 2021,
    titleStatus: "salvage",
    buyNowPrice: null,
    reservePrice: 50_000,
  }),
];

function search(partial: Parameters<typeof createQuery>[0] = {}) {
  return searchVehicles(FLEET, createQuery(partial));
}

function ids(result: ReturnType<typeof search>) {
  return result.results.map((vehicle) => vehicle.id);
}

describe("filters", () => {
  it("filters by make", () => {
    expect(ids(search({ filters: { makes: ["Ford", "Ram"] } }))).toHaveLength(2);
  });

  it("filters on effective price, which falls back to the starting bid", () => {
    // Civic has no bids, so its effective price is its $8,000 starting bid.
    expect(ids(search({ filters: { priceMax: 10_000 } }))).toEqual(["civic"]);
    expect(ids(search({ filters: { priceMin: 40_000 } }))).toEqual(["ram"]);
  });

  it("filters by minimum condition grade", () => {
    expect(ids(search({ filters: { gradeMin: 3.5 } })).sort()).toEqual(["bronco", "civic"]);
  });

  it("filters by odometer ceiling and year range", () => {
    expect(ids(search({ filters: { odometerMax: 50_000 } }))).toEqual(["bronco"]);
    expect(ids(search({ filters: { yearMin: 2021, yearMax: 2022 } }))).toEqual(["ram"]);
  });

  it("filters to lots that offer Buy Now", () => {
    expect(ids(search({ filters: { buyNowOnly: true } }))).toEqual(["civic"]);
  });

  it("filters to lots with no reserve", () => {
    expect(ids(search({ filters: { noReserveOnly: true } }))).toEqual(["civic"]);
  });

  it("excludes salvage when only clean titles are selected", () => {
    expect(ids(search({ filters: { titleStatuses: ["clean"] } })).sort()).toEqual([
      "bronco",
      "civic",
    ]);
  });

  it("combines filters as AND", () => {
    expect(ids(search({ filters: { provinces: ["Ontario"], bodyStyles: ["SUV"] } }))).toEqual([
      "bronco",
    ]);
  });

  it("treats an empty selection as no constraint", () => {
    expect(search({ filters: { makes: [] } }).total).toBe(3);
  });
});

describe("sorting", () => {
  it("sorts by effective price in both directions", () => {
    expect(ids(search({ sort: "price-asc" }))).toEqual(["civic", "bronco", "ram"]);
    expect(ids(search({ sort: "price-desc" }))).toEqual(["ram", "bronco", "civic"]);
  });

  it("sorts newest and lowest-odometer first", () => {
    expect(ids(search({ sort: "year-desc" }))).toEqual(["bronco", "ram", "civic"]);
    expect(ids(search({ sort: "odometer-asc" }))).toEqual(["bronco", "ram", "civic"]);
  });

  it("sorts best condition first", () => {
    expect(ids(search({ sort: "grade-desc" }))).toEqual(["civic", "bronco", "ram"]);
  });

  it("puts live lots ahead of upcoming ones, and closed lots last", () => {
    const fleet = [
      makeVehicle({
        id: "ended",
        auctionStart: new Date(2026, 7, 1, 9),
        auctionEnd: new Date(2026, 7, 3, 9),
      }),
      makeVehicle({
        id: "upcoming",
        auctionStart: new Date(2026, 8, 20, 9),
        auctionEnd: new Date(2026, 8, 22, 9),
      }),
      makeVehicle({
        id: "live",
        auctionStart: new Date(2026, 8, 13, 9),
        auctionEnd: new Date(2026, 8, 15, 9),
      }),
    ];

    const result = searchVehicles(fleet, createQuery({ sort: "ending-soon" }));
    expect(result.results.map((v) => v.id)).toEqual(["live", "upcoming", "ended"]);
  });

  it("breaks ties on lot number so ordering is deterministic", () => {
    const fleet = [
      makeVehicle({ id: "second", lot: "Z-0001", startingBid: 1_000, seedCurrentBid: null }),
      makeVehicle({ id: "first", lot: "A-0001", startingBid: 1_000, seedCurrentBid: null }),
    ];

    const result = searchVehicles(fleet, createQuery({ sort: "price-asc" }));
    expect(result.results.map((v) => v.id)).toEqual(["first", "second"]);
  });
});

describe("pagination", () => {
  it("returns one page at a time and reports the total across all pages", () => {
    const result = search({ pageSize: 2, sort: "price-asc" });

    expect(result.results).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.pageCount).toBe(2);
  });

  it("clamps an out-of-range page instead of returning nothing", () => {
    expect(search({ pageSize: 2, page: 99 }).page).toBe(2);
    expect(search({ pageSize: 2, page: 99 }).results).toHaveLength(1);
    expect(search({ page: 0 }).page).toBe(1);
  });

  it("reports one page when nothing matches", () => {
    const result = search({ filters: { makes: ["Lamborghini"] } });
    expect(result.total).toBe(0);
    expect(result.pageCount).toBe(1);
  });
});

describe("facet counts", () => {
  it("counts every value when nothing is selected", () => {
    const makes = search().facets.make;
    expect(makes.map((facet) => facet.value).sort()).toEqual(["Ford", "Honda", "Ram"]);
    expect(makes.every((facet) => facet.count === 1)).toBe(true);
  });

  it("keeps sibling counts alive when one value in the same facet is selected", () => {
    // The whole point: ticking "Ford" must not zero out Honda and Ram.
    const result = search({ filters: { makes: ["Ford"] } });
    const counts = Object.fromEntries(
      result.facets.make.map((facet) => [facet.value, facet.count]),
    );

    expect(result.total).toBe(1);
    expect(counts).toEqual({ Ford: 1, Honda: 1, Ram: 1 });
  });

  it("narrows other facets by the current selection", () => {
    const result = search({ filters: { provinces: ["Ontario"] } });
    const bodies = result.facets.bodyStyle.map((facet) => facet.value).sort();

    expect(bodies).toEqual(["SUV", "truck"]);
  });

  it("narrows models to the selected make, so dependent facets need no special case", () => {
    const result = search({ filters: { makes: ["Ford"] } });
    expect(result.facets.model.map((facet) => facet.value)).toEqual(["Bronco"]);
  });

  it("marks selected values so the UI can render checked state", () => {
    const result = search({ filters: { makes: ["Ford"] } });
    const ford = result.facets.make.find((facet) => facet.value === "Ford");

    expect(ford?.selected).toBe(true);
  });

  it("keeps a selected value visible at zero so it can be unticked", () => {
    const result = search({ filters: { makes: ["Honda"], bodyStyles: ["truck"] } });
    const honda = result.facets.make.find((facet) => facet.value === "Honda");

    expect(result.total).toBe(0);
    expect(honda).toEqual({ value: "Honda", count: 0, selected: true });
  });

  it("orders the status facet by auction lifecycle, not by count", () => {
    const fleet = [
      makeVehicle({ auctionStart: new Date(2026, 8, 20, 9), auctionEnd: new Date(2026, 8, 22, 9) }),
      makeVehicle({ auctionStart: new Date(2026, 8, 20, 9), auctionEnd: new Date(2026, 8, 22, 9) }),
      makeVehicle({ auctionStart: new Date(2026, 7, 1, 9), auctionEnd: new Date(2026, 7, 3, 9) }),
      makeVehicle({ auctionStart: new Date(2026, 8, 13, 9), auctionEnd: new Date(2026, 8, 15, 9) }),
    ];

    const facets = searchVehicles(fleet, createQuery()).facets.status;

    // "upcoming" is the most common, but lifecycle order wins.
    expect(facets.map((facet) => facet.value)).toEqual(["live", "upcoming", "ended"]);
  });

  it("orders remaining facets by most results first", () => {
    const fleet = [
      makeVehicle({ make: "Ford" }),
      makeVehicle({ make: "Honda" }),
      makeVehicle({ make: "Honda" }),
    ];

    const facets = searchVehicles(fleet, createQuery()).facets.make;
    expect(facets.map((facet) => facet.value)).toEqual(["Honda", "Ford"]);
  });
});

describe("toggleFacetValue", () => {
  it("adds a value that is not selected and removes one that is", () => {
    const added = toggleFacetValue(DEFAULT_FILTERS, "make", "Ford");
    expect(added.makes).toEqual(["Ford"]);

    expect(toggleFacetValue(added, "make", "Ford").makes).toEqual([]);
  });

  it("does not mutate the filters it was given", () => {
    const before = { ...DEFAULT_FILTERS, makes: ["Ford"] };
    toggleFacetValue(before, "make", "Honda");

    expect(before.makes).toEqual(["Ford"]);
  });
});

describe("getFilterBounds", () => {
  it("derives slider endpoints from the data", () => {
    expect(getFilterBounds(FLEET)).toEqual({
      priceMin: 8_000,
      priceMax: 44_000,
      yearMin: 2019,
      yearMax: 2023,
      odometerMax: 120_000,
    });
  });

  it("returns zeroes for an empty fleet rather than Infinity", () => {
    expect(getFilterBounds([]).priceMin).toBe(0);
  });
});

describe("isFilterActive", () => {
  it("is false for a default query and true once anything narrows it", () => {
    expect(isFilterActive(createQuery())).toBe(false);
    expect(isFilterActive(createQuery({ filters: { makes: ["Ford"] } }))).toBe(true);
    expect(isFilterActive(createQuery({ filters: { buyNowOnly: true } }))).toBe(true);
    expect(isFilterActive(createQuery({ filters: { priceMax: 1_000 } }))).toBe(true);
  });

  it("ignores sort and paging, which do not narrow the inventory", () => {
    expect(isFilterActive(createQuery({ sort: "price-asc", page: 3 }))).toBe(false);
  });
});
