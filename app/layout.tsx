import type { Metadata, Viewport } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import JoinProvider from "@/components/waitlist/JoinContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://whispr.app"),
  title: "Whispr — Type at the speed of thought, privately",
  description:
    "Whispr turns natural speech into clean, formatted text in any app — transcribed 100% on your device. Nothing is uploaded, stored, or trained on. Join the waitlist.",
  keywords: [
    "voice to text",
    "dictation",
    "on-device transcription",
    "private speech to text",
    "voice productivity",
  ],
  openGraph: {
    title: "Whispr — Type at the speed of thought, privately",
    description:
      "Voice-to-text that never leaves your device. Join the waitlist for early access.",
    type: "website",
    siteName: "Whispr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whispr — Type at the speed of thought, privately",
    description: "Voice-to-text that never leaves your device.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0b",
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
      <html lang="en" className={`${manrope.variable} ${dmMono.variable}`}>
        <body className="bg-base font-sans antialiased">
          <JoinProvider>{children}</JoinProvider>
          <SpeedInsights />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
