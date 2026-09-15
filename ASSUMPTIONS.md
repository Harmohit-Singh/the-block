# Assumptions and Decisions

Every judgement call made while building this, and why. Where the dataset
forced a decision, the relevant numbers are included.

Anything described here as a "product decision" is a guess about what a buyer
would want. The constants live in
[`src/data/constants.ts`](src/data/constants.ts).

---

## 1. Scope

**Built:** the data layer — loading, normalizing, searching, filtering,
sorting, paginating, and bidding — plus the two buyer-facing screens on top of
it: an inventory browse page and a vehicle detail page with bidding.

**Assumed out of scope** per the challenge brief: authentication, seller
workflows, checkout, payments, and dealer admin tooling. There is no concept of
a user account; the single bidder is hardcoded as `"You"` in
[`bidsStore.tsx`](src/data/bidsStore.tsx).

---

## 2. No backend

The whole dataset is 280 KB on disk — smaller than a typical JS chunk. It is imported directly and filtered in memory, which is faster than any network round trip and removes a second process from the setup instructions.

The layer is still written as though a server existed:
[`inventory.ts`](src/data/inventory.ts) is the only module that knows where
data comes from. Moving to an HTTP API means changing one file and awaiting a fetch; nothing else in
the tree would notice.

**Tradeoff accepted:** bid validation runs client-side only, so there is no
authoritative guard against two buyers racing for the same lot. With a real
backend, `validateBid` would move server-side and become the source of truth.

---

## 3. Stack

| Choice | Why |
|---|---|
| React + Vite + TypeScript | Suggested in the brief; fastest path to a working prototype |
| `react-router-dom` | Needed anyway for the vehicle detail route, and its `useSearchParams` is what makes the URL the query's home |
| Vitest | Shares Vite's transform pipeline, so no separate build config |
| No state management library | One `useReducer` behind a context is enough for a single bid log; a dependency would be unearned |
| No search library | At 200 records a substring scan over a prepared string is instant, and it is one less thing to justify |

**Strict TypeScript** is on, minus `noUncheckedIndexedAccess` — it would add
non-null assertions throughout the tests for very little safety at this size.

---

## 4. The dataset

These were verified across all 200 records, not sampled:

- **200 vehicles, 29 fields each.** 15 makes, 47 models, 32 dealerships,
  7 provinces, 36 cities.
- **Closed value sets.** `body_style` (5), `fuel_type` (4), `drivetrain` (4),
  `transmission` (4), `title_status` (3) never take any other value. They are
  modelled as literal union types derived from the arrays in `constants.ts`, so
  adding a value is a one-line change.
- **Nullable prices are common.** 112 of 200 have no `current_bid`, 60 have no
  `reserve_price`, 161 have no `buy_now_price`. Any code that assumes these are
  present is wrong for most of the inventory.
- **Every `id` and `lot` is unique**, so both are safe as keys.

**Assumed:** the data is trustworthy enough not to need a schema validation
library. [`inventory.ts`](src/data/inventory.ts) does a cheap structural check
for required fields and throws a named error if a record is malformed, which is
proportionate for a bundled fixture. A real API response would warrant Zod.

---

## 5. Auction scheduling

### The timestamps are stale, so they are rebased

`auction_start` values sit between **2026-03-31 and 2026-04-06** — frozen at
whenever `scripts/generate_vehicles.mjs` last ran. On any real run date every
lot has already expired, so countdowns would run backwards. The brief
explicitly allows normalizing them relative to "now".

Three decisions inside that rebase:

1. **One shared offset for all 200 lots.** Preserves the generator's deliberate
   7-day stagger (~28 lots/day) and their relative ordering, so "ending
   soonest" still means something.
2. **Whole calendar days, not milliseconds.** Start times are realistic auction
   hours (9am–8pm). Adding `days * 86400000` would drift by an hour across a
   daylight saving boundary; `setDate()` preserves local wall-clock time.
3. **`now` lands well inside the window, not at its edge.** Shifting the
   earliest lot onto today would leave all 200 upcoming, with nothing live to
   bid on and nothing closed. `REBASE_WINDOW_OFFSET_DAYS = 4` pushes "now" far
   enough in that all three auction states are on screen at once — roughly
   **58 live, 93 upcoming, 49 closed**.

   That figure is tuned against the 48-hour duration below: an offset of 2
   yields no closed lots at all, and 5 or more tips the inventory to mostly
   closed. The two constants should be changed together. A test asserts both
   that all three states appear and that most of the inventory is still
   biddable, so a bad pairing fails rather than quietly degrading the demo.

