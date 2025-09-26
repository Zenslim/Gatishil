// app/dashboard/page.tsx
// Gatishil — Member Interior (True Home)
// ELI15: This is the inside of the shop. It greets a member with meaning,
// one clear action, and living proof of movement. Data hooks can be added later.

import Link from "next/link";

export const metadata = {
  title: "Dashboard — Gatishil",
};

export default async function DashboardPage() {
  // NOTE: Middleware keeps outsiders out; this page focuses on experience.
  // Later, swap placeholders with live Supabase queries.

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/5 bg-white/0 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-semibold">Gatishil — Interior</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm text-white/80">
            <Link href="/projects" className="hover:text-white">Projects</Link>
            <Link href="/people" className="hover:text-white">People</Link>
            <Link href="/knowledge" className="hover:text-white">Knowledge</Link>
            <Link href="/money" className="hover:text-white">Ledger</Link>
            <Link href="/security" className="hover:text-white">Security</Link>
          </nav>
        </div>
      </header>

      {/* Hero — Your Mandal Today */}
      <section className="max-w-6xl mx-auto px-4 pt-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-white/60 text-sm mb-1">Your Mandal Today</p>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Calm power, clear step.
              </h2>
              <p className="text-white/70 mt-2">
                Dignity first. Do one thing that moves the circle.
              </p>
            </div>
            <Link
              href="/projects?filter=one-beautiful-task"
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 bg-white text-black font-medium hover:opacity-90"
            >
              Do one beautiful task →
            </Link>
          </div>
        </div>
      </section>

      {/* Grid — Thought-provoking, action-able panes */}
      <section className="max-w-6xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-2">
        <Card title="Pulse of the People" hint="Active now • Reflections today • Open decisions">
          <Kpis items={[
            { label: "Active", value: "27" },
            { label: "Reflections", value: "113" },
            { label: "Decisions open", value: "3" },
          ]}/>
        </Card>

        <Card title="Neighbor Light" hint="A real micro-win worth celebrating">
          <Line>
            <Dot /> <b>Shova (Sikarmi)</b> sold 12 carved brackets; pledged 2 for ZenSara hut.
          </Line>
          <Line>
            <Dot /> <b>Roji (Jyapu)</b> planted 14 saplings; needs 2 hands tomorrow morning.
          </Line>
          <div className="mt-3">
            <Link className="text-sm text-emerald-300 hover:text-emerald-200" href="/people?tab=highlights">
              See more neighbor lights →
            </Link>
          </div>
        </Card>

        <Card title="Circle in Motion" hint="Threads that need your voice">
          <List bullets={[
            "Ward 8 compost loop — where to place the 3rd bin?",
            "ZenSara week plan — irrigation line B fix",
            "Youth stipend — propose a transparent rule"
          ]}/>
          <div className="mt-3 flex gap-2">
            <Chip>Vote</Chip><Chip>Comment</Chip><Chip>Offer help</Chip>
          </div>
        </Card>

        <Card title="Earned, Not Asked" hint="Tiny ledger of value created this week">
          <Kpis items={[
            { label: "Hours given", value: "86" },
            { label: "Outputs", value: "41" },
            { label: "Rs saved", value: "27,500" },
          ]}/>
          <div className="mt-3 text-sm text-white/70">
            Every entry must be <i>provable</i>, not performative.
          </div>
        </Card>

        <Card title="Roots & Soil" hint="ZenSara snapshot">
          <List bullets={[
            "Trees planted: 324 (+18 today)",
            "Green salad (aquaponics): 73 trays ready",
            "Wellness sessions delivered: 9"
          ]}/>
        </Card>

        <Card title="Skill → Need Match" hint="One match you can act on">
          <Line><Dot /> <b>You</b> ← wood-joinery → <b>Bishnu</b> needs frame by Friday</Line>
          <div className="mt-3">
            <Link className="text-sm text-emerald-300 hover:text-emerald-200" href="/people?tab=matches">
              View all matches →
            </Link>
          </div>
        </Card>

        <Card title="Truth Window" hint="Transparent money pane">
          <List bullets={[
            "Inflows (7d): Rs 81,000",
            "Outflows (7d): Rs 63,000",
            "Next spend: Rs 12,400 (pipe fittings) — approval pending"
          ]}/>
          <div className="mt-3">
            <Link className="text-sm text-emerald-300 hover:text-emerald-200" href="/money">
              Open the ledger →
            </Link>
          </div>
        </Card>

        <Card title="My Word Today" hint="A promise you can keep before midnight">
          <p className="text-white/80">
            “I will call Ama Maya and confirm tomorrow’s transport.”
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium hover:opacity-90">
              Mark kept ✓
            </button>
            <span className="text-xs text-white/60">Streak: 4</span>
          </div>
        </Card>

        <Card title="Whisper from Ama" hint="Restore dignity before productivity">
          <Quote>
            “पहिले सास फेर्नु, अनि साँचो बोल्नुस् — भलाइ त्यहीँबाट बर्छ।”
          </Quote>
        </Card>

        <Card title="Thrones, Irrelevant" hint="Measure dependence on old politics">
          <Progress label="State dependence reduced" value={34} />
          <p className="text-xs text-white/60 mt-2">
            Target: 60% by end of season — through cooperative flows, not slogans.
          </p>
        </Card>

        <Card title="One Beautiful Task" hint="3-minute contribution">
          <List bullets={[
            "Add one skill to your profile",
            "Pledge 30 minutes for Saturday clean-up",
            "Share 1 neighbor light with proof"
          ]}/>
          <div className="mt-3">
            <Link className="text-sm text-emerald-300 hover:text-emerald-200" href="/projects?filter=one-beautiful-task">
              See all 3-minute tasks →
            </Link>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 pb-10 pt-4 text-xs text-white/50">
        Economics + Culture first → Politics later. Proof over promises.
      </footer>
    </main>
  );
}

/* ---------- UI primitives (no external libs) ---------- */

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 md:p-6">
      <div className="mb-3">
        <h3 className="text-lg font-medium">{title}</h3>
        {hint ? <p className="text-xs text-white/60 mt-1">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Kpis({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="text-xl font-semibold">{it.value}</div>
          <div className="text-xs text-white/60">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function List({ bullets }: { bullets: string[] }) {
  return (
    <ul className="space-y-2">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-white/85">
          <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs px-3 py-1 rounded-full bg-white/10 border border-white/15">
      {children}
    </span>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="text-white/85">{children}</p>;
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 align-middle" />;
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="text-white/90 border-l-2 border-emerald-400 pl-4">
      {children}
    </blockquote>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-white/80">{label}</span>
        <span className="text-white/70">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-emerald-400"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
