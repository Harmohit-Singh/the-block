/**
 * Page navigation with elided middle pages.
 *
 * Nine pages would fit inline today, but the component stays useful if the
 * inventory grows, and eliding keeps the control from wrapping on mobile.
 */
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className="pagination" aria-label="Inventory pages">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1}>
        Previous
      </button>

      {buildPageList(page, pageCount).map((entry, index) =>
        entry === "gap" ? (
          // eslint-disable-next-line react/no-array-index-key
          <span key={`gap-${index}`} className="pagination__gap" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Page ${entry}`}
          >
            {entry}
          </button>
        ),
      )}

      <button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount}>
        Next
      </button>
    </nav>
  );
}

/** Always shows the first page, the last page, and a window around the current one. */
function buildPageList(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);

  const result: Array<number | "gap"> = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push("gap");
    result.push(value);
    previous = value;
  }

  return result;
}
