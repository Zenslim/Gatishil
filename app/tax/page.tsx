// app/tax/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nepal True Tax Mirror — Landing | Gatishil Nepal",
  description: "Understand your hidden indirect taxes and see your true effective tax rate. Educational, fast, bilingual-ready.",
  openGraph: {
    title: "Nepal True Tax Mirror — Landing",
    description: "Reveal the hidden tax inside everyday prices, then calculate your true effective tax rate.",
    type: "website",
    url: "https://www.gatishilnepal.org/tax",
  },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="w-full border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Nepal True Tax Mirror <span className="opacity-70">/ सत्य कर दर्पण</span>
          </h1>
          <nav className="text-sm opacity-80 space-x-4 hidden md:block">
            <a className="underline hover:no-underline" href="/tax/calculator">Calculator</a>
          </nav>
        </div>
      </header>

      <section className="flex-1">
        <div className="relative w-full h-[calc(100vh-72px)] md:h-[calc(100vh-80px)]">
          <iframe
            title="Nepal True Tax Mirror — Landing"
            src="/tools/tax-landing.html"
            className="absolute inset-0 w-full h-full border-0"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs text-white/70">
          Built by Gatishil Nepal · Educational estimates only. Nothing is stored by default.
        </div>
      </footer>
    </main>
  );
}
