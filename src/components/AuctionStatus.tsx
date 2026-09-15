import type { ReserveState, Vehicle } from "../data";
import { useNow } from "../hooks/useNow";
import {
  formatAuctionTime,
  formatCurrency,
  formatTimeRemaining,
} from "../lib/format";

/**
 * Status and reserve signalling.
 *
 * These are the two things that tell a buyer whether a lot is worth their
 * attention — can I still bid, and will it actually sell at this price — so
 * they are surfaced on the card rather than buried on the detail page.
 */

export function AuctionStatusBadge({ status }: { status: Vehicle["status"] }) {
  if (status === "live") {
    return (
      <span className="badge badge--live">
        <span className="badge__dot" />
        Live
      </span>
    );
  }

  if (status === "ended") {
    return <span className="badge badge--ended">Closed</span>;
  }

  return <span className="badge badge--upcoming">Upcoming</span>;
}

/**
 * Counts down to whichever moment matters next: the close for a live lot, the
 * open for an upcoming one. A closed lot shows nothing, since there is no
 * deadline left to act on.
 */
export function AuctionCountdown({
  vehicle,
  tickMs = 1_000,
}: {
  vehicle: Vehicle;
  tickMs?: number;
}) {
  const now = useNow(tickMs);

  if (vehicle.status === "ended") return null;

  const isLive = vehicle.status === "live";
  const target = isLive ? vehicle.auctionEnd : vehicle.auctionStart;

  return (
    <span className="badge badge--countdown numeric">
      {isLive ? "Ends in " : "Opens in "}
      {formatTimeRemaining(target, now)}
    </span>
  );
}

const RESERVE_COPY: Record<ReserveState, { label: string; className: string }> = {
  met: { label: "Reserve met", className: "pill pill--good" },
  "not-met": { label: "Reserve not met", className: "pill pill--warn" },
  none: { label: "No reserve", className: "pill pill--info" },
};

export function ReserveBadge({
  state,
  amount,
}: {
  state: ReserveState;
  amount?: number | null;
}) {
  const { label, className } = RESERVE_COPY[state];
  const reserve = amount === null || amount === undefined ? "" : ` ${formatCurrency(amount)}`;
  return <span className={className}>{`${label}${reserve}`}</span>;
}

/** Flags a title that materially affects what the vehicle is worth. */
export function TitleStatusBadge({ status }: { status: Vehicle["titleStatus"] }) {
  if (status === "clean") return null;
  return (
    <span className={status === "salvage" ? "pill pill--bad" : "pill pill--warn"}>
      {status === "salvage" ? "Salvage title" : "Rebuilt title"}
    </span>
  );
}

/** Absolute auction time, for the detail page where precision matters. */
export function AuctionSchedule({ vehicle }: { vehicle: Vehicle }) {
  return (
    <>
      {formatAuctionTime(vehicle.auctionStart)} – {formatAuctionTime(vehicle.auctionEnd)}
    </>
  );
}
