"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * Filters for the proof sheet, held in the URL rather than in component state.
 *
 * A filtered view of an eval run is a thing people link to when they are
 * arguing about a specific failure, so it has to survive being pasted into a
 * message. Keeping it in `searchParams` also means the filtering itself stays
 * on the server, next to the data, instead of shipping every case to the
 * browser so the browser can hide most of them.
 *
 * The search box is debounced because each keystroke would otherwise be a
 * server round trip; `useTransition` keeps the old list on screen while the new
 * one is fetched, so the page dims rather than emptying.
 */
const DEBOUNCE_MS = 300;

export default function CaseFilters({
  sources,
  initialQuery,
  outcome,
  source,
}: {
  sources: { value: string; label: string }[];
  initialQuery: string;
  outcome: string;
  source: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(initialQuery);

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, value);
    }
    // Any filter change invalidates the page number: page 4 of an unfiltered
    // run is usually past the end of a filtered one, which reads as "no cases
    // match" when plenty do.
    next.delete("page");
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (text === initialQuery) return;
    const timer = setTimeout(() => apply({ q: text }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `apply` closes over the current params on purpose; re-running on every
    // params change would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const toggle = (key: string, current: string, value: string) =>
    apply({ [key]: current === value ? null : value });

  return (
    <div className="ev-filters" data-pending={pending ? "true" : undefined}>
      <input
        className="ev-search"
        placeholder="Search transcripts and case ids"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Search cases"
      />
      <div className="ev-chips">
        <button
          className="ev-chip ev-chip--pen"
          aria-pressed={outcome === "fail"}
          onClick={() => toggle("outcome", outcome, "fail")}
        >
          Needs review
        </button>
        <button
          className="ev-chip"
          aria-pressed={outcome === "pass"}
          onClick={() => toggle("outcome", outcome, "pass")}
        >
          Clean
        </button>
        {sources.map((s) => (
          <button
            className="ev-chip"
            key={s.value}
            aria-pressed={source === s.value}
            onClick={() => toggle("source", source, s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
