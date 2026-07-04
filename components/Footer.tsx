import { product } from "@/lib/config";
import { Wordmark } from "./Wordmark";

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "PRODUCT",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Features",     href: "#features" },
      { label: "Early access", href: "#pricing" },
    ],
  },
  {
    heading: "COMPANY",
    links: [
      { label: "Contact", href: `mailto:${product.contactEmail}` },
      { label: "Privacy",  href: "#" },
      { label: "Terms",    href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer>
      <div className="footer-main">
        <div>
          <Wordmark />
          <p>{product.tagline}</p>
        </div>
        <div className="footer-links">
          {columns.map((col) => (
            <div key={col.heading}>
              <span>{col.heading}</span>
              {col.links.map((l) => (
                <a key={l.label} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 {product.name}. All rights reserved.</span>
        <span>Designed for people who think out loud.</span>
      </div>
    </footer>
  );
}
