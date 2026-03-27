import type { Metadata } from "next";
import { Chakra_Petch, Silkscreen } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const bodyFont = Chakra_Petch({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Silkscreen({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "PixelParty",
  description:
    "A multiplayer bachelor-party game inspired by PixelForge, rebuilt as a Telegram-ready Next.js WebApp with a local simulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
