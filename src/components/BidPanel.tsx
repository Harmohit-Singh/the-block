import { useEffect, useState } from "react";
import {
  minimumBid,
  useBidHistory,
  useBids,
  validateBid,
  type Vehicle,
} from "../data";
import { formatCurrency } from "../lib/format";
import { AuctionCountdown, ReserveBadge } from "./AuctionStatus";

type BidMode = "one-off" | "max";

/**
 * The bid form and this session's bid history.
 *
 * The amount is pre-filled with the minimum valid bid so the common case is a
 * single click, and validation runs as the buyer types rather than only on
 * submit — being told a bid is too low after committing to it is the worst
 * moment to find out.
 */
export function BidPanel({ vehicle }: { vehicle: Vehicle }) {
  const { placeBid, placeMaxBid } = useBids();
  const history = useBidHistory(vehicle.id);

  const minimum = minimumBid(vehicle);
  const [mode, setMode] = useState<BidMode>("one-off");
  const [amount, setAmount] = useState(String(minimum));
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    mode: BidMode;
    enteredAmount: number;
    placedAmount: number;
  } | null>(null);

  // Follow the minimum upward as bids land, unless the buyer is mid-edit.
  useEffect(() => {
    setAmount((current) => (Number(current) < minimum ? String(minimum) : current));
  }, [minimum]);

  const closed = vehicle.status === "ended";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(amount);
    const result =
      mode === "max" ? placeMaxBid(vehicle, parsed) : placeBid(vehicle, parsed);

    if (result.ok) {
      setError(null);
      setConfirmed({
        mode,
        enteredAmount: parsed,
        placedAmount: mode === "max" ? minimum : parsed,
      });
    } else {
      setError(result.message);
      setConfirmed(null);
    }
  };

  const hasBids = vehicle.currentBid !== null;

  return (
    <>
      <section className="panel panel--bid">
        <span className="bid__price-label">
          {hasBids ? "Current bid" : "Starting bid"}
        </span>
        <p className="bid__price numeric">{formatCurrency(vehicle.effectivePrice)}</p>

        <div className="bid__meta">
          <span>
            {vehicle.bidCount === 0
              ? "No bids yet"
              : `${vehicle.bidCount} ${vehicle.bidCount === 1 ? "bid" : "bids"}`}
          </span>
          <ReserveBadge state={vehicle.reserveState} amount={vehicle.reservePrice} />
          {vehicle.buyNowPrice !== null ? (
            <span className="pill pill--neutral">
              Buy Now {formatCurrency(vehicle.buyNowPrice)}
            </span>
          ) : null}
        </div>

        {closed ? (
          <p className="bid__closed">Bidding on this lot has closed.</p>
        ) : (
          <form onSubmit={submit}>
            <div className="bid__modes" role="group" aria-label="Bid type">
              <button
                type="button"
                aria-pressed={mode === "one-off"}
                onClick={() => {
                  setMode("one-off");
                  setAmount(String(minimum));
                  setError(null);
                  setConfirmed(null);
                }}
              >
                One-off bid
              </button>
              <button
                type="button"
                aria-pressed={mode === "max"}
                onClick={() => {
                  setMode("max");
                  setAmount(String(minimum));
                  setError(null);
                  setConfirmed(null);
                }}
              >
                Max bid
              </button>
            </div>

            <div className="bid__form">
              <div className="bid__input-wrap">
                <span>$</span>
                <label className="sr-only" htmlFor="bid-amount">
                  {mode === "max" ? "Maximum bid" : "Bid amount"} in Canadian dollars
                </label>
                <input
                  id="bid-amount"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={minimum}
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setConfirmed(null);
                    // Live feedback, using the same rules the store enforces.
                    const check = validateBid(vehicle, Number(event.target.value));
                    setError(check.ok ? null : check.message);
                  }}
                />
              </div>
              <button type="submit" className="btn btn--accent" disabled={error !== null}>
                Place {mode === "max" ? "max bid" : "bid"}
              </button>
            </div>

            {error ? (
              <p className="bid__error" role="alert">
                {error}
              </p>
            ) : (
              <p className="bid__hint">
                {mode === "max"
                  ? `Enter at least ${formatCurrency(minimum)}. We bid only enough to keep you ahead, up to your private maximum.`
                  : `Minimum bid ${formatCurrency(minimum)}. This full amount will be placed now.`}
                {vehicle.status === "upcoming" ? " · pre-bids accepted before the lane opens" : ""}
              </p>
            )}

            {confirmed !== null ? (
              <p className="bid__success" role="status">
                {confirmed.mode === "max" ? (
                  <>
                    Max bid of {formatCurrency(confirmed.enteredAmount)} set. Your current
                    bid is {formatCurrency(confirmed.placedAmount)}.
                  </>
                ) : (
                  <>
                    Bid of {formatCurrency(confirmed.enteredAmount)} placed. You are the
                    high bidder.
                  </>
                )}
              </p>
            ) : null}
          </form>
        )}

        {!closed ? (
          <p className="bid__hint" style={{ marginTop: 12 }}>
            <AuctionCountdown vehicle={vehicle} />
          </p>
        ) : null}
      </section>

      {history.length > 0 ? (
        <section className="panel">
          <h2>Your bids</h2>
          <ul className="history">
            {history.map((bid) => (
              <li key={bid.id} className="history__row">
                <span>
                  <span className="history__amount numeric">
                    {formatCurrency(bid.maxAmount)}
                  </span>
                  <span className="history__detail">
                    {bid.maxAmount > bid.amount
                      ? `Max bid · Current ${formatCurrency(bid.amount)}`
                      : "One-off bid"}
                  </span>
                </span>
                <span className="history__time">
                  {bid.placedAt.toLocaleTimeString("en-CA", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
