import "@/lib/supa";
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import TinaProvider from "@/components/tina/TinaProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gatishil — DAO · Guthi · Movement | गतिशील — DAO · गुठी · आन्दोलन",
  description:
    "The DAO Party of the Powerless. Build parallel life, restore culture, and grow cooperative wealth. शक्तिहीनहरूको DAO पार्टी। समानान्तर जीवन निर्माण गरौं, संस्कृतिको पुनर्जागरण गरौं, सहकारी समृद्धि बढाऔं।",
  keywords: [
    "Gatishil Nepal",
    "DAO",
    "Guthi",
    "Nepal Movement",
    "Decentralized Governance",
    "Cooperative Democracy",
  ],
  openGraph: {
    title: "Gatishil — DAO · Guthi · Movement | गतिशील — DAO · गुठी · आन्दोलन",
    description:
      "Not another party of faces, but a movement that makes thrones irrelevant. यो अनुहारहरूको अर्को पार्टी होइन, सिंहासनलाई निरर्थक बनाउने आन्दोलन हो।",
    url: "https://www.gatishilnepal.org",
    siteName: "Gatishil Nepal",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Gatishil Nepal — DAO · Guthi · Movement | गतिशील नेपाल — DAO · गुठी · आन्दोलन",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gatishil — DAO · Guthi · Movement | गतिशील — DAO · गुठी · आन्दोलन",
    description: "Democracy That Flows — Not Stagnates. जसमा लोकतन्त्र बग्छ — रोकिन्न।",
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
      {/* Metadata handles most head needs */}
      <head>
        <meta name="theme-color" content="#000000" />
        {/* Client-only i18n auto: runs after hydration; never touches server */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    if (typeof window !== 'undefined') {
      // Fire and forget; avoid blocking render and swallow any network errors
      fetch('/api/i18n/auto', { method: 'POST' }).catch(function(){});
    }
  } catch(_) {}
})();
`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <TinaProvider>
          <Providers>
            <Nav />
            {children}
          </Providers>
        </TinaProvider>
      </body>
    </html>
  );
}
