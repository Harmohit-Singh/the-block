import { Link } from "react-router-dom";
import { useLiveVehicles } from "../data";
import { SearchIcon } from "./icons";

/** Persistent header with a home link and the live-lot count. */
export function AppHeader() {
  const liveCount = useLiveVehicles().filter((vehicle) => vehicle.status === "live").length;

  return (
    <header className="header">
      <Link to="/" className="header__brand">
        The<span>Block</span>
      </Link>
      <div className="header__search" role="status">
        <SearchIcon size={16} />
        <span>Search coming soon</span>
      </div>
      <p className="header__count">
        <strong style={{ color: "var(--live)" }}>{liveCount}</strong> lots live now
      </p>
    </header>
  );
}
