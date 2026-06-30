"use client";

import { Waitlist } from "@clerk/nextjs";
import { XIcon } from "@/components/icons";

export default function ClerkWaitlistModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-base-800 text-white/60 shadow-lg transition hover:text-white"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
        <Waitlist
          appearance={{
            elements: {
              // Waitlist-only: hide the "Already have access? Sign in" footer.
              footerAction: { display: "none" },
              footerActionLink: { display: "none" },
            },
          }}
        />
      </div>
    </div>
  );
}
