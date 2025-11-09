// app/tax/calculator/Chrome.tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

/* ------------ visuals ------------ */
function useMounted() {
  const [m, set] = useState(false);
  useEffect(() => set(true), []);
  return m;
}

function Starfield() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  return (
    <motion.div style={{ opacity }} className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 starfield">
        <div className="layer layer-s" />
        <div className="layer layer-m" />
        <div className="layer layer-l" />
      </div>
      <style jsx>{`
        .starfield { position:absolute; inset:0; overflow:hidden; }
        .layer { position:absolute; inset:-50%; animation:drift 60s linear infinite; opacity:0.9; }
        .layer-s { background-image:
            radial-gradient(white 1px, transparent 1.5px),
            radial-gradient(white 1px, transparent 1.5px);
          background-size:120px 120px, 160px 160px; background-position:0 0, 60px 80px;
          filter:drop-shadow(0 0 1px rgba(255,255,255,.35)); animation-duration:90s; }
        .layer-m { background-image:
            radial-gradient(white 1.5px, transparent 2px),
            radial-gradient(white 1.5px, transparent 2px);
          background-size:200px 200px, 260px 260px; background-position:40px 20px, 160px 100px;
          filter:drop-shadow(0 0 2px rgba(255,255,255,.25)); animation-duration:120s; }
        .layer-l { background-image:
            radial-gradient(white 2px, transparent 2.5px),
            radial-gradient(white 2px, transparent 2.5px);
          background-size:320px 320px, 420px 420px; background-position:120px 60px, 260px 180px;
          filter:drop-shadow(0 0 3px rgba(255,255,255,.2)); animation-duration:150s; }
        @keyframes drift { 0% { transform:translate3d(0,0,0) } 50% { transform:translate3d(-2%,-3%,0) } 100% { transform:translate3d(0,0,0) } }
      `}</style>
    </motion.div>
  );
}

/* ------------ data model ------------ */
// Six income sources (monthly)
const INCOME_SOURCES = [
  { key: 'salary', label: '🧾 Salary / TDS' },
  { key: 'business', label: '🏭 Business / Self' },
  { key: 'remittance', label: '🌏 Remittance' },
  { key: 'rental', label: '🏠 Rental' },
  { key: 'interest', label: '💸 Interest / Dividend' },
  { key: 'capital', label: '📈 Capital Gains' },
] as const;
type IncomeKey = typeof INCOME_SOURCES[number]['key'];

const DEFAULT_INCOME: Record<IncomeKey, number> = {
  salary: 120000,
  business: 15000,
  remittance: 0,
  rental: 10000,
  interest: 3000,
  capital: 2000,
};

// Spending categories (VAT/excise assumptions)
const CATEGORIES = [
  { key: 'foodHome', label: '🍎 Food (Home)' },
  { key: 'eatingOut', label: '🍽️ Eating Out' },
  { key: 'housing', label: '🏠 Housing/Rent' },
  { key: 'utilities', label: '⚡ Utilities' },
  { key: 'transport', label: '🚗 Transport' },
  { key: 'education', label: '📚 Education/Health' },
  { key: 'clothing', label: '👕 Clothing' },
  { key: 'personalCare', label: '🧴 Personal Care' },
  { key: 'entertainment', label: '🎬 Entertainment' },
  { key: 'other', label: '📦 Other' },
] as const;
type CatKey = typeof CATEGORIES[number]['key'];

const DEFAULT_SPEND: Record<CatKey, number> = {
  foodHome: 15000,
  eatingOut: 8000,
  housing: 30000,
  utilities: 8000,
  transport: 12000,
  education: 5000,
  clothing: 4000,
  personalCare: 3000,
  entertainment: 6000,
  other: 9000,
};

const SETTINGS = {
  vatRate: 0.13,
  vatableShare: {
    foodHome: 0.60,
    eatingOut: 0.95,
    housing: 0.0,
    utilities: 1.0,
    transport: 0.70,
    education: 0.80,
    clothing: 1.0,
    personalCare: 1.0,
    entertainment: 1.0,
    other: 0.85,
  } as Record<CatKey, number>,
  exciseRates: {
    transport: 0.08,
    foodHome: 0.02,
    eatingOut: 0.03,
    personalCare: 0.01,
  } as Partial<Record<CatKey, number>>,
  uncertainty: 0.05,
};

