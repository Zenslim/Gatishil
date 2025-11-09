// app/tax/calculator/Chrome.tsx
'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

/** ───────────────── visuals ───────────────── **/
function useMounted() {
  const [m, set] = useState(false);
  useEffect(() => set(true), []);
  return m;
}

function Starfield() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 bg-[#0a0a12]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="layer-s absolute inset-0 animate-[drift_90s_linear_infinite]" />
        <div className="layer-m absolute inset-0 animate-[drift_120s_linear_infinite]" />
        <div className="layer-l absolute inset-0 animate-[drift_150s_linear_infinite]" />
      </div>
      <style>{`
        .layer-s,.layer-m,.layer-l{will-change:transform;background-repeat:repeat}
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

/** ───────────────── constants (from mirror) ───────────────── **/
const VAT_RATE = 0.13 as const;
const VATABLE_SHARE = {
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
} as const;

const EXCISE = {
  transport: 0.08,
  foodHome: 0.02,
  eatingOut: 0.03,
  personalCare: 0.01,
} as const;

const UNCERTAINTY = 0.05 as const;

const LIFETIME = {
  currentAge: 30, // mirror assumes ~30
  retireAge: 60,
  daysInYear: 365,
  workingHoursPerYear: 2000,
  luxuryCarPrice: 3_500_000, // 35 lakhs
};

/** ───────────────── data model (mirror categories) ───────────────── **/
// Income sources (monthly)
const INCOME_SOURCES = [
  { key: 'employment', label: '💼 Primary Employment (+1% Social Security)' },
  { key: 'business', label: '🏢 Business Income (Progressive Tax)' },
  { key: 'remittances', label: '✈️ Remittances (TAX-EXEMPT for personal)' },
  { key: 'agriculture', label: '🌾 Agriculture (100% TAX-EXEMPT)' },
  { key: 'investment', label: '🏠 Investment (TDS avg 5.5%)' },
  { key: 'otherIncome', label: '👴 Pension (+25% deduction, NO SST)' },
] as const;
type IncomeKey = (typeof INCOME_SOURCES)[number]['key'];

// Spending (monthly)
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
type CatKey = (typeof CATEGORIES)[number]['key'];

/** ───────────────── helpers ───────────────── **/
function formatRs(n: number) {
  const v = Math.round(n || 0);
  return v.toLocaleString('en-NP');
}
function toCrore(npr: number) {
  const crore = npr / 10_000_000;
  return crore >= 10 ? crore.toFixed(1) : crore.toFixed(2);
}

/** Progressive tax table (mirror FY 2082/83) */
function progressiveTax(annual: number) {
  let tax = 0;
  if (annual <= 500_000) {
    tax = annual * 0.01;
  } else if (annual <= 700_000) {
    tax = 500_000 * 0.01 + (annual - 500_000) * 0.10;
  } else if (annual <= 1_000_000) {
    tax = 500_000 * 0.01 + 200_000 * 0.10 + (annual - 700_000) * 0.20;
  } else if (annual <= 2_000_000) {
    tax = 500_000 * 0.01 + 200_000 * 0.10 + 300_000 * 0.20 + (annual - 1_000_000) * 0.30;
  } else if (annual <= 5_000_000) {
    tax =
      500_000 * 0.01 +
      200_000 * 0.10 +
      300_000 * 0.20 +
      1_000_000 * 0.30 +
      (annual - 2_000_000) * 0.36;
  } else {
    tax =
      500_000 * 0.01 +
      200_000 * 0.10 +
      300_000 * 0.20 +
      1_000_000 * 0.30 +
      3_000_000 * 0.36 +
      (annual - 5_000_000) * 0.39;
  }
  return tax;
}

/** Mirror: full direct-tax calculator by income category */
function directTaxAnnualByCategory(monthly: Record<IncomeKey, number>) {
  let total = 0;

  // 1) Employment → progressive + 1% SST (cap NPR 5,000)
  const employmentA = (monthly.employment || 0) * 12;
  if (employmentA > 0) {
    total += progressiveTax(employmentA);
    total += Math.min(employmentA * 0.01, 5000);
  }

  // 2) Business → progressive only
  const businessA = (monthly.business || 0) * 12;
  if (businessA > 0) {
    total += progressiveTax(businessA);
  }

  // 3) Remittances → TAX EXEMPT (personal) — no addition

  // 4) Agriculture → 100% EXEMPT — no addition

  // 5) Investment → TDS average 5.5%
  const investA = (monthly.investment || 0) * 12;
  if (investA > 0) total += investA * 0.055;

  // 6) Other (Pension) → 25% deduction, then progressive; NO SST
  const pensionA = (monthly.otherIncome || 0) * 12;
  if (pensionA > 0) {
    const net = pensionA * 0.75;
    total += progressiveTax(net);
  }

  return total; // annual
}

/** Hidden/indirect tax monthly */
function hiddenTaxMonthly(spend: Record<CatKey, number>) {
  let sum = 0;
  const breakdown: Record<CatKey, { amount: number; pctOfIncome: number }> = {} as any;

  for (const { key } of CATEGORIES) {
    const amt = spend[key] || 0;
    const vat = amt * (VATABLE_SHARE[key] ?? 0) * VAT_RATE;
    const exc = amt * (EXCISE as any)[key] ? amt * (EXCISE as any)[key] : 0;
    const total = vat + exc;
    sum += total;
    breakdown[key] = { amount: total, pctOfIncome: 0 }; // filled later with income
  }
  return { sum, breakdown };
}

/** ───────────────── UI controls ───────────────── **/
function NumberInput({
  value,
  onChange,
  right = 'NPR',
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  right?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-white/20 outline-none px-4 h-12 text-white placeholder-white/40"
        placeholder={placeholder || '0'}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value || 0))}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60">
        {right}
      </span>
    </div>
  );
}

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
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="text-[12px] text-slate-300/90 mb-1">{label}</div>
      <NumberInput value={value} onChange={onChange} right={suffix || ''} />
    </div>
  );
}

function Stat({ title, value, highlight = false }: { title: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? 'border-cyan-200/40 bg-white/[0.08]' : 'border-white/10 bg-white/[0.04]'}`}>
      <div className="text-[12px] text-slate-300/80 mb-1">{title}</div>
      <div className="text-xl font-extrabold text-white">{value}</div>
    </div>
  );
}

