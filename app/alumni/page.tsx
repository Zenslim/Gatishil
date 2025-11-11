// app/alumni/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gatishil Alumni Engine — SEBS → 6,743 Wards",
  description:
    "Turn the SEBS network into a living engine: Make → Sell → Settle → Show. One OS for 6,743 wards, Friday payouts, public receipts, 2% platform fee.",
  openGraph: {
    title: "Gatishil Alumni Engine — SEBS → 6,743 Wards",
    description:
      "Mobilize mentors, monetize micro-ventures, weekly settlements, Sunlight proofs. No donors—just receipts. 2% platform fee.",
    type: "website",
  },
};

export default function AlumniEnginePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm">
            <span>🎓 SEBS → 🛠️ Wards → 💸 Friday Payouts → 🔆 Sunlight</span>
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Gatishil Alumni Engine
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
            Turn 4,500+ alumni into a nation-scale production network. One rhythm:
            <span className="text-white"> Make → Sell → Settle → Show</span>.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CTA href="/join?src=alumni" label="Join a Guild" variant="primary" />
            <CTA href="/chautari" label="Visit Chautari" />
            <CTA href="/sunlight" label="See Transparent Ledger (Sunlight Proofs)" variant="accent" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),rgba(0,0,0,0))]" />
      </section>

      {/* Core Promise */}
      <Section border>
        <Grid3>
          <Card
            emoji="🧭"
            title="One Purpose"
            text="Alumni power ward-level dignity: tiny factories, clean ledgers, weekly payouts."
          />
          <Card
            emoji="🛒"
            title="One Marketplace"
            text="All wards sell under one roof. Umbrella handles checkout, logistics, taxes, and settlements."
          />
          <Card
            emoji="🧾"
            title="One Truth"
            text="Every rupee leaves a receipt. Ledgers are append-only. Corrections are reversals—never deletes."
          />
        </Grid3>
      </Section>

      {/* What it is (Scope) */}
      <Section label="What it is (Scope)" shaded>
        <Grid3>
          <ScopeCard
            title="Inventory"
            lines={[
              "Inputs, harvest lots, batch codes.",
              "Movements: store ↔ truck ↔ kiosk.",
            ]}
          />
          <ScopeCard
            title="Procurement & Sales"
            lines={[
              "GRN (Goods Received Note) from farmers/members.",
              "Orders & invoices to buyers.",
            ]}
          />
          <ScopeCard
            title="Accounting"
            lines={[
              "Real-time double-entry.",
              "Append-only; fixes via reversal.",
            ]}
          />
          <ScopeCard
            title="Investor Portal"
            lines={[
              "Fixed 10% model (Alumni Notes).",
              "Balances/statements from ledger.",
            ]}
          />
          <ScopeCard
            title="HR (Human Resources)"
            lines={[
              "Attendance → payroll accrual.",
              "Payouts posted as journals.",
            ]}
          />
          <ScopeCard
            title="Governance"
            lines={[
              "Proposals & votes tied to money.",
              "Nightly snapshots for history.",
            ]}
          />
          <ScopeCard
            title="Public Transparency"
            lines={[
              "Sunlight site with Verify.",
              "Hash + daily snapshot to GitHub.",
            ]}
          />
        </Grid3>
      </Section>

      {/* Users & Top Jobs */}
      <Section label="Users & Top Jobs" border>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <UserCard who="Villager/Public" job='“Show me where money went and prove bills are real.”' />
          <UserCard who="Farmer/Member" job='“Record my harvest; see if I’ve been paid.”' />
          <UserCard who="Storekeeper" job='“Receive → move → dispatch stock simply.”' />
          <UserCard who="CEO/Accountant" job='“Post decisions fast; corrections via reversal only.”' />
          <UserCard who="Investor" job='“See principal + interest; download signed statement.”' />
          <UserCard who="Member (voter)" job='“Propose, vote, and see the money move accordingly.”' />
          <UserCard who="Auditor/Journalist" job='“Verify files and hashes without asking anyone.”' />
        </div>
      </Section>

      {/* Self-Sustaining Plan */}
      <Section label="The Self-Sustaining Plan (ELI15)" shaded>
        {/* 1) Flywheel */}
        <Block title="1) The Flywheel (one sentence)">
          <p className="text-white/80">
            <b>Make → Sell → Settle → Show</b> repeats daily:
            wards make goods → umbrella sells → money settles back weekly →
            the Sunlight page shows every rupee → trust grows → more wards join → more goods flow.
          </p>
        </Block>

        {/* 2) Operating System */}
        <Block title="2) The Operating System (same everywhere)">
          <ul className="mt-3 space-y-2 text-white/80">
            <li>• <b>Ward Kit</b>: batches, inventory lots, orders, payouts, QR proofs, reversal-only ledger, bilingual UI.</li>
            <li>• <b>Umbrella MPC</b>: one store for all wards, one treasury intake, nightly bank reconciliation, weekly per-ward settlements, festival/wholesale bundles.</li>
            <li>• <b>Dabba rules</b>: big color/glyph stickers, fixed windows, cross-dock hubs, paper manifest first → phone/QR optional.</li>
          </ul>
        </Block>

        {/* 3) Money Model */}
        <Block title="3) Money Model (math that works)">
          <ul className="mt-3 space-y-2 text-white/80">
            <li>• <b>Platform fee: 2%</b> of selling price at umbrella (covers hosting, ops, training, audits).</li>
            <li>• <b>Alumni Notes: </b> offer members a 5% annual interest on deposits that fund community projects, with every transaction fully verified through DAO Ledger proofs.</li>
            <li>• <b>Pre-orders</b> (gift boxes/subscriptions) pull cash forward without debt.</li>
            <li>• <b>Piece-rate + profit share</b>: villagers are paid the same week; no cash handling outside the bank.</li>
          </ul>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black p-5">
            <h4 className="text-lg font-semibold">Conservative unit test</h4>
            <ul className="mt-3 space-y-1 text-white/80">
              <li>• Per ward after 90 days → <b>NPR 300,000/month GMV</b> (mushrooms + honey + 2 festival SKUs).</li>
              <li>• Platform @<b>2%</b> = <b>NPR 6,000/ward/month</b> to umbrella.</li>
              <li>• At <b>1,000 wards active</b> → <b>NPR 60,00,000/month</b> for ops/media/audits/training (bulk stays with wards).</li>
              <li>• Cash-positive well before all <b>6,743 wards</b> are live (plus pre-orders and alumni asset notes).</li>
            </ul>
          </div>
        </Block>

        {/* 4) Waves */}
        <Block title="4) 3 Waves to Nationwide (12 months, rhythm not rush)">
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <Sprint
              title="Wave 1 (Months 0–3): 10 → 100"
              points={[
                "One revenue machine/ward (CNC or mushrooms/honey/packaging).",
                "Daily dabba rhythm; weekly settlements.",
                "Publish Sunlight proofs; fix the slowest lane first.",
              ]}
            />
            <Sprint
              title="Wave 2 (Months 4–8): 100 → 1,000"
              points={[
                "Pre-orders (corporate/festival), alumni mentor hours (legal/QA/packaging).",
                "Auditor view live; bank→reco→settlement becomes boring.",
              ]}
            />
            <Sprint
              title="Wave 3 (Months 9–12): 1,000 → 6,743"
              points={[
                "Clone Ward Kits like franchises; add regional 3PL lanes.",
                "Flat, public 2% platform fee; every Friday is payout day.",
              ]}
            />
          </div>
        </Block>

        {/* 5) Governance */}
        <Block title="5) Governance that can’t be captured">
          <ul className="mt-3 space-y-2 text-white/80">
            <li>• <b>Two-key payouts</b> (ward steward + umbrella finance).</li>
            <li>• <b>No deletes</b>—only reversals in ledgers.</li>
            <li>• <b>Term-limited stewards</b> and <b>public procurement</b> (3 quotes or documented exception).</li>
            <li>• <b>Auditor/Journalist view</b>: read-only, recompute totals from raw rows.</li>
          </ul>
        </Block>

        {/* 6) KPI (Key Performance Indicators) */}
        <Block title="6) KPIs that prove it’s real (fits on one screen)">
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <KPI label="Per Ward: GMV" value="Climbing monthly" />
            <KPI label="On-Time Dispatch" value="≥ 95%" />
            <KPI label="Bank ≈ Ledger" value="≈ 0 variance" />
            <KPI label="Payouts on Schedule" value="100%" />
            <KPI label="# Households Paid / Week" value="Increasing" />
            <KPI label="Umbrella Take-Rate" value="2%" />
            <KPI label="Shipping Recovery" value="Tracked" />
            <KPI label="Return Rate" value="Low & falling" />
            <KPI label="Time-to-Payout" value="Friday sacred" />
          </div>
        </Block>

        {/* 7) Risks & Counters */}
        <Block title="7) Risks → Built-in counters">
          <ul className="mt-3 space-y-2 text-white/80">
            <li>• <b>Fraud/Leakage?</b> Append-only ledger + bank import + two-key payouts.</li>
            <li>• <b>Chaos at scale?</b> Same Ward Kit, same stickers, same windows. Rhythm beats meetings.</li>
            <li>• <b>Cash squeeze?</b> Pre-orders first; Alumni Notes only for assets with 6–12-month payback.</li>
            <li>• <b>Politics drift?</b> Economics + receipts every Friday → stories can’t outrun facts.</li>
          </ul>
        </Block>

        {/* 8) Why Self-Sustaining */}
        <Block title="8) Why this makes the party self-sustaining (justification)">
          <p className="text-white/80">
            Donor money fades. <b>Receipt-backed cashflow doesn’t.</b> When every ward earns weekly and every rupee
            is visible, a <b>2% platform fee</b> quietly funds operations without favors. Gatishil becomes
            Nepal’s lighthouse: dignity created locally, truth published nightly, movement powered by the people it serves.
          </p>
        </Block>

        <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
          <h4 className="text-xl font-semibold">Takeaway (one line)</h4>
          <p className="mt-2 text-emerald-200">
            Stand up ZenSara in each ward, keep the rhythm sacred (daily flow, Friday payouts), and the party becomes
            a permanent engine—<b>no sponsors, no drama, just receipts.</b>
          </p>
        </div>
      </Section>

      {/* 90-Day Alumni Sprint */}
      <Section label="90-Day Alumni Sprint" border>
        <div className="grid gap-6 md:grid-cols-3">
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
              "Stand one revenue machine per pilot.",
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
          <CTA href="/join?src=alumni-sprint" label="I’m In — Add Me to a Guild" variant="primary" />
        </div>
      </Section>

      {/* Dabba Rhythm */}
      <Section label="Dabba Rhythm (logistics that don’t break)" shaded>
        <div className="grid gap-6 md:grid-cols-2">
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
      </Section>

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
            <CTA href="/join?src=alumni-hero" label="Start as Alumni" variant="primary" />
            <CTA href="/alumni/faq" label="Read the FAQ" />
            <CTA href="/sunlight" label="Verify the Ledger" variant="accent" />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ——— Small UI primitives ——— */