Because it derives from `Date.now()` at load, this stays correct forever
without touching `vehicles.json`. On the day of writing it resolves to a
164-day shift over a 9-day window. The exact split drifts by a few lots through
the day as the clock moves within the window.

> **Rounding caveat:** `Math.ceil` makes the offset a range, not an exact
> figure — `now` lands between one and two days into the window. The test
> asserts that range rather than a fixed number.

### Auction duration is invented

**The dataset has no auction end time.** Countdowns, an "ending soon" sort, and
any notion of a lot being closed all need one, so every lot is assumed to run
for **`AUCTION_DURATION_HOURS = 48`** from its start.

This is the single largest fabrication in the layer. It is one constant, and
nothing else hardcodes a duration.

It also interacts with the rebase offset above: how long a lot runs determines
how many have closed by the time "now" falls inside the window. Changing one
without the other will skew the live/upcoming/closed mix.

### Timestamps are local time

`"2026-04-05T14:00:00"` carries no timezone, so it is parsed as **local
wall-clock time** — an auction listed at 2pm shows as 2pm to everyone. The
alternative, treating them as UTC, would shift Ontario auctions to 10am and
break the realistic-hours property. Parsing is done by hand in
`parseLocalDateTime` rather than via `Date.parse` so this is explicit.

---

## 6. Pricing and bidding

### `effectivePrice` is the sortable price

**There is no price field in the dataset.** The number to sort, filter, and
lead with is derived once as `currentBid ?? startingBid` and is always a
number, so no caller null-checks. Across the dataset it spans
**$2,500–$77,000, median $15,000**.

This means a lot with no bids is ranked by its *asking* price while a bid lot is
ranked by its *current* price. That is the honest comparison for a buyer
deciding what a lot costs right now, but it is a choice.

### Bids are an append-only log

Bids are stored separately from vehicles and overlaid at read time rather than
mutating `current_bid`. Three consequences:

- The inventory grid and the detail page cannot disagree — both
  derive from the same log through the same function.
- Bid history on the detail page is a filter over the log, free.

The dataset's `current_bid` / `bid_count` are treated as the **seed** state that
existed before this session (`seedCurrentBid`, `seedBidCount`). A session bid
below the seed never lowers the displayed price.

### Bid rules

- **Opening bid = `startingBid` exactly.** Every later bid must clear the
  current bid by one increment.
- **Increments are tiered** by price, mirroring how physical lanes step up more
  coarsely on expensive lots: $100 below $5k, $250 below $20k, $500 below $50k,
  $1,000 above. Invented, and easy to flatten to a single value.
- **Pre-bids on `upcoming` lots are allowed.** Proxy bidding before a lane opens
  is normal in wholesale auctions, and rejecting them would make 151 of 200
  lots unbiddable at launch. Bids on `ended` lots are rejected.
- **Whole dollars only.** Auction prices are never quoted in cents.
- **Bids at or above `buyNowPrice` are rejected** with a message pointing at Buy
  Now, rather than silently allowing a bid that beats the instant-purchase
  price.

**Buy Now is not implemented as an action.** `hasBuyNow` and a filter exist so
the UI can surface it, but purchasing is checkout, which is out of scope.

---

## 7. Search and filtering

- **Facet counts exclude their own filter.** Ticking "Ford" does not zero out
  the count beside every other make. This is why the filters are a keyed record
  of named predicates rather than one `&&` chain.
- **A selected facet value stays visible at count 0**, or it would become
  impossible to untick.
- **Facets are sorted most-results-first**, except `status` and `titleStatus`
  which use a fixed lifecycle order.
- **"Ending soonest" ranks live lots first, then upcoming, then ended.** Sorting
  purely by end time would lead with dead lots.
- **Every sort breaks ties on lot number**, so results never depend on input
  order.
- **Page size defaults to 24.** Divides evenly into 2-, 3-, and 4-column grids;
  200 vehicles gives 9 pages.

---

## 8. State and persistence