/* ------------ page ------------ */
export default function ChromeCalculator() {
  const mounted = useMounted();

  // 6 income sources drive total income
  const [incomeMap, setIncomeMap] = useState<Record<IncomeKey, number>>(DEFAULT_INCOME);
  const income = useMemo(
    () => Object.values(incomeMap).reduce((a, v) => a + (v || 0), 0),
    [incomeMap]
  );

  // Direct (visible) monthly tax
  const [directTax, setDirectTax] = useState(20000);

  // Spending
  const [spend, setSpend] = useState<Record<CatKey, number>>(DEFAULT_SPEND);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Lifetime + Journey controls
  const [years, setYears] = useState<number>(30);        // horizon for legacy
  const [growth, setGrowth] = useState<number>(5);       // % annual compounding alt use
  const [monthDays, setMonthDays] = useState<number>(30);// average month length for journey

  const {
    hiddenTax, breakdown, totalSpending, effectiveRate, low, high,
    monthlyTax, legacyNominal, legacyAltWealth, taxFreedomDay
  } = useMemo(() => {
    // hidden monthly tax from spend
    let hidden = 0;
    const b: Record<CatKey, { amount: number; pctOfIncome: number }> = {} as any;

    for (const { key } of CATEGORIES) {
      const amt = spend[key] || 0;
      const vat = amt * (SETTINGS.vatableShare[key] ?? 0) * SETTINGS.vatRate;
      const exc = amt * (SETTINGS.exciseRates[key] ?? 0);
      const sum = vat + exc;
      hidden += sum;
      b[key] = { amount: sum, pctOfIncome: income ? (sum / income) * 100 : 0 };
    }

    const monthlyVisible = directTax;
    const monthlyHidden  = hidden;
    const monthlyTotal   = monthlyVisible + monthlyHidden;

    const totalTax = monthlyTotal;
    const eff = income ? (totalTax / income) * 100 : 0;
    const unc = eff * SETTINGS.uncertainty;

    // Lifetime legacy (simple): nominal = monthlyTotal * 12 * years
    const legacyNominal = monthlyTotal * 12 * years;

    // Alternative wealth if redirected & compounded annually at growth%
    const r = Math.max(0, growth) / 100;
    const yearly = monthlyTotal * 12;
    const legacyAltWealth = r > 0 ? yearly * ((Math.pow(1 + r, years) - 1) / r) : yearly * years;

    // Tax Freedom Journey: day of month spent covering taxes
    const taxRate = income ? totalTax / income : 0; // monthly
    const day = Math.min(monthDays, Math.max(1, Math.round(taxRate * monthDays)));

    return {
      hiddenTax: hidden,
      breakdown: b,
      totalSpending: Object.values(spend).reduce((a, v) => a + (v || 0), 0),
      effectiveRate: eff,
      low: eff - unc,
      high: eff + unc,
      monthlyTax: monthlyTotal,
      legacyNominal,
      legacyAltWealth,
      taxFreedomDay: day,
    };
  }, [income, directTax, spend, years, growth, monthDays]);

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* background */}
      <div className="absolute inset-0 -z-20 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.9] bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(251,191,36,0.08),transparent_60%),radial-gradient(900px_500px_at_20%_10%,rgba(244,114,182,0.06),transparent_60%)]" />
      </div>
      {mounted && <Starfield />}

      {/* header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-5 relative z-20">
        <div className="flex items-center justify-between">
          <a href="/tax" className="flex items-center gap-3">
            <img
              src="/gatishil-logo.png"
              alt="Gatishil Nepal"
              className="h-8 w-auto"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide">Gatishil Nepal</p>
              <p className="text-[12px] text-slate-300/80">DAO · Guthi · Movement</p>
            </div>
          </a>
          <nav className="hidden md:flex gap-6 items-center text-sm text-slate-300">
            <a className="hover:text-white" href="/tax">Intro</a>
            <a className="hover:text-white" href="#advanced">Advanced</a>
            <a className="hover:text-white" href="#legacy">Legacy</a>
            <a className="hover:text-white" href="#journey">Journey</a>
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <a href="/login" className="px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition">Login</a>
            <motion.a
              href="/join"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold shadow-[0_0_30px_rgba(251,191,36,0.35)]"
            >
              Join
            </motion.a>
          </div>
        </div>
      </header>

      {/* body */}
      <section className="relative z-10 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8">
          {/* left column */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 lg:sticky lg:top-6 self-start"
          >
            <h1 className="text-[28px] sm:text-4xl font-extrabold leading-tight">
              Nepal True Tax <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">Mirror</span>
            </h1>
            <p className="mt-3 text-slate-300/90">
              A smooth, borderless Gatishil page: see your <span className="text-white font-semibold">complete tax story</span>—
              visible pay-slip taxes plus hidden VAT/excise embedded in prices.
            </p>

            {/* Six income sources */}
            <div className="mt-6 space-y-3">
              <div className="text-sm text-white/90 font-semibold">Monthly Income — 6 Sources</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INCOME_SOURCES.map(({ key, label }) => (
                  <div key={key} className="rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition p-3">
                    <div className="text-[12px] text-slate-300/90 mb-1">{label}</div>
                    <NumberInput
                      value={incomeMap[key]}
                      onChange={(v) => setIncomeMap((m) => ({ ...m, [key]: v }))}
                      placeholder="0"
                      right="NPR"
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
                <div className="text-sm text-white/90 font-semibold">Total Monthly Income</div>
                <div className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-white to-fuchsia-300">
                  Rs {formatRs(income)}
                </div>
              </div>
            </div>

            {/* Direct tax input */}
            <div className="mt-5">
              <Field
                label="Direct Tax (TDS / Self)"
                suffix="NPR / month"
                value={directTax}
                onChange={setDirectTax}
              />
            </div>

            {/* Spending categories */}
            <div className="mt-4">
              <div className="text-sm text-white/90 font-semibold mb-2">Monthly Spending — estimates per category</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map(({ key, label }) => (
                  <div key={key} className="rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition p-3">
                    <div className="text-[12px] text-slate-300/90 mb-1">{label}</div>
                    <NumberInput
                      value={spend[key]}
                      onChange={(v) => setSpend((s) => ({ ...s, [key]: v }))}
                      placeholder="0"
                      right="NPR"
                    />
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">Nothing is stored by default. Edit assumptions any time.</p>

            {/* Advanced */}
            <div id="advanced" className="mt-5">
              <button
                onClick={() => setShowAdvanced((x) => !x)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Advanced Settings (Assumptions)</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" className={`transition ${showAdvanced ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-slate-300/80 text-xs mt-1">Nepal 2025 defaults: VAT 13% with category-specific VATable shares and excise.</p>
              </button>

              <motion.div
                initial={false}
                animate={showAdvanced ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                  <Row label="VAT Rate (standard)" value="13%" />
                  <Row label="Food (Home) – VATable" value="60%" />
                  <Row label="Eating Out – VATable" value="95%" />
                  <Row label="Utilities – VATable" value="100%" />
                  <Row label="Transport (Fuel) – excise" value="+8%" />
                  <Row label="Uncertainty range" value="±5%" />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* right column */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="lg:col-span-7"
          >
            {/* headline block */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_0_35px_rgba(255,255,255,0.05)]">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-white to-fuchsia-300">
                  {effectiveRate.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-300/90 mt-1">Your True Effective Tax Rate</div>
                <div className="text-xs text-slate-400 mt-1">Range: {low.toFixed(1)}% – {high.toFixed(1)}%</div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Stat title="Visible Tax (monthly)" value={`Rs ${formatRs(directTax)}`} />
                <Stat title="Hidden Tax (monthly est.)" value={`Rs ${formatRs(hiddenTax)}`} highlight />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-300/80">
                <Fact label="Total Monthly Income" value={`Rs ${formatRs(income)}`} />
                <Fact label="Total Monthly Spend (est.)" value={`Rs ${formatRs(totalSpending)}`} />
                <Fact label="Total Monthly Tax (est.)" value={`Rs ${formatRs(monthlyTax)}`} />
              </div>

              {/* heatmap */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white/90 mb-3">Your Hidden Tax Receipt</h3>
                <ReceiptHeatmap breakdown={breakdown} />
              </div>

              {/* micros */}
              <div className="mt-6 rounded-xl bg-gradient-to-r from-amber-50/10 to-rose-50/10 border border-white/10 p-4">
                <div className="text-sm font-semibold">If you feel prices more than pay slips…</div>
                <div className="text-slate-300/90 text-sm mt-1">
                  {microText({ effectiveRate, directTax, hiddenTax })}
                </div>
              </div>
            </div>

            {/* Lifetime Tax Legacy */}
            <div id="legacy" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-white to-fuchsia-300">
                Your Lifetime Tax Legacy
              </h3>
              <p className="text-slate-300/90 text-sm mt-1">
                Project your current monthly taxes forward as a simple, living estimate you can adjust any time.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LabeledNumber
                  label="Horizon (years)"
                  value={years}
                  onChange={setYears}
                  right="yrs"
                />
                <LabeledNumber
                  label="Alt. Growth (annual)"
                  value={growth}
                  onChange={setGrowth}
                  right="%"
                />
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] text-white/60">Monthly Tax (now)</div>
                  <div className="mt-1 text-xl font-bold">Rs {formatRs(monthlyTax)}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Stat
                  title="Nominal Taxes Paid (Horizon)"
                  value={`Rs ${formatRs(legacyNominal)}`}
                  highlight
                />
                <Stat
                  title="If Redirected & Compounded (est.)"
                  value={`Rs ${formatRs(legacyAltWealth)}`}
                />
              </div>

              <p className="text-[12px] text-slate-400 mt-2">
                This is a simple projection using today’s monthly taxes. It’s not advice; it’s a mirror to
                spark better policy and smarter choices.
              </p>
            </div>

            {/* Tax Freedom Journey */}
            <div id="journey" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200">
                Your Tax Freedom Journey
              </h3>
              <p className="text-slate-300/90 text-sm mt-1">
                Each month, you first work for taxes—then for you. Here’s your estimated “freedom day”.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LabeledNumber
                  label="Days in Month (avg.)"
                  value={monthDays}
                  onChange={setMonthDays}
                  right="days"
                />
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] text-white/60">Freedom Day (est.)</div>
                  <div className="mt-1 text-2xl font-extrabold">Day {taxFreedomDay}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[11px] text-white/60">Workdays for You</div>
                  <div className="mt-1 text-2xl font-extrabold">
                    {Math.max(0, monthDays - taxFreedomDay)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[12px] text-white/70 mb-1">Month Timeline</div>
                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(taxFreedomDay / monthDays) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-rose-400 via-orange-400 to-amber-300"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>1</span>
                  <span>Tax Freedom → Day {taxFreedomDay}</span>
                  <span>{monthDays}</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-300/90">
                Tip: Reduce high-VAT/Excise spend (fuel-heavy transport, frequent eating out) or increase
                post-tax income—you’ll watch your “freedom day” move earlier.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 text-center">
          <p>© {mounted ? new Date().getFullYear() : 2025} GatishilNepal.org · Democracy That Flows</p>
        </div>
      </footer>
    </main>
  );
}

/* ------------ atoms ------------ */
function Field({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition p-4">
      <div className="flex items-center justify-between text-sm text-white/90 mb-2">
        <span>{label}</span>
        {suffix ? <span className="text-slate-300/80">{suffix}</span> : null}
      </div>
      <NumberInput value={value} onChange={onChange} placeholder="0" right="NPR" />
    </div>
  );
}

function LabeledNumber({
  label, value, onChange, right,
}: {
  label: string; value: number; onChange: (v: number) => void; right?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="mt-1">
        <NumberInput value={value} onChange={onChange} right={right} />
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  right,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  right?: string;
}) {
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-full h-12 px-4 pr-16 rounded-lg bg-white/5 border border-white/10 focus:border-amber-300/50 outline-none transition text-white placeholder:text-slate-400"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        placeholder={placeholder}
      />
      {right && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300/80">{right}</span>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
      <span className="text-slate-200/90">{label}</span>
      <span className="text-slate-300/90">{value}</span>
    </div>
  );
}

function Stat({ title, value, highlight = false }: { title: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="text-xs uppercase tracking-widest text-white/60">{title}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          highlight ? 'bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent' : ''
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="mt-0.5 text-sm text-white/90">{value}</div>
    </div>
  );
}

function ReceiptHeatmap({
  breakdown,
}: {
  breakdown: Record<CatKey, { amount: number; pctOfIncome: number }>;
}) {
  const items = (Object.entries(breakdown) as [CatKey, { amount: number; pctOfIncome: number }][])
    .filter(([, d]) => d.amount > 0)
    .sort((a, b) => b[1].amount - a[1].amount);

  const max = Math.max(...items.map(([, d]) => d.amount), 1);

  return (
    <div className="space-y-2">
      {items.map(([key, data]) => {
        const widthPct = Math.max(2, (data.amount / max) * 100);
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition"
            title={`${CATEGORIES.find(c => c.key === key)?.label} · Rs ${formatRs(data.amount)}/month`}
          >
            <div className="min-w-[160px] text-sm text-white/90">
              {CATEGORIES.find(c => c.key === key)?.label}
            </div>
            <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${widthPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-rose-400 via-orange-400 to-amber-300"
              />
            </div>
            <div className="w-36 text-right text-sm text-slate-300/90">Rs {formatRs(data.amount)}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------ utils ------------ */
function formatRs(n: number) {
  return Math.round(n).toLocaleString();
}

function microText({ effectiveRate, directTax, hiddenTax }: { effectiveRate: number; directTax: number; hiddenTax: number }) {
  const hiddenPct = (hiddenTax / (directTax + hiddenTax || 1)) * 100;
  if (effectiveRate > 25) {
    return `Wow. ${hiddenPct.toFixed(0)}% of your tax comes from everyday spending. If you feel prices more than pay slips, this is why.`;
    } else if (effectiveRate > 15) {
    return `You’re paying about Rs ${formatRs(hiddenTax / 12)} per month in hidden taxes. The real question: do we know where it goes?`;
  }
  return `Even at ${effectiveRate.toFixed(1)}%, hidden taxes are ~${hiddenPct.toFixed(0)}% of your total. That’s how modern prices carry tax inside.`;
}
