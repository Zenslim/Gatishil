// app/tax/calculator/Chrome.tsx
'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

function Starfield() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black via-slate-950 to-slate-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    />
  );
}

function SectionShell({ id, children, accent }: {
  id: string;
  children: ReactNode;
  accent: 'cyan' | 'amber' | 'red' | 'white' | 'gold' | 'dawn';
}) {
  const accentMap: Record<string, string> = {
    cyan: 'from-cyan-400/40 via-cyan-200/10 to-transparent',
    amber: 'from-amber-400/40 via-amber-100/10 to-transparent',
    red: 'from-rose-500/40 via-rose-200/10 to-transparent',
    white: 'from-white/40 via-slate-200/10 to-transparent',
    gold: 'from-yellow-400/40 via-yellow-100/10 to-transparent',
    dawn: 'from-orange-400/40 via-amber-200/10 to-transparent',
  };
  return (
    <section id={id} className="py-16 relative overflow-hidden">
      <div className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b ${accentMap[accent]} blur-[120px] opacity-40`} />
      <div className="max-w-6xl mx-auto px-6">
        {children}
      </div>
    </section>
  );
}

const VAT_RATE = 0.13 as const;
const VATABLE_SHARE = {
  foodHome: 0.6,
  eatingOut: 0.95,
  housing: 0.0,
  utilities: 1.0,
  transport: 0.7,
  education: 0.8,
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
  currentAge: 30,
  retireAge: 60,
  daysInYear: 365,
  workingHoursPerYear: 2000,
};

const BUDGET_SHARES = {
  recurrent: 0.613,
  capital: 0.189,
  debt: 0.197,
} as const;

const INCOME_SOURCES = [
  { key: 'employment', label: '💼 Primary Employment (+1% Social Security)' },
  { key: 'business', label: '🏢 Business Income (25%/ 30%/ 20%/ 0%)' },
  { key: 'remittances', label: '✈️ Remittances (TAX-EXEMPT personal)' },
  { key: 'agriculture', label: '🌾 Agriculture (TAX-EXEMPT)' },
  { key: 'investment', label: '🏠 Investment (TDS avg 5.5%)' },
  { key: 'otherIncome', label: '👴 Pension (+25% deduction, no SST)' },
] as const;
type IncomeKey = (typeof INCOME_SOURCES)[number]['key'];

const CATEGORIES = [
  { key: 'foodHome', label: '🍎 Food (Home)' },
  { key: 'eatingOut', label: '🍽️ Eating Out' },
  { key: 'housing', label: '🏠 Housing / Rent' },
  { key: 'utilities', label: '⚡ Utilities' },
  { key: 'transport', label: '🚗 Transport' },
  { key: 'education', label: '📚 Education / Health' },
  { key: 'clothing', label: '👕 Clothing' },
  { key: 'personalCare', label: '🧴 Personal Care' },
  { key: 'entertainment', label: '🎬 Entertainment' },
  { key: 'other', label: '📦 Other' },
] as const;
type CatKey = (typeof CATEGORIES)[number]['key'];

const BUSINESS_TYPES = [
  { key: 'general', label: '🏢 General Corporation (25%)', rate: 0.25 },
  { key: 'bank', label: '🏦 Bank / Insurance / Telecom (30%)', rate: 0.3 },
  { key: 'special', label: '💻 Special Industry (IT, Agro, Tourism — 20%)', rate: 0.2 },
  { key: 'coop', label: '🌾 Agricultural Cooperative (0%)', rate: 0 },
] as const;
type BusinessTypeKey = (typeof BUSINESS_TYPES)[number]['key'];

function formatRs(n: number) {
  const v = Math.round(n || 0);
  return v.toLocaleString('en-NP');
}

function progressiveTax(annual: number) {
  let tax = 0;

  let remaining = Math.max(0, annual - 500_000);
  if (remaining <= 0) return 0;

  const slab1 = Math.min(remaining, 200_000);
  tax += slab1 * 0.1;
  remaining -= slab1;
  if (remaining <= 0) return tax;

  const slab2 = Math.min(remaining, 300_000);
  tax += slab2 * 0.2;
  remaining -= slab2;
  if (remaining <= 0) return tax;

  const slab3 = Math.min(remaining, 1_000_000);
  tax += slab3 * 0.3;
  remaining -= slab3;
  if (remaining <= 0) return tax;

  const slab4 = Math.min(remaining, 3_000_000);
  tax += slab4 * 0.36;
  remaining -= slab4;
  if (remaining <= 0) return tax;

  tax += remaining * 0.39;
  return tax;
}

function directTaxAnnualByCategory(
  monthly: Record<IncomeKey, number>,
  businessType: BusinessTypeKey,
) {
  let total = 0;

  const employmentA = (monthly.employment || 0) * 12;
  if (employmentA > 0) {
    total += progressiveTax(employmentA);
    total += Math.min(employmentA * 0.01, 5000);
  }

  const businessA = (monthly.business || 0) * 12;
  if (businessA > 0) {
    const bt = BUSINESS_TYPES.find((b) => b.key === businessType) ?? BUSINESS_TYPES[0];
    total += businessA * bt.rate;
  }

  const investA = (monthly.investment || 0) * 12;
  if (investA > 0) total += investA * 0.055;

  const pensionA = (monthly.otherIncome || 0) * 12;
  if (pensionA > 0) {
    const net = pensionA * 0.75;
    total += progressiveTax(net);
  }

  return total;
}

function hiddenTaxMonthly(spend: Record<CatKey, number>) {
  let sum = 0;
  const breakdown: Record<CatKey, { amount: number; pctOfIncome: number }> = {} as any;

  const CUSTOMS: Record<CatKey, number> = {
    foodHome: 0.12,
    eatingOut: 0.08,
    housing: 0.00,
    utilities: 0.05,
    transport: 0.22,
    education: 0.05,
    clothing: 0.40,
    personalCare: 0.22,
    entertainment: 0.25,
    other: 0.18,
  };

  const EXCISE_LOCAL: Record<CatKey, number> = {
    foodHome: 0.02,
    eatingOut: 0.03,
    housing: 0.00,
    utilities: 0.02,
    transport: 0.10,
    education: 0.00,
    clothing: 0.00,
    personalCare: 0.05,
    entertainment: 0.07,
    other: 0.03,
  };

  const LOCAL_TAX = 0.02;

  const PROFIT_PASS = 0.22;

  for (const { key } of CATEGORIES) {
    const spendAmt = spend[key] || 0;

    const customs = spendAmt * CUSTOMS[key];
    const excise = spendAmt * EXCISE_LOCAL[key];
    const profit = spendAmt * PROFIT_PASS;
    const local = spendAmt * LOCAL_TAX;

    const vat = (spendAmt + customs + excise + profit) * VAT_RATE;

    const totalHidden = customs + excise + local + profit + vat;

    sum += totalHidden;

    breakdown[key] = {
      amount: totalHidden,
      pctOfIncome: 0,
    };
  }

  return { sum, breakdown };
}

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
        className="h-11 w-full rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 ring-1 ring-white/10 focus:ring-white/20 backdrop-blur-md shadow-[0_0_12px_rgba(255,255,255,0.08)] focus:shadow-[0_0_20px_rgba(255,255,255,0.15)] px-4 text-white text-sm outline-none placeholder-white/40 transition-all duration-200"
        placeholder={placeholder || '0'}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value || 0))}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/60">
        {right}
      </span>
    </div>
  );
}

function Stat({
  title,
  value,
  subtle,
}: {
  title: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] text-slate-200/80 sm:text-xs">{title}</div>
      <div className="text-lg font-extrabold text-white sm:text-xl">{value}</div>
    </div>
  );
}

function HiddenTaxInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(true)}
        className="ml-2 text-[11px] rounded-full px-2 py-0.5 bg-cyan-500/20 animate-pulse hover:bg-cyan-500/30"
      >
        ?
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-black/80 p-4 text-xs text-white backdrop-blur-xl overflow-y-auto max-h-[85vh]">

              <p className="font-semibold mb-3">
                ✅ TRUE Hidden Tax (Inside Every Price)
              </p>

              <p className="mb-2"><b>1️⃣ VAT (13%)</b> — applied on top of everything.</p>

              <p className="mb-2">
                <b>2️⃣ Excise Duty (up to 40%+)</b><br/>
                Petrol/Diesel 35–40%<br/>
                Alcohol 40–75%<br/>
                Tobacco 70–120%<br/>
                Electronics 5–15%
              </p>

              <p className="mb-2">
                <b>3️⃣ Customs Duty (10% → 200%)</b><br/>
                Clothing 30–80%<br/>
                Vehicles 40–200%<br/>
                Packaged goods 10–25%
              </p>

              <p className="mb-2">
                <b>4️⃣ Local Government Taxes</b><br/>
                Road levy, pollution fee, municipal tax (1–3%)
              </p>

              <p className="mb-2">
                <b>5️⃣ Profit Tax Passed to Consumers (20–30%)</b><br/>
                Corporate income tax is baked into the MRP.
              </p>

              <p className="mb-2">
                <b>6️⃣ VAT calculated on customs + excise + profit</b><br/>
                This compounds everything.
              </p>

              <p className="mt-3 text-rose-300">
                🟥 <b>Result:</b> Nepalis silently lose:<br/>
                • 35–70% on normal goods<br/>
                • 80–200% on imports<br/>
                • 200–350% on vehicles, alcohol, tobacco<br/>
                → BEFORE income tax.
              </p>

              <button
                onClick={() => setOpen(false)}
                className="mt-4 w-full rounded-xl bg-cyan-500/20 py-1 text-center hover:bg-cyan-500/30"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Chrome() {
  const [trust, setTrust] = useState(40);

  const [incomeMap, setIncomeMap] = useState<Record<IncomeKey, number>>({
    employment: 0,
    business: 0,
    remittances: 0,
    agriculture: 0,
    investment: 0,
    otherIncome: 0,
  });
  const [businessType, setBusinessType] = useState<BusinessTypeKey>('general');

  const [spend, setSpend] = useState<Record<CatKey, number>>({
    foodHome: 0,
    eatingOut: 0,
    housing: 0,
    utilities: 0,
    transport: 0,
    education: 0,
    clothing: 0,
    personalCare: 0,
    entertainment: 0,
    other: 0,
  });

  const monthlyIncome = useMemo(
    () => Object.values(incomeMap).reduce((s, v) => s + (v || 0), 0),
    [incomeMap],
  );
  const annualIncome = monthlyIncome * 12;

  const monthlySpend = useMemo(
    () => Object.values(spend).reduce((s, v) => s + (v || 0), 0),
    [spend],
  );

  const overspendAmount = Math.max(0, monthlySpend - monthlyIncome);
  const overspendPct = monthlyIncome > 0 ? (overspendAmount / monthlyIncome) * 100 : 0;
  const isOverspending = overspendAmount > 0;

  const annualDirectTax = useMemo(
    () => directTaxAnnualByCategory(incomeMap, businessType),
    [incomeMap, businessType],
  );
  const monthlyDirectTax = annualDirectTax / 12;

  const { sum: monthlyHiddenTax } = useMemo(() => hiddenTaxMonthly(spend), [spend]);

  const monthlyTotalTax = monthlyDirectTax + monthlyHiddenTax;
  const annualTotalTax = monthlyTotalTax * 12;

  const effectiveRatePct = monthlyIncome ? (monthlyTotalTax / monthlyIncome) * 100 : 0;
  const uncertainty = effectiveRatePct * UNCERTAINTY;
  const lowEstimate = effectiveRatePct - uncertainty;
  const highEstimate = effectiveRatePct + uncertainty;

  const taxShare = monthlyIncome ? monthlyTotalTax / monthlyIncome : 0;
  const govDays = Math.max(
    0,
    Math.floor(LIFETIME.daysInYear * Math.min(1, taxShare)),
  );
  const govMonths = +(govDays / 30).toFixed(1);
  const dateLabel = useMemo(() => {
    const y = new Date().getFullYear();
    const dayOfYear = 1 + govDays;
    const dt = new Date(y, 0, dayOfYear);
    const m = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][dt.getMonth()];
    return `${m} ${dt.getDate()}`;
  }, [govDays]);

  const hoursForTaxes = Math.floor(
    LIFETIME.workingHoursPerYear * (effectiveRatePct / 100),
  );
  const workingDaysLost = Math.floor(hoursForTaxes / 8);

  const recurrent = annualTotalTax * BUDGET_SHARES.recurrent;
  const capital = annualTotalTax * BUDGET_SHARES.capital;
  const debt = annualTotalTax * BUDGET_SHARES.debt;
  const recurrentPct = annualTotalTax ? (recurrent / annualTotalTax) * 100 : 0;
  const capitalPct = annualTotalTax ? (capital / annualTotalTax) * 100 : 0;
  const debtPct = annualTotalTax ? (debt / annualTotalTax) * 100 : 0;

  const waste = annualTotalTax * ((100 - trust) / 100);
  const effectiveUse = annualTotalTax - waste;

  const yearsLeft = LIFETIME.retireAge - LIFETIME.currentAge;
  const lifetimeTax = Math.max(0, annualTotalTax * yearsLeft);
  const shareMessage = `I already pay NPR ${formatRs(Math.round(annualTotalTax))} in taxes every year. Where does it go? #MeroKarKhoi #ReceiptOfPower`;

  return (
    <main className="relative min-h-screen bg-black text-white">
      <Starfield />

      <SectionShell id="sleep" accent="cyan">
        <div className="space-y-6 sm:space-y-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
              Nepal True Tax Mirror
            </p>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl lg:text-4xl">
              "I only pay 1% tax." … Are you SURE?
            </h1>
            <p className="mt-3 mx-auto max-w-2xl text-sm text-slate-200/80 sm:text-base">
              WAKE UP: Most Nepalis lose{" "}
              <span className="font-semibold text-amber-200 animate-pulse drop-shadow-[0_0_10px_rgba(255,200,80,0.45)]">
                35%–200%
              </span>{" "}
              of every rupee to hidden taxes. What's{" "}
              <span className="text-amber-100 animate-pulse drop-shadow-[0_0_12px_rgba(255,230,160,0.5)]">
                your
              </span>{" "}
              real number?
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div>
              <h2 className="mb-3 text-sm font-semibold text-cyan-100 sm:text-base">
                1️⃣ Your Monthly Income — all sources
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INCOME_SOURCES.map(({ key, label }) => (
                  <div key={key} className="rounded-xl p-3">
                    <div className="mb-1 text-[12px] text-slate-300/90">{label}</div>
                    <NumberInput
                      value={incomeMap[key]}
                      onChange={(v) => setIncomeMap((m) => ({ ...m, [key]: v }))}
                      placeholder="0"
                      right="NPR"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-300/80">
                  Business Type (for tax on your "Business" income)
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {BUSINESS_TYPES.map((bt) => (
                    <button
                      key={bt.key}
                      type="button"
                      onClick={() => setBusinessType(bt.key)}
                      className={`rounded-lg px-3 py-2 text-left text-xs ${
                        businessType === bt.key
                          ? 'bg-amber-400/10 text-amber-100'
                          : 'bg-transparent text-slate-200 hover:bg-amber-400/5'
                      }`}
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl p-4">
                <div className="text-sm font-semibold text-white/90">
                  Total Monthly Income
                </div>
                <div className="bg-gradient-to-r from-amber-300 via-white to-fuchsia-300 bg-clip-text text-xl font-extrabold text-transparent">
                  NPR {formatRs(monthlyIncome)}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-cyan-100 sm:text-base">
                  2️⃣ Your Monthly Spending — where it vanishes
                </h2>
                <p className="mb-3 text-[11px] text-slate-300/80 sm:text-xs">
                  These amounts carry VAT and excise inside them. You never see the tax
                  invoice, but you always pay it.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(({ key, label }) => (
                    <div
                      key={key}
                      className="rounded-2xl p-3"
                    >
                      <div className="mb-1 text-[11px] text-slate-200/85">{label}</div>
                      <NumberInput
                        value={spend[key]}
                        onChange={(v) => setSpend((m) => ({ ...m, [key]: v }))}
                        placeholder="0"
                        right="NPR"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl px-4 py-2">
                  <span className="text-[11px] text-slate-200/85 sm:text-xs">
                    Total Monthly Spending
                  </span>
                  <span className="text-sm font-semibold text-white sm:text-base">
                    NPR {formatRs(monthlySpend)}
                  </span>
                </div>
              </div>

              <div className="border-t border-transparent pt-1">
                <p className="mt-3 text-[11px] text-slate-300/80 sm:text-xs">
                  Based on your truth, this is how much of your life quietly goes to taxes
                  every month:
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex-1">
                    <div className="text-[11px] text-slate-300/80">
                      Effective total tax rate
                    </div>
                    <div className="mt-1 text-4xl font-extrabold text-cyan-100 drop-shadow-[0_0_40px_rgba(34,211,238,0.5)] sm:text-5xl">
                      {effectiveRatePct.toFixed(1)}%
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300/80">
                      Range: {lowEstimate.toFixed(1)}% – {highEstimate.toFixed(1)}% (±5%
                      uncertainty)
                    </div>
                  </div>
                  <div className="grid gap-2 sm:w-60 sm:grid-cols-2">
                    <Stat
                      title="Visible (income) tax / mo"
                      value={`NPR ${formatRs(monthlyDirectTax)}`}
                      subtle
                    />
                    <Stat
                      title={
                        <div className="flex items-center gap-1">
                          Hidden (price) tax / mo
                          <HiddenTaxInfo />
                        </div>
                      }
                      value={`NPR ${formatRs(monthlyHiddenTax)}`}
                      subtle
                    />
                  </div>
                </div>
                <p className="mt-3 text-[11px] italic text-slate-300/80 sm:text-xs">
                  "I pay only 1%" was a sweet dream. This is the real alarm clock.
                </p>

                {isOverspending && (
                  <motion.div
                    className="mt-4 rounded-2xl bg-rose-500/20 px-4 py-3 text-left text-[11px] text-rose-50/95 sm:px-5 sm:py-4 sm:text-sm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: 1,
                      scale: [1, 1.03, 1],
                      boxShadow: [
                        '0 0 0 rgba(248,113,113,0.0)',
                        '0 0 30px rgba(248,113,113,0.6)',
                        '0 0 0 rgba(248,113,113,0.0)',
                      ],
                    }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      repeatType: 'reverse',
                    }}
                  >
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <span className="text-[13px] sm:text-sm">
                        ⚠️ Budget Alert: Spending Exceeds Income
                      </span>
                    </div>
                    <p>
                      Your monthly spending (
                      <span className="font-semibold">
                        NPR {formatRs(monthlySpend)}
                      </span>
                      ) exceeds your income (
                      <span className="font-semibold">
                        NPR {formatRs(monthlyIncome)}
                      </span>
                      ) by{" "}
                      <span className="font-semibold">
                        NPR {formatRs(overspendAmount)} ({overspendPct.toFixed(1)}%)
                      </span>
                      . Time to embrace a{" "}
                      <span className="underline decoration-rose-200/80">
                        frugal lifestyle
                      </span>
                      — or this gap becomes silent debt slavery.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell id="machine" accent="amber">
        <div className="space-y-6 sm:space-y-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">
              Where your tax actually goes
            </p>
            <h2 className="mt-2 bg-gradient-to-r from-amber-200 via-white to-orange-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
              You don't just fund "development". You fund the whole machine.
            </h2>
            <p className="mt-3 mx-auto max-w-2xl text-sm text-slate-200/85 sm:text-base">
              Using Nepal's real budget shares (2081/82), your annual tax is split
              into three lives: the machine (recurrent), the future (capital), and the
              past (debt).
            </p>
          </div>

          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-4">
              <div className="mb-1 text-[11px] text-slate-300/80 sm:text-xs">
                Annual tax based on your inputs:
              </div>
              <div className="text-3xl font-extrabold text-amber-100 drop-shadow-[0_0_40px_rgba(251,191,36,0.6)] sm:text-4xl">
                NPR {formatRs(annualTotalTax)}
              </div>
              <div className="mt-5 space-y-3">
                {[
                  {
                    label:
                      'Recurrent — the machine (salaries, admin, grants, interest)',
                    amount: recurrent,
                    pct: recurrentPct,
                    grad: 'from-amber-400 to-yellow-200',
                  },
                  {
                    label:
                      'Capital — the future (roads, bridges, schools, hospitals)',
                    amount: capital,
                    pct: capitalPct,
                    grad: 'from-emerald-400 to-lime-200',
                  },
                  {
                    label:
                      'Debt — the past (repaying old domestic & foreign loans)',
                    amount: debt,
                    pct: debtPct,
                    grad: 'from-rose-400 to-orange-300',
                  },
                ].map(({ label, amount, pct, grad }) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-200/90 sm:text-xs">
                        {label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-100 sm:text-xs">
                        {pct.toFixed(1)}% · NPR {formatRs(amount)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-transparent/20">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${grad}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(100, pct)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl bg-amber-400/5 px-4 py-4 sm:px-5 sm:py-5">
                <p className="font-serif text-sm leading-relaxed text-amber-50/95 sm:text-base">
                  "Most of your effort does not build new things. It keeps the old
                  machine humming, and pays for mistakes made before you were even
                  born."
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat title="For the machine" value={`${recurrentPct.toFixed(1)}%`} />
                <Stat
                  title="Builds the future"
                  value={`${capitalPct.toFixed(1)}%`}
                  subtle
                />
                <Stat
                  title="Pays the past"
                  value={`${debtPct.toFixed(1)}%`}
                  subtle
                />
              </div>
              <p className="text-[11px] text-slate-300/85 sm:text-xs">
                You are not just a "taxpayer". You are the fuel that keeps this entire
                structure alive. The question is not "do you pay?", it is "what do you
                keep alive with your payment?".
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell id="leak" accent="red">
        <div className="space-y-6 sm:space-y-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-rose-200/80">
              The leak of trust
            </p>
            <h2 className="mt-2 bg-gradient-to-r from-rose-200 via-white to-orange-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
              How much of this do you believe is used honestly?
            </h2>
            <p className="mt-3 mx-auto max-w-2xl text-sm text-slate-200/85 sm:text-base">
              This slider is not about the government's official report. It is about
              your gut. Your lived sense of honesty.
            </p>
          </div>

          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-200/90 sm:text-xs">
                  Your trust in how honestly taxes are used
                </span>
                <span className="text-sm font-semibold text-rose-100 sm:text-base">
                  {trust}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={trust}
                onChange={(e) => setTrust(Number(e.target.value))}
                className="w-full accent-rose-400"
              />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Stat
                  title="Looks honestly used"
                  value={`NPR ${formatRs(effectiveUse)}/yr`}
                  subtle
                />
                <Stat
                  title="Feels leaked, wasted or stolen"
                  value={`NPR ${formatRs(waste)}/yr`}
                />
              </div>
              <p className="mt-3 font-serif text-[11px] leading-relaxed text-rose-50/90 sm:text-xs">
                "You are not poor because you didn't work hard. You are poorer
                because the bridge between your effort and your future leaks every year
                — quietly, politely, without sirens."
              </p>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-rose-900/70 via-slate-950/90 to-black p-5 sm:p-6">
                <motion.div
                  className="mb-4 h-2 w-full overflow-hidden rounded-full bg-transparent/20"
                  initial={{ backgroundPositionX: 0 }}
                  animate={{ backgroundPositionX: ['0%', '100%', '0%'] }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(248,113,113,0.9), rgba(248,113,113,0.9) 10px, transparent 10px, transparent 20px)',
                  }}
                />
                <div className="mb-1 text-xs text-slate-200/85">At your trust level:</div>
                <div className="text-2xl font-extrabold text-rose-100 sm:text-3xl">
                  {annualTotalTax ? ((waste / annualTotalTax) * 100).toFixed(1) : '0.0'}%
                </div>
                <div className="text-[11px] text-slate-200/85 sm:text-xs">
                  of your own hard-earned tax feels like it simply disappears.
                </div>
                <div className="mt-4 rounded-2xl bg-rose-500/20 px-4 py-3 text-[11px] text-rose-50/95 sm:text-xs">
                  "You are not just being taxed. You are being trained to accept it
                  without question."
                </div>
              </div>
              <p className="text-[11px] text-slate-300/80 sm:text-xs">
                When millions of honest people accept this quietly, the system calls it
                "stability". When those people begin to question, it is called
                awakening.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell id="receipt" accent="white">
        <div className="space-y-6 sm:space-y-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-100/80">
              Receipt of power
            </p>
            <h2 className="mt-2 bg-gradient-to-r from-slate-100 via-white to-cyan-200 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
              You're not a subject. You're a shareholder.
            </h2>
            <p className="mt-3 mx-auto max-w-2xl text-sm text-slate-200/85 sm:text-base">
              Every rupee you've paid is a tiny share in this country. This
              calculator simply prints your receipt.
            </p>
          </div>

          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="space-y-4">
              <motion.div
                className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50/5 via-slate-900/30 to-black/50 px-4 py-5 font-mono text-sm sm:px-6 sm:py-6"
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-300 via-white to-violet-300" />
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-200/80">
                  <span>NEPAL TRUE TAX MIRROR</span>
                  <span>{new Date().getFullYear()}</span>
                </div>
                <div className="my-2 border-t border-dashed border-slate-500/50" />
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">Annual tax:</span>
                  <span className="text-base font-extrabold text-white sm:text-lg">
                    NPR {formatRs(annualTotalTax)}
                  </span>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">Effective rate:</span>
                  <span className="text-sm font-semibold text-cyan-200">
                    {effectiveRatePct.toFixed(1)}%
                  </span>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">
                    Days worked for state:
                  </span>
                  <span className="text-sm font-semibold text-amber-200">
                    {govDays} days (~{govMonths} months, until {dateLabel})
                  </span>
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">
                    Lifetime contribution (till {LIFETIME.retireAge}):
                  </span>
                  <span className="text-sm font-semibold text-emerald-200">
                    NPR {formatRs(lifetimeTax)}
                  </span>
                </div>
                <div className="my-2 border-t border-dashed border-slate-500/50" />
                <p className="font-serif text-[11px] leading-relaxed text-slate-100/90">
                  "You have already bought a large piece of this nation with your
                  honesty. You do not owe it blind obedience. It owes you transparent
                  truth."
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-500/50 pt-2 text-[10px] text-slate-400">
                  <span>#MeroKarKhoi</span>
                  <span>#ReceiptOfPower</span>
                </div>
              </motion.div>

              <p className="text-[11px] text-slate-300/80 sm:text-xs">
                A receipt is proof of payment — and proof of the right to ask questions.
                Keep this mental receipt whenever someone tells you to "just trust the
                system".
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1 text-[11px] text-slate-200/90 sm:text-xs">
                  Share this truth if you dare:
                </div>
                <textarea
                  className="h-28 w-full rounded-xl bg-white/10 hover:bg-white/15 focus:bg-white/20 ring-1 ring-white/10 focus:ring-white/20 backdrop-blur-md shadow-[0_0_12px_rgba(255,255,255,0.08)] focus:shadow-[0_0_20px_rgba(255,255,255,0.15)] px-4 py-3 text-white text-sm outline-none placeholder-white/40 transition-all duration-200"
                  value={shareMessage}
                  readOnly
                />
                <p className="mt-2 text-[11px] text-slate-300/80 sm:text-xs">
                  Copy and paste anywhere — TikTok, Facebook, X, Instagram. One honest
                  receipt can embarrass a thousand empty speeches.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] sm:text-xs">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-2xl bg-sky-500/20 px-3 py-2 transition hover:bg-sky-500/30 hover:scale-[1.02]"
                >
                  🐦 Post on X
                </a>

                <button
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: "My Nepal Tax Reflection",
                          text: shareMessage,
                          url: "https://www.gatishilnepal.org/tax",
                        });
                      } catch (err) {
                        console.log("Share cancelled", err);
                      }
                    } else {
                      alert("Sharing is not supported on this device.");
                    }
                  }}
                  className="flex items-center justify-center rounded-2xl bg-emerald-500/15 px-3 py-2 transition hover:bg-emerald-500/25 hover:scale-[1.02]"
                >
                  📎 Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell id="courage" accent="gold">
        <div className="space-y-6 sm:space-y-8">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200/80">
              From "I" to "We"
            </p>
            <h2 className="mt-2 bg-gradient-to-r from-yellow-200 via-white to-emerald-200 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
              Imagine every honest taxpayer holding their receipt at once.
            </h2>
            <p className="mt-3 mx-auto max-w-2xl text-sm text-slate-200/85 sm:text-base">
              One person asking "Where is my money?" is a complaint. A million asking it
              together is a peaceful revolution.
            </p>
          </div>

          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-10">
            <div className="relative h-64 sm:h-72 lg:h-80">
              <div className="absolute inset-0 overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black">
                <div className="absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.2),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(96,165,250,0.15),_transparent_60%)]" />
                <div className="absolute inset-6 sm:inset-8">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute h-1 w-1 rounded-full bg-yellow-300/90 shadow-[0_0_10px_rgba(250,204,21,0.9)]"
                      style={{
                        top: `${10 + (i * 73) % 80}%`,
                        left: `${5 + (i * 47) % 90}%`,
                      }}
                      initial={{ opacity: 0, scale: 0.4 }}
                      whileInView={{
                        opacity: [0.1, 1, 0.4],
                        scale: [0.4, 1, 0.8],
                      }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 3 + (i % 5),
                        repeat: Infinity,
                        repeatType: 'reverse',
                        delay: i * 0.04,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-center text-[10px] text-yellow-100 sm:p-4 sm:text-xs">
                  Each dot is a citizen who stopped being shy and started being sovereign.
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl bg-yellow-500/10 px-4 py-4 sm:px-5 sm:py-6">
                <p className="font-serif text-sm leading-relaxed text-yellow-50/95 sm:text-base">
                  "The powerless did not build this country by begging. They built it by
                  working, paying, and trusting. The real question now is: will they
                  continue to trust blindly, or will they ask to see the ledger?"
                </p>
              </div>
              <p className="text-[11px] text-slate-200/85 sm:text-xs">
                When enough receipts are held up in the sunlight, the throne has two
                choices: become honest, or become empty. There is no third option.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell id="awakening" accent="dawn">
        <div className="mx-auto max-w-3xl space-y-6 text-center sm:space-y-8">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">
            The quiet rebellion
          </p>
          <h2 className="mt-2 bg-gradient-to-r from-orange-200 via-white to-emerald-200 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">
            You've paid enough. Now ask enough.
          </h2>
          <p className="mt-3 text-sm text-slate-200/85 sm:text-base">
            This calculator was not built to make you proud of paying more tax. It was
            built to remind you that{" "}
            <span className="font-semibold text-amber-100">
              you already pay enough to demand the truth
            </span>
            .
          </p>

          <div className="mt-4 rounded-3xl bg-amber-500/15 px-4 py-5 sm:px-6 sm:py-6">
            <p className="font-serif text-sm leading-relaxed text-amber-50/95 sm:text-base">
              "Freedom does not begin when a law is repealed. Freedom begins the day you
              stop being proud of blind obedience — and start being proud of awake
              responsibility."
            </p>
          </div>

          <div className="mt-4 flex flex-col items-center gap-3">
            <a
              href="/join"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_40px_rgba(248,250,252,0.5)] transition hover:scale-[1.02] active:scale-[0.99] sm:px-8 sm:py-3.5 sm:text-base"
            >
              Join the Digital Chautari — I want to see the ledger
            </a>
            <p className="max-w-sm text-[11px] text-slate-300/80 sm:text-xs">
              When you step into the Chautari, you are not a follower. You are a
              co-auditor of Nepal's future.
            </p>
          </div>

          <footer className="pt-4 text-[10px] text-slate-400 sm:text-[11px]">
            Built with ❤️ by Gatishil — for every powerless soul who secretly knew they
            were the real power all along.
          </footer>
        </div>
      </SectionShell>
    </main>
  );
}
