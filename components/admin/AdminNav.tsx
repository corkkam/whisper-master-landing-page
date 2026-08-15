import Link from "next/link";

/**
 * The tab strip across the three founder-only surfaces.
 *
 * Takes the active tab as a prop rather than reading `usePathname()`, which
 * keeps it a server component. A client component here would be the only
 * client boundary on an otherwise fully server-rendered page, for the sake of
 * a string each page already knows about itself.
 */
const TABS = [
  { href: "/admin", label: "Overview", key: "overview" },
  { href: "/admin/users", label: "Users", key: "users" },
  { href: "/admin/beta", label: "Beta", key: "beta" },
] as const;

export type AdminTab = (typeof TABS)[number]["key"];

export default function AdminNav({ current }: { current: AdminTab }) {
  return (
    <nav className="ad-tabs" aria-label="Admin sections">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`ad-tab${tab.key === current ? " is-current" : ""}`}
          aria-current={tab.key === current ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
