import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import JoinProvider from "@/components/waitlist/JoinContext";
import SmoothScroll from "@/components/chrome/SmoothScroll";
import Cursor from "@/components/chrome/Cursor";
import SignalSpine from "@/components/chrome/SignalSpine";
import ScreenFrame from "@/components/chrome/ScreenFrame";
import DictationProvider from "@/components/chrome/DictationContext";
import CookieConsent from "@/components/chrome/CookieConsent";
import GoogleAnalytics from "@/components/chrome/GoogleAnalytics";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { product } from "@/lib/config";
import { siteUrl } from "@/lib/site";

/**
 * The Mac app's three faces, so the site is set in the product's own voice
 * rather than one invented for marketing.
 *
 * `Sources/WhisperMaster/UI/Theme.swift` fixes these: Bricolage Grotesque for
 * display and titles, tightly tracked; Instrument Sans for body and UI. The app
 * uses SF Mono as its utility face — unavailable on the web, and JetBrains Mono
 * is the substitution its own docs name, so that is what runs here.
 */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});

const body = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"],
});

const TITLE = `${product.name} — talk to your Mac, privately`;
const DESCRIPTION =
  "Whisper Master turns speech into clean, formatted text in any Mac app — transcribed entirely on your device. No cloud round-trip, no audio uploaded, works offline.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  // No `template` here on purpose: every sub-page already sets a full
  // "Page — Whisper Master" title, so a template would suffix the brand twice.
  title: TITLE,
  description: DESCRIPTION,
  applicationName: product.name,
  alternates: { canonical: "/" },
  // Search intent, not vanity terms. These are the queries someone types when
  // they already know they have this problem — low volume, high conversion —
  // and they name the actual competitive set rather than "typing".
  keywords: [
    "mac dictation app",
    "offline dictation mac",
    "on-device transcription",
    "private speech to text",
    "dictation without cloud",
    "superwhisper alternative",
    "macwhisper alternative",
    "hipaa dictation software",
    "voice to text mac",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: product.name,
    locale: "en_US",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "Voice-to-text that never leaves your Mac.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: "#f4e6cd",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${display.variable} ${body.variable} ${mono.variable}`}
      >
        <body className="antialiased">
          {/* Keyboard users land here first and can jump the island nav. */}
          <a className="skip-link" href="#top">
            Skip to content
          </a>
          <SmoothScroll>
            <JoinProvider>
              {/* One clock for the demo, shared by the notch in the bezel and
                  the capture panel in the hero — see DictationContext. */}
              <DictationProvider>
                {/* Signature element: a mic-level waveform down the page edge
                    that reacts to scroll velocity. Decorative, hidden from AT. */}
                <SignalSpine />
                {children}
              </DictationProvider>
            </JoinProvider>
          </SmoothScroll>
          {/* The viewport is being read as a Mac display; these are its corners. */}
          <ScreenFrame />
          <Cursor />
          <CookieConsent />
          <SpeedInsights />
          <Analytics />
          {/* GA4 stays dark until CookieConsent says otherwise. */}
          <GoogleAnalytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
