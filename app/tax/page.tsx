// app/tax/page.tsx
"use client";

import Head from "next/head";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Page() {
  return (
    <>
      <Head>
        <title>Nepal True Tax Mirror — Landing | Gatishil Nepal</title>
        <meta
          name="description"
          content="Reveal the hidden indirect tax inside prices and see your true effective tax rate. Educational, fast, bilingual."
        />
        <meta property="og:title" content="Nepal True Tax Mirror — Landing" />
        <meta
          property="og:description"
          content="Reveal the hidden tax inside everyday prices, then calculate your true effective tax rate."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.gatishilnepal.org/tax" />
      </Head>

      <main className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Cosmic background */}
        <div className="absolute inset-0">
          <Starfield />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(66,0,255,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(0,180,255,0.16),transparent_60%)]" />
        </div>

        {/* Header */}
        <header className="relative z-10 w-full border-b border-white/10 backdrop-blur-sm/0">
          <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-lg md:text-2xl font-semibold tracking-tight"
            >
              Nepal True Tax Mirror <span className="opacity-70">/ सत्य कर दर्पण</span>
            </motion.h1>
            <nav className="hidden md:flex items-center gap-6 text-sm opacity-80">
              <a className="underline hover:no-underline" href="#why">Why</a>
              <a className="underline hover:no-underline" href="#how">How</a>
              <a className="underline hover:no-underline" href="/tax/calculator">Calculator</a>
            </nav>
          </div>
        </header>

        {/* HERO */}
        <section className="relative z-10">
          <div className="mx-auto max-w-7xl px-5 pt-10 md:pt-16 pb-10 md:pb-16 grid md:grid-cols-2 gap-10 items-center">
            <div className="relative">
              <AnimatePresence>
                <motion.h2
                  initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="text-3xl md:text-5xl font-black leading-tight tracking-[-0.02em]"
                >
                  The tax you{" "}
                  <span className="bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                    never see
                  </span>{" "}
                  is the one you feel.
                </motion.h2>
              </AnimatePresence>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mt-5 text-white/80 md:text-lg"
              >
                VAT, excise, fuel &amp; telecom levies hide inside prices. Stack the{" "}
                <span className="text-white">invisible</span> with your visible TDS to see your{" "}
                <span className="text-white">true effective tax rate</span>.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="mt-2 text-white/70"
              >
                देखिँदैन तर तिर्नुहुन्छ—मूल्यभित्र घुलाएको करलाई बाहिर ल्याएर एउटै{" "}
                <span className="text-white">सत्य प्रतिशत</span> देखाउनु नै हाम्रो लक्ष्य।
              </motion.p>

              <div className="mt-8 flex flex-wrap gap-3">
                <CTA href="/tax/calculator" label="Start Calculator" />
                <CTA href="#why" label="Why it matters" variant="ghost" />
              </div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-8 grid grid-cols-2 gap-3 max-w-md"
              >
                <Badge title="No sign-in" note="Nothing stored by default" />
                <Badge title="Editable assumptions" note="Conservative presets for Nepal" />
                <Badge title="Bilingual" note="English / नेपाली" />
                <Badge title="Mobile-first" note="< 2s load on 4G" />
              </motion.div>
            </div>

            {/* Right: motion “receipt” card */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 md:p-8 shadow-[0_0_80px_-20px_rgba(0,150,255,0.25)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wider text-white/70">Receipt Heatmap</span>
                  <span className="text-xs text-white/60">Live demo</span>
                </div>

                <div className="mt-5 space-y-4">
                  <Bar label="Fuel" value={72} hint="Excise+VAT inside pump price" />
                  <Bar label="Telecom" value={38} hint="Service charges embedded" />
                  <Bar label="Eating out" value={24} hint="Mostly VATable" />
                  <Bar label="Utilities" value={12} hint="Mixed pass-through" />
                </div>

                <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
                  <Stat title="Visible" value="Rs 8,540" sub="TDS + property" />
                  <Stat title="Hidden" value="Rs 13,780" sub="VAT + excise est." highlight />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mt-4 text-sm text-white/70"
                >
                  Example only—your number updates instantly in the calculator.
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section id="why" className="relative z-10 py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-5 grid md:grid-cols-3 gap-6">
            <WhyCard
              title="Clarity over shock"
              body="A single effective rate removes confusion. If prices feel heavy, this shows why—without blame."
              delay={0}
            />
            <WhyCard
              title="Fairness starts with knowing"
              body="Debate becomes honest when everyone sees the same stack: visible + hidden."
              delay={0.05}
            />
            <WhyCard
              title="Nepal-aware"
              body="Conservative defaults for VAT/excise/fuel/telecom pass-through—editable in ‘Advanced’."
              delay={0.1}
            />
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="relative z-10 pb-8 md:pb-12">
          <div className="mx-auto max-w-7xl px-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8"
            >
              <h3 className="text-xl md:text-2xl font-semibold">How it computes</h3>
              <p className="mt-3 text-white/80">
                Estimated Indirect Tax = Σ(Spendᵢ × PassThroughᵢ). Total Tax = Direct + Estimated Indirect.
                Effective Rate = Total Tax / Gross Income. We also show a low–high range using preset tables.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <CTA href="/tax/calculator" label="Open Calculator" />
                <a
                  href="/tax/calculator#advanced"
                  className="text-sm underline underline-offset-4 decoration-white/40 hover:decoration-white"
                >
                  Jump to Advanced
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CALCULATOR IFRAME (revealed with motion) */}
        <section className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full"
          >
            <div className="mx-auto max-w-7xl px-5 pb-4 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-semibold">Try it now</h3>
              <a
                className="text-sm underline underline-offset-4 decoration-white/40 hover:decoration-white"
                href="/tax/calculator"
              >
                Open full page
              </a>
            </div>
            <div className="relative w-full h-[82vh] md:h-[86vh]">
              <iframe
                title="Nepal True Tax Mirror — Calculator"
                src="/tools/nepal-tax-calculator.html"
                className="absolute inset-0 w-full h-full border-0 rounded-xl"
                loading="eager"
                referrerPolicy="no-referrer"
              />
              <GlowEdges />
            </div>
          </motion.div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-10 border-t border-white/10">
          <div className="mx-auto max-w-7xl px-5 py-4 text-xs text-white/70 flex flex-wrap items-center justify-between gap-3">
            <span>Built by Gatishil Nepal · Educational estimates · Nothing stored by default.</span>
            <a
              href="/tax/calculator"
              className="underline underline-offset-4 decoration-white/40 hover:decoration-white"
            >
              Go to Calculator
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}