/** ───────────────── main component ───────────────── **/
export default function Chrome() {
  const mounted = useMounted();

  // incomes (default mirror values)
  const [incomeMap, setIncomeMap] = useState<Record<IncomeKey, number>>({
    employment: 150_000,
    business: 50_000,
    remittances: 80_000,
    agriculture: 25_000,
    investment: 30_000,
    otherIncome: 20_000,
  });

  // spending (default mirror values)
  const [spend, setSpend] = useState<Record<CatKey, number>>({
    foodHome: 15_000,
    eatingOut: 8_000,
    housing: 30_000,
    utilities: 8_000,
    transport: 12_000,
    education: 5_000,
    clothing: 4_000,
    personalCare: 3_000,
    entertainment: 6_000,
    other: 9_000,
  });

  // Truth Pack inputs
  const [cartText, setCartText] = useState('');
  const [friction, setFriction] = useState(5); // %
  const [bracketIncome, setBracketIncome] = useState(500_000);

  // Derived
  const monthlyIncome = useMemo(
    () => Object.values(incomeMap).reduce((s, v) => s + (v || 0), 0),
    [incomeMap]
  );
  const annualIncome = monthlyIncome * 12;

  // direct tax (annual, mirror logic)
  const annualDirectTax = useMemo(() => directTaxAnnualByCategory(incomeMap), [incomeMap]);
  const monthlyDirectTax = annualDirectTax / 12;

  // hidden tax
  const { sum: monthlyHiddenTax, breakdown } = useMemo(() => hiddenTaxMonthly(spend), [spend]);

  // total & effective
  const monthlyTotalTax = monthlyDirectTax + monthlyHiddenTax;
  const effectiveRatePct = monthlyIncome ? (monthlyTotalTax / monthlyIncome) * 100 : 0;
  const uncertainty = effectiveRatePct * UNCERTAINTY;
  const lowEstimate = effectiveRatePct - uncertainty;
  const highEstimate = effectiveRatePct + uncertainty;

  // fill pctOfIncome in breakdown
  Object.keys(breakdown).forEach((k) => {
    const kk = k as CatKey;
    breakdown[kk].pctOfIncome = monthlyIncome ? (breakdown[kk].amount / monthlyIncome) * 100 : 0;
  });

  // warnings
  const overspend = Math.max(0, Object.values(spend).reduce((s, v) => s + v, 0) - monthlyIncome);
  const overspendPct = monthlyIncome ? (overspend / monthlyIncome) * 100 : 0;

  /** Tax Freedom Day (mirror method) */
  const taxShare = monthlyIncome ? monthlyTotalTax / monthlyIncome : 0;
  const govDays = Math.max(0, Math.floor(LIFETIME.daysInYear * taxShare));
  const govMonths = +(govDays / 30).toFixed(1);
  const dateLabel = useMemo(() => {
    const y = new Date().getFullYear();
    const dayOfYear = 1 + govDays;
    const dt = new Date(y, 0, dayOfYear);
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getMonth()];
    return `${m} ${dt.getDate()}`;
  }, [govDays]);

  /** Life Hours (mirror) */
  const hoursForTaxes = Math.floor(LIFETIME.workingHoursPerYear * (effectiveRatePct / 100));
  const hoursPerDay = (hoursForTaxes / 365).toFixed(1);
  const hoursPerMonth = Math.floor(hoursForTaxes / 12);
  const workingDaysLost = Math.floor(hoursForTaxes / 8);

  /** Lifetime Tax Burden (mirror) */
  const yearsLeft = LIFETIME.retireAge - LIFETIME.currentAge;
  const annualTotalTax = monthlyTotalTax * 12;
  const lifetimeTax = Math.max(0, annualTotalTax * yearsLeft);
  const lifetimeTaxCrore = lifetimeTax / 10_000_000;
  const yearsWorkingForGov = yearsLeft * (effectiveRatePct / 100);
  const carsLost = Math.floor(lifetimeTax / LIFETIME.luxuryCarPrice);

  /** Bracket creep quick calc (mirror slab) */
  const bracketTax = progressiveTax(bracketIncome);
  const bracketRate = (bracketTax / Math.max(1, bracketIncome)) * 100;

  /** Cart scanner (mirror simple parse @ 25% hidden tax estimate) */
  const cart = useMemo(() => {
    const items = cartText.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    let total = 0;
    let hidden = 0;
    items.forEach((line) => {
      const m = line.match(/(\d+)/);
      if (m) {
        const price = parseInt(m[1]!, 10);
        total += price;
        hidden += price * 0.25;
      }
    });
    return { total, hidden };
  }, [cartText]);

  /** Friction dial impact */
  const frictionImpact = (() => {
    const f = friction;
    if (f <= 5) return { text: `Low friction! Only ${f}% leakage — money mostly reaches purpose.`, color: '#4ade80' };
    if (f <= 15) return { text: `Moderate friction. ${f}% leakage — some inefficiency, still manageable.`, color: '#fbbf24' };
    if (f <= 25) return { text: `High friction! ${f}% disappears in delays, bribes, inefficiencies.`, color: '#f97316' };
    return { text: `Severe friction! ${f}% leakage — major corruption and waste.`, color: '#ef4444' };
  })();

  const micro = (() => {
    const hiddenPct = (monthlyHiddenTax / Math.max(1, monthlyTotalTax)) * 100;
    if (effectiveRatePct > 25) {
      return `Wow. ${hiddenPct.toFixed(0)}% of your tax comes from everyday spending. If you feel prices more than pay slips, this is why.`;
    } else if (effectiveRatePct > 15) {
      return `You’re paying about NPR ${formatRs(monthlyHiddenTax)} per month in hidden taxes. The real question: do you know where it goes?`;
    }
    return `Even at ${effectiveRatePct.toFixed(1)}%, hidden taxes are ~${hiddenPct.toFixed(0)}% of your total. That’s the price of living in a modern economy.`;
  })();

  if (!mounted) return null;

  return (
    <main className="relative">
      <Starfield />
      <section className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-10">
          {/* header */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200">
              Nepal True Tax Mirror — Gatishil Edition
            </h1>
            <p className="mt-2 text-slate-300/80">
              Stop feeling the pinch without knowing why. This shows your complete tax story.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* left: inputs */}
            <div className="sticky top-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 flex items-center gap-2">
                  <span>Tell Us The Truth</span>
                </h2>

                {/* income grid */}
                <div className="mt-4">
                  <div className="text-sm text-white/90 font-semibold">Monthly Income — 6 Sources</div>
                  <p className="text-xs text-slate-300/80 italic mb-2">
                    Add your monthly income from all sources. Direct tax is computed automatically.
                  </p>
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
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between mt-3">
                    <div className="text-sm text-white/90 font-semibold">Total Monthly Income</div>
                    <div className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-white to-fuchsia-300">
                      NPR {formatRs(monthlyIncome)}
                    </div>
                  </div>
                </div>

                {/* direct tax card */}
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold">Direct Tax Calculation (FY 2082/83)</div>
                  <div className="text-xs text-slate-300/80 mt-1">
                    Annual Income: <b>NPR {formatRs(annualIncome)}</b><br />
                    Annual Tax: <b>NPR {formatRs(annualDirectTax)}</b><br />
                    Effective Rate: <b>{((annualDirectTax / Math.max(1, annualIncome)) * 100).toFixed(1)}%</b><br />
                    Monthly Tax: <b>NPR {formatRs(monthlyDirectTax)}</b>
                  </div>
                  <div className="text-[11px] text-slate-300/70 mt-3">
                    <b>Income Tax Treatment:</b><br />
                    💼 Employment: Progressive (1%–39%) + 1% Social Security (max 5,000)<br />
                    🏢 Business: Progressive (1%–39%)<br />
                    ✈️ Remittances: <b>TAX-EXEMPT</b> (personal)<br />
                    🌾 Agriculture: <b>100% TAX-EXEMPT</b><br />
                    🏠 Investment: <b>TDS avg 5.5%</b> (Interest 6%, Dividend 5%, Gains 7.5%/5%)<br />
                    👴 Pension: Progressive + 25% deduction, no SST
                  </div>
                </div>

                {/* spending grid */}
                <div className="mt-5">
                  <div className="text-sm text-white/90 font-semibold">Monthly Spending</div>
                  <p className="text-xs text-slate-300/80 italic mb-2">
                    Used to compute hidden VAT/excise embedded in prices.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIES.map(({ key, label }) => (
                      <div key={key} className="rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition p-3">
                        <div className="text-[12px] text-slate-300/90 mb-1">{label}</div>
                        <NumberInput
                          value={spend[key]}
                          onChange={(v) => setSpend((m) => ({ ...m, [key]: v }))}
                          placeholder="0"
                          right="NPR"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* right: results */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              {/* headline numbers */}
              <div className="text-center">
                <div className="text-5xl font-extrabold text-rose-300 drop-shadow">
                  {effectiveRatePct.toFixed(1)}%
                </div>
                <div className="text-slate-300/90 text-sm">
                  Range: {lowEstimate.toFixed(1)}% – {highEstimate.toFixed(1)}% (±5% uncertainty)
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl p-4 text-center border border-emerald-300/30 bg-gradient-to-br from-emerald-900/30 to-cyan-900/20">
                  <div className="text-2xl font-extrabold text-emerald-200">NPR {formatRs(monthlyDirectTax)}</div>
                  <div className="text-white/90 text-sm">Visible Tax</div>
                </div>
                <div className="rounded-xl p-4 text-center border border-rose-300/30 bg-gradient-to-br from-rose-900/30 to-amber-900/20">
                  <div className="text-2xl font-extrabold text-rose-200">NPR {formatRs(monthlyHiddenTax)}</div>
                  <div className="text-white/90 text-sm">Hidden Tax</div>
                </div>
              </div>

              {/* overspend warning */}
              {overspend > 0 && (
                <div className="mt-4 rounded-xl p-4 border border-rose-300/30 bg-gradient-to-r from-rose-600/60 to-amber-600/40 text-white animate-pulse">
                  <div className="font-semibold">Budget Alert: Spending Exceeds Income</div>
                  <div className="text-sm opacity-90">
                    Your monthly spending exceeds income by <b>NPR {formatRs(overspend)}</b> ({overspendPct.toFixed(1)}%).
                    Time to embrace a frugal lifestyle!
                  </div>
                </div>
              )}

              {/* Tax Freedom Day */}
              <div id="freedom" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200">
                  Your Tax Freedom Journey
                </h3>
                <p className="text-slate-300/90 text-sm mt-1">
                  The day each year when you stop working for the government — and start working for yourself.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Stat title="Tax Freedom Day" value={dateLabel} highlight />
                  <Stat title="Days worked for Govt." value={`${govDays} days`} />
                  <Stat title="≈ Months of slavery" value={`${govMonths} months`} />
                </div>

                <div className="mt-4">
                  <div className="text-[12px] text-white/70 mb-1">Year Timeline</div>
                  <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (govDays / 365) * 100)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-300"
                    />
                  </div>
                </div>
              </div>

              {/* Life Hours Meter */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-700/50 to-fuchsia-700/40 p-6 text-white">
                <h3 className="text-lg font-extrabold">⏰ Your Time for the State</h3>
                <div className="mt-3 text-3xl font-extrabold">{formatRs(hoursForTaxes)} hrs</div>
                <div className="text-sm opacity-90">That’s {workingDaysLost} working days!</div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white/10 p-3">
                    <div className="text-xl font-extrabold">{hoursPerDay}</div>
                    <div className="text-xs opacity-90">Hours per day</div>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <div className="text-xl font-extrabold">{hoursPerMonth}</div>
                    <div className="text-xs opacity-90">Hours per month</div>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <div className="text-xl font-extrabold">{workingDaysLost}</div>
                    <div className="text-xs opacity-90">Working days lost</div>
                  </div>
                </div>
              </div>

              {/* Hidden tax heatmap */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-extrabold text-white">Your Hidden Tax Receipt</h3>
                <div className="mt-3 space-y-2">
                  {Object.entries(breakdown)
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([key, data]) => {
                      const pct = monthlyHiddenTax > 0 ? (data.amount / monthlyHiddenTax) * 100 : 0;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-44 text-xs text-slate-200">{CATEGORIES.find((c) => c.key === (key as CatKey))?.label}</div>
                          <div className="flex-1 h-2 rounded bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded bg-gradient-to-r from-rose-400 to-amber-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-36 text-right text-xs text-slate-300">
                            NPR {formatRs(data.amount)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Price Ghosts (static mirror story) */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-extrabold text-white">Price Ghosts: Your Rs 100 Journey</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-200">
                  {[
                    ['💰 Original Price', 100],
                    ['🏢 Import Duty', 15],
                    ['⛽ Excise Tax', 8],
                    ['📄 VAT on Duty', 3],
                    ['💼 Corporate Tax', 12],
                    ['💳 Payment Fees', 4],
                    ['💱 FX Spread', 2],
                  ].map(([label, amt]) => (
                    <div key={label as string} className="flex items-center justify-between rounded bg-white/5 border border-white/10 p-2">
                      <span>{label as string}</span>
                      <span className="font-semibold">NPR {amt as number}</span>
                    </div>
                  ))}
                  <div className="rounded bg-rose-600/60 p-3 text-white border border-rose-300/40">
                    <b>Total Hidden Tax: NPR 44 (44% of your money!)</b><br />
                    <small>You only get Rs 56 worth of actual goods for your Rs 100</small>
                  </div>
                </div>
              </div>

              {/* Bracket Creep */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-extrabold text-white">Bracket Creep: Income vs Brackets</h3>
                <div className="text-xs text-slate-300/90">Income: NPR {formatRs(bracketIncome)}</div>
                <input
                  type="range"
                  min={400_000}
                  max={1_000_000}
                  step={10_000}
                  value={bracketIncome}
                  onChange={(e) => setBracketIncome(Number(e.target.value))}
                  className="w-full mt-3"
                />
                <div className="mt-2 text-sm text-slate-200">
                  Estimated tax: <b>NPR {formatRs(bracketTax)}</b> — effective <b>{bracketRate.toFixed(1)}%</b>.
                </div>
              </div>

              {/* Cart Scanner */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-700/40 to-emerald-700/40 p-6">
                <h3 className="text-lg font-extrabold text-white">Your Cart, Your Truth</h3>
                <p className="text-xs text-white/80">Enter a quick shopping list (e.g., “1kg rice 80, 2L milk 120, recharge 100”)</p>
                <textarea
                  className="w-full h-28 mt-2 rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-white/50"
                  value={cartText}
                  onChange={(e) => setCartText(e.target.value)}
                  placeholder="1kg rice 80, 2L milk 120, 1kg chicken 400, phone recharge 100"
                />
                {cart.total > 0 && (
                  <div className="mt-3 rounded bg-rose-600/60 p-3 text-white border border-rose-300/40 text-center">
                    <div className="text-2xl font-extrabold">{Math.round(cart.hidden)}</div>
                    <div className="text-sm opacity-90">NPR in hidden taxes (≈25%) from cart total NPR {formatRs(cart.total)}</div>
                  </div>
                )}
              </div>

              {/* Compliance Cost */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-extrabold text-white">Compliance Cost: Your Paperwork Tax</h3>
                <div className="text-3xl font-extrabold text-white">
                  35 hrs <span className="text-sm font-semibold opacity-80">/ year</span>
                </div>
                <div className="text-sm text-slate-300/90">At NPR 2,000/hr → <b>NPR {formatRs(70_000)}/year</b></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-center text-xs text-slate-200">
                  {[
                    ['Filing Returns', '8 hrs'],
                    ['Gathering Docs', '12 hrs'],
                    ['Follow-up & Queries', '5 hrs'],
                    ['Mind Space', '10 hrs'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/10 p-3">
                      <div className="font-semibold">{k}</div>
                      <div>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friction Dial */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-extrabold text-white">Corruption Friction: What Gets Lost</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={friction}
                    onChange={(e) => setFriction(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="w-16 text-right text-white">{friction}%</div>
                </div>
                <div className="mt-2 text-sm" style={{ color: frictionImpact.color }}>
                  {frictionImpact.text}
                </div>
              </div>

              {/* One Rupee, Five Hands */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-extrabold text-white">One Rupee, Five Hands: The Journey</h3>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-slate-200">
                  {[
                    ['👤 You Earn', '100%'],
                    ['💰 Gov Tax', '25%'],
                    ['💳 VAT/Sales', '15%'],
                    ['🏢 Corp Tax', '10%'],
                    ['🔄 Friction', '5%'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/10 p-3">
                      <div className="text-lg">{k}</div>
                      <div className="font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded bg-rose-600/60 p-3 text-white border border-rose-300/40 text-center">
                  <div className="text-2xl font-extrabold">NPR 45</div>
                  <div className="text-sm opacity-90">From your original NPR 100, only NPR 45 reaches you!</div>
                  <div className="text-xs opacity-80">You lose 55% to the system before you even see your money</div>
                </div>
              </div>

              {/* micro text */}
              <div className="mt-6 rounded-xl bg-gradient-to-r from-amber-50/10 to-rose-50/10 border border-white/10 p-4">
                <div className="text-sm font-semibold">If you feel prices more than pay slips…</div>
                <div className="text-slate-300/90 text-sm mt-1">{micro}</div>
              </div>

              {/* Lifetime Burden */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-6 text-white">
                <h3 className="text-lg font-extrabold">Your Lifetime Tax Legacy</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <Stat title="Lifetime Taxes" value={`NPR ${toCrore(lifetimeTax)} Cr`} highlight />
                  <Stat title="Years for Govt." value={`${yearsWorkingForGov.toFixed(1)} yrs`} />
                  <Stat title="Luxury Cars You Could Buy" value={`${carsLost}`} />
                </div>
                <p className="mt-3 text-sm text-slate-200/90">
                  {lifetimeTaxCrore > 5
                    ? `You'll give the government ${lifetimeTaxCrore.toFixed(
                        1,
                      )} crores over your working life — enough to buy ${carsLost} luxury cars, or multiple houses.`
                    : lifetimeTaxCrore > 2
                    ? `Lifetime burden: ${lifetimeTaxCrore.toFixed(
                        1,
                      )} crores NPR; you're basically working ${yearsWorkingForGov.toFixed(
                        1,
                      )} years for people you'll never meet.`
                    : lifetimeTaxCrore > 0.5
                    ? `Even moderately, you'll pay ${(lifetimeTax / 100000).toFixed(
                        0,
                      )} lakhs in taxes — rupees that could have been retirement.`
                    : `Despite lower earnings, lifetime tax still totals ${(lifetimeTax / 100000).toFixed(
                        0,
                      )} lakhs. Small streams become rivers over time.`}
                  {lifetimeTax > 50_000_000 ? ' Plus, inflation will make future rupees worth less.' : ''}
                </p>
                <p className="mt-2 text-slate-300/80 text-xs">
                  Assumptions: age {LIFETIME.currentAge}→{LIFETIME.retireAge}, Rs {formatRs(LIFETIME.luxuryCarPrice)} per car.
                </p>
              </div>
            </div>
          </div>

          {/* footer */}
          <footer className="relative z-10 py-10 text-sm text-slate-300 text-center">
            Built with ❤️ by Gatishil — numbers match the Mirror, wrapped in our cosmic Gatishil style.
          </footer>
        </div>
      </section>
    </main>
  );
}
