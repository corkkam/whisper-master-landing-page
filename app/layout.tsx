import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import JoinProvider from "@/components/waitlist/JoinContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-base-900 font-sans antialiased">
        <JoinProvider>{children}</JoinProvider>
      </body>
    </html>
  );
}
