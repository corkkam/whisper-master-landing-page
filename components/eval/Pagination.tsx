import Link from "next/link";

/**
 * Prev / next as real links, so the pages are crawlable and the browser's own
 * back button walks them. Rendered as spans at the ends rather than disabled
 * buttons: there is no link to give them.
 */
export default function Pagination({
  page,
  total,
  pageSize,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  params: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (target: number) => {
    const next = new URLSearchParams(params);
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return query ? `?${query}` : "?";
  };

  return (
    <nav className="ev-pg" aria-label="Pagination">
      {page > 1 ? (
        <Link className="ev-chip" href={href(page - 1)} rel="prev">
          &larr; Previous
        </Link>
      ) : (
        <span className="ev-chip ev-chip--off">&larr; Previous</span>
      )}
      <span className="ev-pg-at ev-term">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link className="ev-chip" href={href(page + 1)} rel="next">
          Next &rarr;
        </Link>
      ) : (
        <span className="ev-chip ev-chip--off">Next &rarr;</span>
      )}
    </nav>
  );
}