function Section({
  children,
  label,
  border,
  shaded,
}: {
  children: React.ReactNode;
  label?: string;
  border?: boolean;
  shaded?: boolean;
}) {
  return (
    <section
      className={[
        border ? "border-t border-white/10" : "",
        shaded ? "bg-white/5" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        {label ? <h2 className="text-3xl font-semibold">{label}</h2> : null}
        {children}
      </div>
    </section>
  );
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-8 md:grid-cols-3">{children}</div>;
}

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

function ScopeCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-6">
      <h4 className="text-lg font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2 text-white/80">
        {lines.map((l, i) => (
          <li key={i}>• {l}</li>
        ))}
      </ul>
    </div>
  );
}

function UserCard({ who, job }: { who: string; job: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black p-6">
      <div className="text-sm uppercase tracking-wide text-white/60">{who}</div>
      <div className="mt-2 text-white/90">{job}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
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

function CTA({
  href,
  label,
  variant = "ghost",
}: {
  href: string;
  label: string;
  variant?: "primary" | "accent" | "ghost";
}) {
  const base = "rounded-xl px-5 py-3 font-semibold";
  const style =
    variant === "primary"
      ? "bg-white text-black hover:bg-white/90"
      : variant === "accent"
      ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
      : "border border-white/20 hover:bg-white/10";
  return (
    <Link href={href} className={`${base} ${style}`}>
      {label}
    </Link>
  );
}
