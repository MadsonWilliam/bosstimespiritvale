import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bosstime.spiritvale.local";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nojos Boss Time Spirit Vale — timers de world boss",
    template: "%s · Nojos Boss Time Spirit Vale",
  },
  description:
    "Rastreador comunitário de world boss de SpiritVale: timers de respawn por channel e servidor, localização das lápides e rota sugerida de farm.",
  keywords: [
    "SpiritVale",
    "boss timer",
    "world boss",
    "respawn",
    "MMORPG",
    "Spirit Vale",
  ],
  applicationName: "Nojos Boss Time",
  openGraph: {
    type: "website",
    siteName: "Nojos Boss Time Spirit Vale",
    title: "Nojos Boss Time Spirit Vale",
    description:
      "Timers de world boss por channel e servidor, lápides marcadas no mapa e rota sugerida.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06060a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
