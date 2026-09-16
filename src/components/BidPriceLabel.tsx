import type { Bid, Vehicle } from "../data";

export function BidPriceLabel({
  vehicle,
  userBids,
}: {
  vehicle: Vehicle;
  userBids: readonly Bid[];
}) {
  if (vehicle.currentBid === null) return <>Starting bid</>;

  const isUsersCurrentBid = userBids.some(
    (bid) => bid.amount === vehicle.currentBid,
  );

  return (
    <>
      Current bid ·{" "}
      <span className={isUsersCurrentBid ? "bid-owner bid-owner--yours" : "bid-owner"}>
        {isUsersCurrentBid ? "Yours" : "Another bidder"}
      </span>
    </>
  );
}
