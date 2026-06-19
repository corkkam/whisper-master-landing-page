import { product } from "@/lib/config";
import { Wordmark } from "./Wordmark";

const columns: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Product",
      links: [
        { label: "How it works", href: "#how-it-works" },
        { label: "Features", href: "#features" },
        { label: "Early access", href: "#pricing" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
        { label: "Security", href: "#" },
      ],
    },
  ];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-white/[0.015]">
      <div className="mx-auto grid w-full max-w-content gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-white/45">
            {product.tagline}
          </p>
          <a
            href={`mailto:${product.contactEmail}`}
            className="mt-4 inline-block text-sm text-white/55 underline-offset-4 transition hover:text-white hover:underline"
          >
            {product.contactEmail}
          </a>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <h3 className="text-sm font-semibold text-white/80">
              {col.heading}
            </h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-white/45 transition hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-content flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-white/35 sm:flex-row sm:px-8">
          <p>
            © {new Date().getFullYear()} {product.name}. All rights reserved.
          </p>
          <p>Designed for people who think out loud.</p>
        </div>
      </div>
    </footer>
  );
}
