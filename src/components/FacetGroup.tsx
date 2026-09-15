import { useId, useState, type ReactNode } from "react";
import type { FacetValue } from "../data";
import { ChevronDownIcon } from "./icons";

/**
 * A collapsible section of the filter panel.
 *
 * Collapsing is local state on purpose: which sections a buyer has open is a
 * viewing preference, not part of the search, so it has no business in the URL
 * or in a shared link.
 */
export function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="facet">
      <button
        type="button"
        className="facet__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {title}
        <ChevronDownIcon size={15} className="facet__chevron" data-open={open} />
      </button>
      {open ? (
        <div className="facet__body" id={panelId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Checkbox list for one facet.
 *
 * Counts come from the query layer, which computes them against every filter
 * *except* this one — so the numbers show what each option would add rather
 * than collapsing to zero as soon as a sibling is ticked.
 */
export function FacetCheckboxes({
  values,
  onToggle,
  formatLabel = (value) => value,
  limit,
}: {
  values: FacetValue[];
  onToggle: (value: string) => void;
  formatLabel?: (value: string) => string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = limit && !expanded ? values.slice(0, limit) : values;
  const hidden = values.length - visible.length;

  return (
    <>
      {visible.map((facet) => (
        <label
          key={facet.value}
          className="facet__option"
          data-empty={facet.count === 0 && !facet.selected}
        >
          <input
            type="checkbox"
            checked={facet.selected}
            onChange={() => onToggle(facet.value)}
          />
          <span className="facet__label">{formatLabel(facet.value)}</span>
          <span className="facet__count numeric">{facet.count}</span>
        </label>
      ))}

      {hidden > 0 ? (
        <button
          type="button"
          className="btn btn--link"
          style={{ marginTop: 6, justifySelf: "start" }}
          onClick={() => setExpanded(true)}
        >
          Show {hidden} more
        </button>
      ) : null}

      {expanded && limit ? (
        <button
          type="button"
          className="btn btn--link"
          style={{ marginTop: 6, justifySelf: "start" }}
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      ) : null}
    </>
  );
}
