import { useState } from "react";
import { ImageOffIcon } from "./icons";

/**
 * Vehicle photo with a graceful failure mode.
 *
 * Every image in the dataset is a remote `placehold.co` URL, so a slow or
 * blocked CDN would otherwise leave 24 broken-image icons on the grid. Failures
 * fall back to a neutral placeholder, and off-screen images load lazily so the
 * first paint is not waiting on two dozen network requests.
 */
export function VehicleImage({
  src,
  alt,
  eager = false,
}: {
  src: string | undefined;
  alt: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="card__fallback" role="img" aria-label={`${alt} (no photo available)`}>
        <ImageOffIcon />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
