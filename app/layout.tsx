import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import JoinProvider from "@/components/waitlist/JoinContext";
import SmoothScroll from "@/components/chrome/SmoothScroll";
import Cursor from "@/components/chrome/Cursor";
import SignalSpine from "@/components/chrome/SignalSpine";
import CookieConsent from "@/components/chrome/CookieConsent";
import GoogleAnalytics from "@/components/chrome/GoogleAnalytics";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { product } from "@/lib/config";

// Display face. Headlines lean on weight 800 and tight tracking (-0.045em to
// -0.055em) rather than the width axis; see `.hero-name` / `.section-title`.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Data, labels, and anything the app itself would render in monospace.
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
  metadataBase: new URL("https://whispermaster.app"),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "voice to text",
    "mac dictation",
    "on-device transcription",
    "private speech to text",
    "voice productivity",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: product.name,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "Voice-to-text that never leaves your Mac.",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090e",
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
        className={`${display.variable} ${sans.variable} ${mono.variable}`}
      >
        <body className="antialiased">
          <SmoothScroll>
            <JoinProvider>
              {/* Signature element: a mic-level waveform down the page edge that
                  reacts to scroll velocity. Purely decorative, hidden from AT. */}
              <SignalSpine />
              {children}
            </JoinProvider>
          </SmoothScroll>
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