- **The URL is the source of truth for the query.** Refresh and back-button work
  for free, and a buyer can share a link to "Ontario SUVs under $20k". Defaults
  are omitted from the query string so an unfiltered browse leaves a clean URL.
- **Hand-edited URLs cannot break the app.** Unknown enum values and
  unparseable numbers are dropped at parse time.
- **Filter changes replace the history entry; paging pushes.** Otherwise Back
  would walk the buyer through every checkbox they ticked.
- **Any filter change resets to page 1.** Staying on page 4 while narrowing to
  two pages strands the buyer on an empty screen.
- **Bids persist to `localStorage`**, so a refresh mid-demo does not wipe them.
  Corrupt, stale, or hand-edited payloads degrade to an empty log rather than
  crashing on boot, and quota or private-browsing failures leave bids working
  in memory.
- **Clocks tick at different rates by context.** The inventory re-derives every
  30s (it only needs to notice lots opening and closing); the detail page ticks
  every 1s for a live countdown. Re-deriving 200 vehicles every second would be
  waste.

---

## 9. Formatting

The dataset is entirely Canadian (provinces, kilometres), so amounts are
formatted as **CAD in en-CA** and distances in km. All formatting is centralised
in [`src/lib/format.ts`](src/lib/format.ts) so prices cannot drift between the
grid, the detail page, and validation messages. No multi-currency or i18n.

Countdowns show the largest two meaningful units — seconds are noise three days
out but matter in the final minutes.

---

## 10. Interface

**Two routes.** `/` is the inventory browse page, `/vehicles/:id` the detail
page. Both sit under one persistent header, and both read from the single
`BidsProvider` mounted in [`main.tsx`](src/main.tsx) — that shared provider is
what makes a bid placed on the detail page immediately visible back in the
grid.

**Plain CSS with custom properties**, no utility framework. The stylesheet is
~700 lines against a two-page app; a build-step dependency would cost more than
it saves, and tokens are enough to keep the palette consistent.

**The card answers four questions, in the order a buyer scanning a lane asks
them:** what is it, what condition is it in, what does it cost now, and how long
is left. Specifically:

- Price is labelled **"Starting bid"** with no bids and **"Current bid"** with
  them. A lot with no bids is quoting an asking price, not a market price, and
  conflating the two would overstate demand.
- Condition grade is colour-coded — 4+ clean, 3s worn, below 3 needs work —
  because a bare "3.8" means nothing to someone new to wholesale.
- Salvage and rebuilt titles are flagged; clean titles are not, since that is
  the default and a badge would be noise on 80% of cards.

**Filters apply immediately**, with no Apply button, on both desktop and mobile.
The result count in the drawer footer updates as the buyer works and doubles as
the confirmation that dismisses it.

**Numeric inputs commit on blur, Enter, or pointer release** rather than on
change. Writing to the URL per keystroke or slider pixel would push a history
entry per character and re-run the query dozens of times for one adjustment.

**Active filters appear as removable chips** above the grid. The sidebar can be
scrolled away or closed on mobile, so without them a buyer can end up staring at
four results with no visible reason why.

**Model is the one facet hidden by default.** 47 models is too many to list
cold; the group appears once a make is selected, by which point the facet has
narrowed to that make's models.

**Images lazy-load below the first row and fall back to a placeholder on
error.** Every image in the dataset is a remote `placehold.co` URL, so a slow or
blocked CDN would otherwise leave two dozen broken-image icons on the grid.

**Responsive at 560 / 900 / 1180 px:** one, two, then three cards per row, with
the filter sidebar collapsing into a drawer below 900.

---

## 11. Verification

105 tests, all pure-function or hook-level:

```bash
npm install
npm test          # 105 tests
npx tsc --noEmit  # strict typecheck
npm run dev       # app at localhost:5173
```

The unit tests cover normalization (including the rebase invariants), the bid
overlay and validation rules, search, filters, sorting, facet counting, and URL
round-tripping. A jsdom integration suite covers what unit tests cannot see:
that the URL really drives the query, that a bid placed once is visible in both
the list and the detail view, and that bids survive a remount.

**Not covered by tests:** the presentational components. These were checked in a
browser instead — layout measured at 390 px and 1440 px, a shared filtered URL
restoring its filters and sort, a bid on the detail page appearing in the grid
and surviving a reload, and the empty state. Component tests here would mostly
assert that markup is the markup.

---

