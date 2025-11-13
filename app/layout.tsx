// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gatishil — DAO · Guthi · Movement",
  description:
    "The DAO Party of the Powerless. Build parallel life, restore culture, and grow cooperative wealth.",
  keywords: [
    "Gatishil Nepal",
    "DAO",
    "Guthi",
    "Nepal Movement",
    "Decentralized Governance",
    "Cooperative Democracy"
  ],
  openGraph: {
    title: "Gatishil — DAO · Guthi · Movement",
    description:
      "Not another party of faces, but a movement that makes thrones irrelevant.",
    url: "https://www.gatishilnepal.org",
    siteName: "Gatishil Nepal",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Gatishil Nepal — DAO · Guthi · Movement"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Gatishil — DAO · Guthi · Movement",
    description: "Democracy That Flows — Not Stagnates.",
    images: ["/og-image.png"]
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://www.gatishilnepal.org")
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Favicon + PWA basics */}
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#000000" />

        {/* iOS PWA friendliness */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {/* Global navbar */}
        <Nav />
        {/* Content */}
        <main className="min-h-screen">{children}</main>

        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                  navigator.serviceWorker
                    .register("/sw.js")
                    .catch((err) => console.error("SW registration failed", err));
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
