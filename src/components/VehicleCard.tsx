import { Link } from "react-router-dom";
import { useBidHistory, type Vehicle } from "../data";
import { formatCurrency, formatOdometer } from "../lib/format";
import {
  AuctionCountdown,
  AuctionStatusBadge,
  ReserveBadge,
  TitleStatusBadge,
} from "./AuctionStatus";
import { ConditionGrade } from "./ConditionGrade";
import { VehicleImage } from "./VehicleImage";
import { GaugeIcon, MapPinIcon } from "./icons";

/**
 * One lot in the inventory grid.
 *
 * The card answers the four questions a buyer scanning a lane asks in order:
 * what is it, what condition is it in, what does it cost right now, and how
 * long do I have. Anything that does not serve one of those lives on the
 * detail page instead.
 */
export function VehicleCard({
  vehicle,
  eagerImage = false,
  onBid,
}: {
  vehicle: Vehicle;
  eagerImage?: boolean;
  onBid: () => void;
}) {
  const hasBids = vehicle.currentBid !== null;
  const userBids = useBidHistory(vehicle.id);
  const isUsersCurrentBid =
    hasBids && userBids.some((bid) => bid.amount === vehicle.currentBid);

  return (
    <li className="card">
      <Link
        to={`/vehicles/${vehicle.id}`}
        className="card__link"
        aria-label={`View ${vehicle.displayName}`}
      >
        <div className="card__media">
          <VehicleImage src={vehicle.images[0]} alt={vehicle.displayName} eager={eagerImage} />
          <div className="card__badges">
            <AuctionStatusBadge status={vehicle.status} />
            <AuctionCountdown vehicle={vehicle} />
          </div>
          <span className="card__lot numeric">{vehicle.lot}</span>
        </div>

        <div className="card__body">
          <h3 className="card__title">
            {vehicle.year} {vehicle.make} {vehicle.model}{" "}
            <span className="card__trim">{vehicle.trim}</span>
          </h3>

          <div className="card__specs">
            <span>
              <GaugeIcon size={14} />
              {formatOdometer(vehicle.odometerKm)}
            </span>
            <span>{vehicle.drivetrain}</span>
            <span style={{ textTransform: "capitalize" }}>{vehicle.fuelType}</span>
            <span>
              <MapPinIcon size={14} />
              {vehicle.city}, {vehicle.province}
            </span>
          </div>

          <div className="card__specs" style={{ gap: 6 }}>
            <ConditionGrade grade={vehicle.conditionGrade} />
            <ReserveBadge state={vehicle.reserveState} amount={vehicle.reservePrice} />
            <TitleStatusBadge status={vehicle.titleStatus} />
            {vehicle.hasBuyNow ? <span className="pill pill--neutral">Buy Now</span> : null}
          </div>

          <div className="card__price">
            <div>
              {/* A lot with no bids is quoting an asking price, not a market
                  price. Labelling them differently keeps that honest. */}
              <span className="card__price-label">
                {hasBids
                  ? `Current bid · ${isUsersCurrentBid ? "Yours" : "Another bidder"}`
                  : "Starting bid"}
              </span>
              <span className="card__price-value numeric">
                {formatCurrency(vehicle.effectivePrice)}
              </span>
            </div>
            <span className="card__bids">
              {vehicle.bidCount === 0
                ? "No bids yet"
                : `${vehicle.bidCount} ${vehicle.bidCount === 1 ? "bid" : "bids"}`}
            </span>
          </div>
        </div>
      </Link>
      <div className="card__action">
        <button type="button" className="btn btn--accent btn--block" onClick={onBid}>
          {vehicle.status === "ended" ? "View bidding" : "Bid now"}
        </button>
      </div>
    </li>
  );
}
