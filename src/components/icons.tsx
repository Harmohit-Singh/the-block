/**
 * Inline SVG icons.
 *
 * Hand-rolled rather than pulled from an icon package: the app needs eight of
 * them, and inlining keeps the bundle and the dependency list smaller than the
 * icons themselves would be.
 */

import type { SVGProps } from "react";

/**
 * Extends the real SVG props so callers can pass `className`, `data-*`, and
 * anything else through to the element. Typing this as a bare
 * `{ size?, className? }` silently swallowed a `data-open` attribute that the
 * stylesheet depended on, because TypeScript does not check hyphenated JSX
 * attributes against a component's prop type.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  size?: number;
};

function svgProps({ size = 16, ...rest }: IconProps) {
  return {
    ...rest,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M12 3a9 9 0 0 1 9 9M12 3a9 9 0 0 0-9 9m11.1-1.1 3.4-3.4" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function ImageOffIcon(props: IconProps) {
  return (
    <svg {...svgProps({ ...props, size: props.size ?? 28 })}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
