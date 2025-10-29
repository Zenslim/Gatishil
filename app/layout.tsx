import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
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
    "Cooperative Democracy",
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
        alt: "Gatishil Nepal — DAO · Guthi · Movement",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gatishil — DAO · Guthi · Movement",
    description: "Democracy That Flows — Not Stagnates.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://www.gatishilnepal.org"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Extra head tags are optional because Metadata covers most cases */}
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
