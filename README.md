# The Block - **OPENLANE** coding challenge

## How to Run

**Step 1**: `cd` into the project directory from your terminal
**Step 2**: run `npm run dev`
**Step 3**: Open the localpost url in your browser (Google Chrome preferred). `http://localhost:5173/` is the default

## Time Spent

I spent a total of 3.5 hours on this project. This is roughly how I divided up my time:

- **1 hour**: Going though the exercise requirements, understanding what needs to be done, doing some research on similar UI/UX: I used Autotrader and the Toronto Police Auction websites for inspiration for building the UI/UX. I also used this time to write down assumptions.

- **1.5 hour**: Using cursor to implement this project. I used my assumptions, requirements and descriptions of UI/UX elements that I wanted to implement to prompt cursor. I built this project in 5 phases - data layer, browsing screen, filters, vehicle detail page and bidding. Building each phase was also accompanied by writing unit tests.

- **1 hour**: The last hour was used for manual testing, fixing bugs, doing some code cleanup and putting together this file



## Assumptions and Scope

What you intentionally included, skipped, or simplified.

Here is a summary of the assumptions and scope, for the complete version please refer to [ASSUMPTIONS](ASSUMPTIONS.md)

The data layer (normalize, search, filter, sort, paginate, bid) plus two buyer screens; auth, checkout were built. A real backend was left out of scope.

Stale auction timestamps are rebased so live, upcoming, and closed lots all appear, with a fabricated 48-hour duration since the dataset has no end times.

Price, bid rules, and URL-as-query-state are product guesses: effectivePrice is currentBid ?? startingBid, bids are an append-only localStorage log, and filters live in the URL.



## Stack

- **Frontend:**: React/Vite/Typescript
- **Backend:**: None
- **Database:**: In memory

## What I Built

A buyer-side wholesale auction prototype: browse 200 vehicles, filter and sort them, open a lot, and place a bid. Two screens — an inventory grid at `/` and a vehicle detail page at `/vehicles/:id` — sit on a data layer that loads, normalizes, searches, filters, sorts, paginates, and overlays bids.

I started with that layer so the UI only consumes a stable query and bid API, then built browse, filters, detail, and bidding on top of it. The dataset is imported and queried in memory (no backend); auction timestamps are rebased so live, upcoming, and closed lots all appear; and the URL is the source of truth for filters so a search is shareable and survives a refresh. Bids are an append-only log in `localStorage`, so a bid on the detail page is immediately visible back in the grid.

## Notable Decisions

The full reasoning is in [ASSUMPTIONS](ASSUMPTIONS.md). The choices that most shaped the prototype:

- **No backend, but a seam for one.** The 280 KB dataset is imported and filtered in memory — faster than a network round trip and one less process to run. All data access still goes through `inventory.ts`, so swapping in a fetch would not leak into the rest of the tree. The tradeoff is that bid validation is client-side only; two buyers racing the same lot have no authoritative guard.

- **Rebase the stale auction window, invent a 48-hour duration.** Every `auction_start` in the fixture has already expired, so countdowns would run backwards. One shared day offset keeps the generator's 7-day stagger; `now` is placed inside that window so live, upcoming, and closed lots all appear. The dataset has no end time, so every lot is assumed to run 48 hours. That duration is the largest fabrication in the layer, and it has to move with the rebase offset or the live/closed mix skews.

- **`effectivePrice` is `currentBid ?? startingBid`.** There is no price field. Ranking an unbid lot by asking price and a bid lot by current price is the honest "what does this cost right now" comparison, but it does conflate two different signals.

- **Bids are an append-only log, overlaid at read time.** The grid and the detail page cannot disagree, and bid history is just a filter over the log. Seed `current_bid` / `bid_count` from the dataset are never mutated. Pre-bids on upcoming lots are allowed (proxy bidding is normal in wholesale, and rejecting them would leave most of the inventory unbiddable); ended lots reject bids. Buy Now is surfaced as a badge and a filter, not a purchase action — checkout is out of scope.

- **The URL is the query.** Refresh, back, and a shared "Ontario SUVs under $20k" link work for free. Filter changes replace the history entry (so Back does not walk through every checkbox); paging pushes. Hand-edited junk is dropped at parse time rather than crashing.

- **Keep the stack thin.** One `useReducer` behind a context is enough for a single bid log; a substring scan over 200 records does not need a search library. Plain CSS with custom properties instead of a utility framework — a build-step dependency would cost more than it saves on a two-page app.

## Testing

**Automated.** 105 Vitest tests, all pure-function or hook-level — no component snapshots. Units cover normalization (including the auction-rebase invariants), bid overlay and validation, search, filters, sorting, facet counts, URL round-tripping, and formatting. A jsdom suite covers what units cannot: that the URL actually drives the query, that a bid placed once shows in both the list and the detail view, and that bids survive a remount. `npx tsc --noEmit` is the typecheck.

**Manual.** Presentational components were checked in the browser instead of tested: layout at 390 px and 1440 px, a shared filtered URL restoring its filters and sort, a bid on the detail page appearing in the grid and surviving a reload, and the empty state.

`npm test` runs the suite.

## What I'd Do With More Time

- Add a text based search for make, model, VIN, lot or city
- `effectivePrice` conflates asking and current price. Showing them as
  distinct signals: "starts at" and "currently" would be more honest to a
  buyer comparing two lots.
- Add a watchlist and reccomendations.
- Add a real backend for bid placing in real time and a CDN for serving the pictures
