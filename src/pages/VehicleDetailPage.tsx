import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AuctionSchedule,
  AuctionStatusBadge,
  TitleStatusBadge,
} from "../components/AuctionStatus";
import { BidPanel } from "../components/BidPanel";
import { ConditionGrade } from "../components/ConditionGrade";
import { VehicleImage } from "../components/VehicleImage";
import { ChevronLeftIcon } from "../components/icons";
import { useVehicle } from "../data";
import { formatOdometer } from "../lib/format";

/**
 * Everything a buyer needs to decide on one lot.
 *
 * Ordered by what carries the most risk in a wholesale purchase: photos, then
 * condition and damage, then specs, then who is selling it. The bid panel
 * stays pinned alongside on desktop so the price is visible while reading.
 */
export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vehicle = useVehicle(id);
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState(0);

  if (!vehicle) {
    return (
      <div className="notfound">
        <h1>Vehicle not found</h1>
        <p style={{ color: "var(--ink-400)" }}>
          This lot may have been removed from the sale.
        </p>
        <Link to="/" className="btn btn--primary">
          Back to inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="detail">
      <button
        type="button"
        className="detail__back"
        // history.back keeps the buyer's filters and scroll position; the
        // fallback covers arriving here from a shared link.
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
      >
        <ChevronLeftIcon size={16} />
        Back to results
      </button>

      <div className="detail__layout">
        <div>
          <div className="gallery__main">
            <VehicleImage
              src={vehicle.images[activeImage]}
              alt={`${vehicle.displayName}, photo ${activeImage + 1}`}
              eager
            />
          </div>

          {vehicle.images.length > 1 ? (
            <div className="gallery__thumbs">
              {vehicle.images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  className="gallery__thumb"
                  aria-current={index === activeImage}
                  aria-label={`View photo ${index + 1}`}
                  onClick={() => setActiveImage(index)}
                >
                  <VehicleImage src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 24 }}>
            <h1 className="detail__title">
              {vehicle.year} {vehicle.make} {vehicle.model}{" "}
              <span style={{ color: "var(--ink-400)" }}>{vehicle.trim}</span>
            </h1>

            <div className="detail__subtitle">
              <span className="numeric">Lot {vehicle.lot}</span>
              <span className="numeric">VIN {vehicle.vin}</span>
              <span>
                <AuctionSchedule vehicle={vehicle} />
              </span>
            </div>

            <div className="detail__pills">
              <AuctionStatusBadge status={vehicle.status} />
              <ConditionGrade grade={vehicle.conditionGrade} />
              <TitleStatusBadge status={vehicle.titleStatus} />
            </div>
          </div>

          <section className="panel">
            <h2>Condition report</h2>
            <p className="report">{vehicle.conditionReport}</p>

            {vehicle.damageNotes.length > 0 ? (
              <>
                <h2 style={{ marginTop: 18 }}>
                  Damage noted ({vehicle.damageNotes.length})
                </h2>
                <ul className="damage">
                  {vehicle.damageNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="pill pill--good" style={{ marginTop: 14 }}>
                No damage noted at inspection
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Specifications</h2>
            <dl className="specs">
              <Spec label="Odometer" value={formatOdometer(vehicle.odometerKm)} numeric />
              <Spec label="Engine" value={vehicle.engine} />
              <Spec label="Transmission" value={vehicle.transmission} />
              <Spec label="Drivetrain" value={vehicle.drivetrain} />
              <Spec label="Fuel type" value={vehicle.fuelType} />
              <Spec label="Body style" value={vehicle.bodyStyle} />
              <Spec label="Exterior" value={vehicle.exteriorColor} />
              <Spec label="Interior" value={vehicle.interiorColor} />
              <Spec label="Title" value={vehicle.titleStatus} />
            </dl>
          </section>

          <section className="panel">
            <h2>Selling dealership</h2>
            <div className="seller">
              <div className="seller__avatar" aria-hidden>
                {initials(vehicle.sellingDealership)}
              </div>
              <div>
                <p className="seller__name">{vehicle.sellingDealership}</p>
                <p className="seller__location">
                  {vehicle.city}, {vehicle.province}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="detail__bid-rail" aria-label="Bidding">
          <BidPanel vehicle={vehicle} />
        </aside>
      </div>
    </div>
  );
}

function Spec({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={numeric ? "numeric" : undefined}>{value}</dd>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
