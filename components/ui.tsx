import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-2">
      <span className="h-px w-6 bg-accent/60" aria-hidden />
      {children}
    </span>
  );
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
  const alignment =
    align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col ${alignment} gap-4`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="max-w-2xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-xl text-balance text-base leading-relaxed text-white/55 sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Page section wrapper with consistent vertical rhythm + max width. */
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
    <section
      id={id}
      className={`relative mx-auto w-full max-w-content scroll-mt-24 px-5 py-20 sm:px-8 md:py-28 ${className}`}
    >
      {children}
    </section>
  );
}
