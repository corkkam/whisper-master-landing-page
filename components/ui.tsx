import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="kicker">{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
}) {
  const cls = align === "center" ? "section-heading centered" : "section-heading";
  return (
    <div className={cls}>
      <div className="kicker">{eyebrow}</div>
      <h2>{title}</h2>
      {subtitle && <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.75 }}>{subtitle}</p>}
    </div>
  );
}

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`section ${className}`}>
      {children}
    </section>
  );
}
