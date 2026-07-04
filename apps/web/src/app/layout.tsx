import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { BRAND_NAME, BRAND_TITLE } from "@/lib/brand";
import "./globals.css";

// Self-hosted at build time by next/font (downloaded into /_next/static), so
// nothing is fetched from a Google CDN at runtime — works with the strict
// `font-src 'self'` CSP and never falls back to Arial.
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Canonical origin for the live brand domain; makes every relative OG/twitter
  // image below resolve to an absolute https://keepitup.social/... URL.
  metadataBase: new URL("https://keepitup.social"),
  // One brand source of truth: a page sets just its own label (e.g. "Discover
  // events") and `%s` composes it with the brand name; pages that set no title
  // fall back to the full brand title.
  title: {
    default: BRAND_TITLE,
    template: `%s — ${BRAND_NAME}`,
  },
  description:
    "Meet compatible people through small, local sports — from running and padel to chess. Adults only, Europe first, privacy-first.",
  // Social preview for every route that doesn't override it: link reshares
  // (WhatsApp/IG DMs/X) render a real card instead of a bare URL.
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: BRAND_TITLE,
    description:
      "Meet compatible people through small, local sports — from running and padel to chess. Adults only, Europe first, privacy-first.",
    images: [
      {
        url: "/brand/keepitup-banner-social.png",
        width: 1500,
        height: 500,
        alt: `${BRAND_NAME} — meet through movement`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE,
    description:
      "Meet compatible people through small, local sports. Adults only, Europe first, privacy-first.",
    images: ["/brand/keepitup-banner-social.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
