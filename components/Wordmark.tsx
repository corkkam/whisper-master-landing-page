import { product } from "@/lib/config";

/** Clean wordmark: a small voice-glyph mark + the product name. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/30"
        aria-hidden
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#A5B4FC"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M5 10v4" />
          <path d="M9 6v12" />
          <path d="M13 3v18" />
          <path d="M17 7v10" />
          <path d="M21 10v4" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-white">
        {product.name}
      </span>
    </span>
  );
}
