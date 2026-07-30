import { product } from "@/lib/config";

/**
 * Four bars at different heights — a mic level meter, which is the one
 * instrument this product actually is. Animated only via CSS so it can render
 * on the server.
 */
export function LevelMark({ className = "" }: { className?: string }) {
  return (
    <span className={`level-mark ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <LevelMark />
      <span className="wordmark-text">
        whisper<em>master</em>
      </span>
    </span>
  );
}
