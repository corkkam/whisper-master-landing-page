import { product } from "@/lib/config";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand ${className}`}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>{product.name.toLowerCase()}</span>
    </span>
  );
}

export function WordmarkCompact() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
