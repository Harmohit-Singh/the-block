import { describe, expect, it } from "vitest";
import { createQuery } from "../query";
import {
  clearFilters,
  parseQuery,
  patchQuery,
  serializeQuery,
} from "../queryParams";

describe("serializeQuery", () => {
  it("produces an empty query string for an unfiltered browse", () => {
    expect(serializeQuery(createQuery()).toString()).toBe("");
  });

  it("omits defaults so shared URLs stay readable", () => {
    const params = serializeQuery(createQuery({ sort: "ending-soon", page: 1 }));
    expect(params.has("sort")).toBe(false);
    expect(params.has("page")).toBe(false);
  });

  it("packs multi-select values into one comma-separated param", () => {
    const params = serializeQuery(
      createQuery({ filters: { makes: ["Ford", "Honda"] } }),
    );
    expect(params.get("make")).toBe("Ford,Honda");
  });

  it("encodes booleans as flags only when set", () => {
    expect(serializeQuery(createQuery({ filters: { buyNowOnly: true } })).get("buy_now")).toBe("1");
    expect(serializeQuery(createQuery()).has("buy_now")).toBe(false);
  });
});

describe("parseQuery", () => {
  it("round-trips a fully populated query", () => {
    const original = createQuery({
      sort: "price-desc",
      page: 3,
      pageSize: 48,
      filters: {
        makes: ["Ford"],
        bodyStyles: ["SUV", "truck"],
        titleStatuses: ["clean"],
        provinces: ["Ontario"],
        statuses: ["live"],
        priceMax: 30_000,
        gradeMin: 3.5,
        buyNowOnly: true,
        noReserveOnly: true,
      },
    });

    expect(parseQuery(serializeQuery(original))).toEqual(original);
  });

  it("falls back to defaults for a bare URL", () => {
    expect(parseQuery(new URLSearchParams())).toEqual(createQuery());
  });

  it("discards values outside a closed set rather than trusting the URL", () => {
    const params = new URLSearchParams({ body: "SUV,spaceship", sort: "by-vibes" });
    const query = parseQuery(params);

    expect(query.filters.bodyStyles).toEqual(["SUV"]);
    expect(query.sort).toBe("ending-soon");
  });

  it("ignores unparseable numbers and pages", () => {
    const params = new URLSearchParams({ price_max: "abc", page: "-4" });
    const query = parseQuery(params);

    expect(query.filters.priceMax).toBeNull();
    expect(query.page).toBe(1);
  });
});

describe("patchQuery", () => {
  it("merges filters instead of replacing the whole object", () => {
    const query = createQuery({ filters: { makes: ["Ford"], provinces: ["Ontario"] } });
    const next = patchQuery(query, { filters: { makes: ["Honda"] } });

    expect(next.filters.makes).toEqual(["Honda"]);
    expect(next.filters.provinces).toEqual(["Ontario"]);
  });

  it("resets to page 1 when the result set changes", () => {
    const query = createQuery({ page: 5 });
    expect(patchQuery(query, { filters: { makes: ["Ram"] } }).page).toBe(1);
  });

  it("keeps the requested page when paging is the change", () => {
    expect(patchQuery(createQuery({ page: 5 }), { page: 6 }).page).toBe(6);
  });
});

describe("clearFilters", () => {
  it("drops every filter but keeps the chosen sort", () => {
    const query = createQuery({
      sort: "price-asc",
      page: 4,
      filters: { makes: ["Ford"], buyNowOnly: true },
    });
    const cleared = clearFilters(query);

    expect(cleared.filters.makes).toEqual([]);
    expect(cleared.filters.buyNowOnly).toBe(false);
    expect(cleared.page).toBe(1);
    expect(cleared.sort).toBe("price-asc");
  });
});