/* ---------- UI atoms ---------- */

function CTA({ href, label, variant = "solid" }: { href: string; label: string; variant?: "solid" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center rounded-full text-sm md:text-base transition focus:outline-none focus:ring-2 focus:ring-cyan-300/40";
  if (variant === "ghost") {
    return (
      <motion.a
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        href={href}
        className={`${base} px-5 py-2.5 border border-white/20 bg-white/5 hover:bg-white/10`}
      >
        {label}
      </motion.a>
    );
  }
  return (
    <motion.a
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      href={href}
      className={`${base} px-6 py-2.5 bg-gradient-to-r from-cyan-400/90 via-sky-300/90 to-fuchsia-300/90 text-black font-semibold shadow-[0_0_60px_-10px_rgba(56,189,248,0.6)]`}
    >
      {label}
    </motion.a>
  );
}

function Badge({ title, note }: { title: string; note: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-white/70">{note}</div>
    </motion.div>
  );
}

function Bar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/90">{label}</span>
        <span className="text-white/70">{value}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-300"
        />
      </div>
      {hint && <div className="text-[11px] text-white/60">{hint}</div>}
    </div>
  );
}

function Stat({ title, value, sub, highlight = false }: { title: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="text-xs uppercase tracking-widest text-white/60">{title}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          highlight ? "bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-white/60">{sub}</div>}
    </div>
  );
}

function WhyCard({ title, body, delay = 0 }: { title: string; body: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className="rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-white/80">{body}</p>
    </motion.div>
  );
}

function GlowEdges() {
  return (
    <>
      <div className="pointer-events-none absolute -inset-1 rounded-xl blur-2xl bg-gradient-to-r from-cyan-500/10 via-white/0 to-fuchsia-500/10" />
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10" />
    </>
  );
}

/* ---------- Starfield canvas (minimal, smooth) ---------- */
function Starfield() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let width = (canvas.width = canvas.offsetWidth * devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * devicePixelRatio);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.8 + 0.2,
      r: Math.random() * 0.9 + 0.3,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        s.x += s.vx * s.z;
        s.y += s.vy * s.z;
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        g.addColorStop(0, "rgba(180,220,255,0.9)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      width = canvas.width = canvas.offsetWidth * devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };

    draw();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="w-full h-full" />;
}

/* ---------- ELI15 justification ----------
We kept your calculator intact and built a “jaw-dropping” Framer Motion landing around it—animated cosmic hero, glowing stats, and a smooth starfield—so users feel the invisible tax before they even click. It’s one file, no refactors, mobile-first, fast, and matches your homepage vibe.
----------------------------------------- */
