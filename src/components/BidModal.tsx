import { useEffect, useRef } from "react";
import { useVehicle } from "../data";
import { BidPanel } from "./BidPanel";
import { CloseIcon } from "./icons";

export function BidModal({
  vehicleId,
  onClose,
}: {
  vehicleId: string;
  onClose: () => void;
}) {
  const vehicle = useVehicle(vehicleId);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  if (!vehicle) return null;

  return (
    <div className="bid-modal" role="presentation">
      <button
        type="button"
        className="bid-modal__backdrop"
        aria-label="Close bidding dialog"
        onClick={onClose}
      />
      <section
        className="bid-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bid-modal-title"
      >
        <div className="bid-modal__head">
          <div>
            <span className="bid-modal__eyebrow">Place a bid</span>
            <h2 id="bid-modal-title">{vehicle.displayName}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close bidding dialog"
          >
            <CloseIcon size={19} />
          </button>
        </div>
        <div className="bid-modal__body">
          <BidPanel vehicle={vehicle} />
        </div>
      </section>
    </div>
  );
}
