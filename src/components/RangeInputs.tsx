import { useEffect, useState } from "react";
import { formatCurrency, formatOdometer } from "../lib/format";

/**
 * Numeric filter controls.
 *
 * All of these hold a local draft and only commit on blur, Enter, or pointer
 * release. Writing to the URL on every keystroke or slider pixel would push a
 * history entry per character and re-run the query dozens of times for one
 * adjustment.
 */

export function PriceRange({
  min,
  max,
  bounds,
  onCommit,
}: {
  min: number | null;
  max: number | null;
  bounds: { priceMin: number; priceMax: number };
  onCommit: (next: { priceMin: number | null; priceMax: number | null }) => void;
}) {
  const [draftMin, setDraftMin] = useState(min === null ? "" : String(min));
  const [draftMax, setDraftMax] = useState(max === null ? "" : String(max));

  // Resync when the query changes from elsewhere, e.g. "Clear all".
  useEffect(() => setDraftMin(min === null ? "" : String(min)), [min]);
  useEffect(() => setDraftMax(max === null ? "" : String(max)), [max]);

  const commit = () => {
    const parse = (value: string) => {
      const parsed = Number(value);
      return value.trim() === "" || !Number.isFinite(parsed) ? null : parsed;
    };

    const nextMin = parse(draftMin);
    const nextMax = parse(draftMax);

    // Swap rather than reject: a buyer who types them backwards meant a range.
    const swap = nextMin !== null && nextMax !== null && nextMin > nextMax;
    onCommit({
      priceMin: swap ? nextMax : nextMin,
      priceMax: swap ? nextMin : nextMax,
    });
  };

  return (
    <div className="facet__range">
      <input
        type="number"
        inputMode="numeric"
        aria-label="Minimum price"
        placeholder={formatCurrency(bounds.priceMin).replace("$", "")}
        value={draftMin}
        onChange={(event) => setDraftMin(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
      <span>to</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label="Maximum price"
        placeholder={formatCurrency(bounds.priceMax).replace("$", "")}
        value={draftMax}
        onChange={(event) => setDraftMax(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
    </div>
  );
}

export function OdometerSlider({
  value,
  maxKm,
  onCommit,
}: {
  value: number | null;
  maxKm: number;
  onCommit: (next: number | null) => void;
}) {
  const ceiling = Math.ceil(maxKm / 10_000) * 10_000;
  const [draft, setDraft] = useState(value ?? ceiling);

  useEffect(() => setDraft(value ?? ceiling), [value, ceiling]);

  return (
    <div>
      <div className="facet__slider-value">
        <span>Up to</span>
        <span className="numeric">
          {draft >= ceiling ? "Any" : formatOdometer(draft)}
        </span>
      </div>
      <input
        className="facet__slider"
        type="range"
        min={0}
        max={ceiling}
        step={5_000}
        value={draft}
        aria-label="Maximum odometer"
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={() => onCommit(draft >= ceiling ? null : draft)}
        onKeyUp={() => onCommit(draft >= ceiling ? null : draft)}
      />
    </div>
  );
}

export function GradeSlider({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? 1);

  useEffect(() => setDraft(value ?? 1), [value]);

  return (
    <div>
      <div className="facet__slider-value">
        <span>Minimum grade</span>
        <span className="numeric">{draft <= 1 ? "Any" : draft.toFixed(1)}</span>
      </div>
      <input
        className="facet__slider"
        type="range"
        min={1}
        max={5}
        step={0.5}
        value={draft}
        aria-label="Minimum condition grade"
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={() => onCommit(draft <= 1 ? null : draft)}
        onKeyUp={() => onCommit(draft <= 1 ? null : draft)}
      />
    </div>
  );
}
