// app/alumni/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gatishil Alumni Engine — SEBS → 6,743 Wards",
  description:
    "Turn the SEBS network into a living engine: mobilize mentors, monetize micro-ventures, and settle cash weekly with receipts. One rhythm, 6,743 wards.",
  openGraph: {
    title: "Gatishil Alumni Engine — SEBS → 6,743 Wards",
    description:
      "Mobilize & monetize the SEBS network with ward kits, an umbrella marketplace, and Friday settlements.",
    type: "website",
  },
};

export default function AlumniEnginePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm">
              <span>🎓 SEBS → 🛠️ Wards → 💸 Friday Payouts</span>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Gatishil Alumni Engine
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
              Turn 4,500+ alumni into a nation-scale production network.
              One rhythm: <span className="text-white">Make → Sell → Settle → Show</span>.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/join?src=alumni"
                className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-white/90"
              >
                Join a Guild
              </Link>
              <Link
                href="/chautari"
                className="rounded-xl border border-white/20 px-5 py-3 font-semibold hover:bg-white/10"
              >
                Visit Chauṭarī
              </Link>
              <Link
                href="/sunlight"
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-400/20"
              >
                See Sunlight (Proofs)
              </Link>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),rgba(0,0,0,0))]" />
      </section>

      {/* The Promise */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-8 md:grid-cols-3">
            <Card
              emoji="🧭"
              title="One Purpose"
              text="Alumni power local dignity: each ward runs a tiny factory, a clean ledger, and a weekly payout."
            />
            <Card
              emoji="🛒"
              title="One Marketplace"
              text="All wards sell under one roof. Umbrella handles checkout, logistics, taxes, and settlements."
            />
            <Card
              emoji="🧾"
              title="One Truth"
              text="Every rupee leaves a receipt. Ledgers are append-only. Corrections happen by reversal, never delete."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t border-white/10 bg-white/5">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-semibold">How the Engine Runs</h2>
          <p className="mt-3 max-w-3xl text-white/80">
            Alumni pick a primary ward and a primary role. Wards produce in small,
            repeatable units. The umbrella store sells nationwide. Money settles
            every Friday. Sunlight pages show the trail.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Step
              number="1"
              title="Guilds Mobilize"
              lines={[
                "🎓 Mentor Guild: 1 hour/week office hours.",
                "💰 Capital Guild: Alumni Notes @ 10% for assets.",
                "🧪 Skills Guild: packaging, QA, microsites, ops.",
              ]}
            />
            <Step
              number="2"
              title="Ward Kits Monetize"
              lines={[
                "🍯 Mushrooms/Honey | 🪵 CNC Woodcraft | 🎁 Festival Boxes",
                "QR batch labels → receipts & worker payments.",
                "No cash outside the bank; everything reconciles nightly.",
              ]}
            />
            <Step
              number="3"
              title="Umbrella Settles"
              lines={[
                "Single intake (gateway/bank) with order splits by ward.",
                "Weekly settlements per ward; two-key payouts.",
                "Platform fee (8–12%) funds ops, audits, training.",
              ]}
            />
            <Step
              number="4"
              title="Sunlight Proves"
              lines={[
                "Public ledgers per ward & umbrella.",
                "Reversal-only corrections; audit trails are permanent.",
                "Receipts, manifests, and bank lines match.",
              ]}
            />
          </div>
        </div>
      </section>

      {/* 90-Day Sprint */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-semibold">90-Day Alumni Sprint</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Sprint
              title="Days 0–7"
              points={[
                "Pick your Primary Ward & Guild.",
                "Pledge alumni hours or pre-orders.",
                "Seed 10 pilot wards (2 per province).",
              ]}
            />
            <Sprint
              title="Weeks 2–4"
              points={[
                "Stand up one revenue machine per pilot.",
                "Turn on pre-orders; show receipts daily.",
                "Publish first Friday payouts.",
              ]}
            />
            <Sprint
              title="Weeks 5–12"
              points={[
                "Scale to 50 wards cleanly.",
                "Release investor statements & audits.",
                "Lock the weekly rhythm.",
              ]}
            />
          </div>
          <div className="mt-8">
            <Link
              href="/join?src=alumni-sprint"
              className="inline-block rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-white/90"
            >
              I’m In — Add Me to a Guild
            </Link>
          </div>
        </div>
      </section>

      {/* Dabba Rhythm */}
      <section className="border-t border-white/10 bg-white/5">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-semibold">Dabba Rhythm (Logistics that Don’t Break)</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Bullet
              title="Big Stickers, Fixed Windows"
              text="Colors/glyphs route totes; hubs cross-dock not store. Miss a window? Next slot. Paper manifest first; QR optional."
              icon="📦"
            />
            <Bullet
              title="Nightly Closure"
              text="Bank import → match orders → queue settlements. Variance near zero is the game."
              icon="🌙"
            />
            <Bullet
              title="Friday is Sacred"
              text="Weekly per-ward payouts with PDFs. No exceptions. Trust compounds on schedule."
              icon="📅"
            />
            <Bullet
              title="Auditor View"
              text="Read-only recompute of totals from raw rows. Receipts and reversals visible to the public."
              icon="🔍"
            />
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-semibold">What We Track (fits on one screen)</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <KPI label="Wards Active" value="→ 1,000 in Wave 2" />
            <KPI label="On-Time Dispatch" value="≥ 95%" />
            <KPI label="Bank ≈ Ledger Variance" value="≈ 0" />
            <KPI label="Payouts on Schedule" value="100%" />
            <KPI label="Households Paid / Week" value="Climbing" />
            <KPI label="Platform Fee (Ops Fuel)" value="8–12%" />
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h3 className="text-2xl font-semibold">
            Feelings → Factories. Stories → Statements. Hope → Payroll.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">
            Choose a ward. Choose a guild. Give an hour, a pre-order, or an asset note.
            We’ll show the receipts every Friday.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/join?src=alumni-hero"
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-white/90"
            >
              Start as Alumni
            </Link>
            <Link
              href="/alumni/faq"
              className="rounded-xl border border-white/20 px-5 py-3 font-semibold hover:bg-white/10"
            >
              Read the FAQ
            </Link>
            <Link
              href="/sunlight"
              className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 font-semibold text-emerald-300 hover:bg-emerald-400/20"
            >
              Verify the Ledger
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ——— UI Bits ——— */

function Card({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-white/80">{text}</p>
    </div>
  );
}

function Step({
  number,
  title,
  lines,
}: {
  number: string;
  title: string;
  lines: string[];
}) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-black p-6">
      <div className="absolute -top-3 -left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black font-bold">
        {number}
      </div>
      <h3 className="pl-10 text-xl font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2 pl-10 text-white/80">
        {lines.map((l, i) => (
          <li key={i} className="leading-relaxed">• {l}</li>
        ))}
      </ul>
    </div>
  );
}

function Sprint({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h4 className="text-lg font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-white/80">
        {points.map((p, i) => (
          <li key={i}>• {p}</li>
        ))}
      </ul>
    </div>
  );
}

function Bullet({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-6">
      <div className="text-3xl">{icon}</div>
      <h4 className="mt-2 text-lg font-semibold">{title}</h4>
      <p className="mt-2 text-white/80">{text}</p>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
