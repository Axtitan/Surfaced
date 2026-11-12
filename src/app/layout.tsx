import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Tracking from "@/components/Tracking";
import { BRAND, SITE_URL } from "@/lib/site-url";

const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz", "SOFT"] });

const description = "Check whether ChatGPT, Claude, Gemini and DeepSeek recommend your business, then get listed on the sites they read.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Surfaced: be the answer when buyers ask AI", template: "%s · Surfaced" },
  description,
  applicationName: BRAND.name,
  openGraph: { type: "website", siteName: BRAND.name, title: "Surfaced: be the answer when buyers ask AI", description, url: "/" },
  twitter: { card: "summary_large_image", title: "Surfaced: be the answer when buyers ask AI", description },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen">
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
        <Tracking />
      </body>
    </html>
  );
}
