"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Gatishil Nepal — Seamless Tax Mirror
 * Ported 1:1 from nepal-tax-mirror.html with identical math and outputs,
 * wrapped in a single-scroll, borderless Gatishil design (Tailwind).
 *
 * Notes:
 * - Income tax: FY 2082/83 brackets + employment 1% SST (cap NPR 5,000).
 * - Hidden taxes: VAT (13%) applied to vatable share per category + excise adds.
 * - Outputs: True Tax %, range ±5%, visible vs hidden, Tax Freedom Day,
 *   Life Hours (2000 hrs/year baseline), Lifetime Tax Burden (age 30→60),
 *   Bracket Creep slider, micro-text, spending warning.
 */

type NumMap = Record<string, number>;

const taxSettings = {
  vatRate: 0.13,
  vatableShare: {
    foodHome: 0.6,
    eatingOut: 0.95,
    housing: 0.0,
    utilities: 1.0,
    transport: 0.7,
    education: 0.8,
    clothing: 1.0,
    personalCare: 1.0,
    entertainment: 1.0,
    other: 1.0,
  } as NumMap,
  exciseRates: {
    transport: 0.08,
    foodHome: 0.02,
    eatingOut: 0.03,
    personalCare: 0.01,
  } as NumMap,
  uncertainty: 0.05,
};

const categoryLabels: Record<string, string> = {
  foodHome: "Food (Home)",
  eatingOut: "Eating Out",
  housing: "Housing/Rent",
  utilities: "Utilities",
  transport: "Transport",
  education: "Education/Health",
  clothing: "Clothing",
  personalCare: "Personal Care",
  entertainment: "Entertainment",
  other: "Other",
};

function formatNPR(v: number) {
  if (!isFinite(v)) return "NPR 0";
  return `NPR ${Math.round(v).toLocaleString()}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// FY 2082/83 progressive rate used for EMPLOYMENT/BUSINESS/ETC (base progressive)
function calcProgressiveTax(annualIncome: number) {
  // Brackets: 1% up to 500k; next 200k @10%; next 300k @20%; next 1M @30%;
  // next 3M @36%; remainder @39%
  let tax = 0;
  if (annualIncome <= 500_000) {
    tax = annualIncome * 0.01;
  } else if (annualIncome <= 700_000) {
    tax = 500_000 * 0.01 + (annualIncome - 500_000) * 0.1;
  } else if (annualIncome <= 1_000_000) {
    tax = 500_000 * 0.01 + 200_000 * 0.1 + (annualIncome - 700_000) * 0.2;
  } else if (annualIncome <= 2_000_000) {
    tax =
      500_000 * 0.01 +
      200_000 * 0.1 +
      300_000 * 0.2 +
      (annualIncome - 1_000_000) * 0.3;
  } else if (annualIncome <= 5_000_000) {
    tax =
      500_000 * 0.01 +
      200_000 * 0.1 +
      300_000 * 0.2 +
      1_000_000 * 0.3 +
      (annualIncome - 2_000_000) * 0.36;
  } else {
    tax =
      500_000 * 0.01 +
      200_000 * 0.1 +
      300_000 * 0.2 +
      1_000_000 * 0.3 +
      3_000_000 * 0.36 +
      (annualIncome - 5_000_000) * 0.39;
  }
  return tax;
}

// Category-aware income tax (mirrors the HTML logic)
// - Employment: progressive + Social Security 1% on first 500k (cap 5,000)
// - Business: progressive only
// - Remittances/Agriculture: treated as 0 (per mirror)
// - Investment/OtherIncome: progressive (simple mirror behavior)
function calcNepalIncomeTaxByCategory(income: {
  employment: number;
  business: number;
  remittances: number;
  agriculture: number;
  investment: number;
  otherIncome: number;
}) {
  let totalTax = 0;

  const empAnnual = (income.employment || 0) * 12;
  if (empAnnual > 0) {
    totalTax += calcProgressiveTax(empAnnual);
    const sst = Math.min(empAnnual * 0.01, 5_000);
    totalTax += sst;
  }

  const bizAnnual = (income.business || 0) * 12;
  if (bizAnnual > 0) totalTax += calcProgressiveTax(bizAnnual);

  // Remittances and Agriculture assumed non-taxable in mirror
  // const remAnnual = (income.remittances || 0) * 12; // 0
  // const agrAnnual = (income.agriculture || 0) * 12; // 0

  const invAnnual = (income.investment || 0) * 12;
  if (invAnnual > 0) totalTax += calcProgressiveTax(invAnnual);

  const otherAnnual = (income.otherIncome || 0) * 12;
  if (otherAnnual > 0) totalTax += calcProgressiveTax(otherAnnual);

  return totalTax;
}

function daysToFreedom(effectiveRatePercent: number) {
  const rate = clamp(effectiveRatePercent / 100, 0, 0.9999);
  return Math.round(365 * rate);
}

function taxFreedomDateForYear(year: number, days: number) {
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function useNumberState<T extends string>(
  keys: readonly T[],
  initial: number = 0
) {
  const [state, setState] = useState<Record<T, number>>(
    Object.fromEntries(keys.map((k) => [k, initial])) as Record<T, number>
  );
  const update = (k: T, v: number) =>
    setState((s) => ({ ...s, [k]: isNaN(v) ? 0 : v }));
  return [state, update] as const;
}

const incomeKeys = [
  "employment",
  "business",
  "remittances",
  "agriculture",
  "investment",
  "otherIncome",
] as const;

const spendKeys = [
  "foodHome",
  "eatingOut",
  "housing",
  "utilities",
  "transport",
  "education",
  "clothing",
  "personalCare",
  "entertainment",
  "other",
] as const;

export default function Chrome() {
  // Income & Spending
  const [income, setIncome] = useNumberState<typeof incomeKeys[number]>(
    incomeKeys,
    0
  );
  const [spend, setSpend] = useNumberState<typeof spendKeys[number]>(
    spendKeys,
    0
  );

  // Bracket creep slider (mirror)
  const [bracketIncome, setBracketIncome] = useState(500_000);

  // Derived computations (pure)
  const monthlyIncome = useMemo(
    () => Object.values(income).reduce((a, b) => a + b, 0),
    [income]
  );
  const annualIncome = monthlyIncome * 12;

  const monthlyDirectTax = useMemo(() => {
    const annual = calcNepalIncomeTaxByCategory(income);
    return annual / 12;
  }, [income]);

  const {
    hiddenTaxMonthly,
    hiddenBreakdown,
    totalSpending,
  }: {
    hiddenTaxMonthly: number;
    hiddenBreakdown: Record<
      string,
      { amount: number; percentageOfIncome: number }
    >;
    totalSpending: number;
  } = useMemo(() => {
    const total = Object.values(spend).reduce((a, b) => a + b, 0);
    let hidden = 0;
    const breakdown: Record<
      string,
      { amount: number; percentageOfIncome: number }
    > = {};

    spendKeys.forEach((k) => {
      const v = spend[k] || 0;
      const vat = v * (taxSettings.vatableShare[k] || 0) * taxSettings.vatRate;
      const exc = v * (taxSettings.exciseRates[k] || 0);
      const sum = vat + exc;
      hidden += sum;
      breakdown[k] = {
        amount: sum,
        percentageOfIncome: monthlyIncome > 0 ? (sum / monthlyIncome) * 100 : 0,
      };
    });

    return {
      hiddenTaxMonthly: hidden,
      hiddenBreakdown: breakdown,
      totalSpending: total,
    };
  }, [spend, monthlyIncome]);

  const totalMonthlyTax = monthlyDirectTax + hiddenTaxMonthly;
  const effectiveRate =
    monthlyIncome > 0 ? (totalMonthlyTax / monthlyIncome) * 100 : 0;

  const rangeLow = effectiveRate * (1 - taxSettings.uncertainty);
  const rangeHigh = effectiveRate * (1 + taxSettings.uncertainty);

  // Freedom Day & Life Hours
  const daysWorkingForGov = daysToFreedom(effectiveRate);
  const taxFreedomDate = taxFreedomDateForYear(new Date().getUTCFullYear(), daysWorkingForGov);
  const monthsWorkedForGov = Math.floor(daysWorkingForGov / 30);
  const remDays = daysWorkingForGov % 30;

  const workingHoursPerYear = 2000; // mirror baseline
  const hoursForTaxes = Math.floor((workingHoursPerYear * effectiveRate) / 100);
  const dailyLifeHours = (hoursForTaxes / 365).toFixed(1);
  const monthlyLifeHours = (hoursForTaxes / 12).toFixed(1);
  const workingDaysLost = Math.round(hoursForTaxes / 8);

  // Lifetime burden (mirror assumption: age 30→60)
  const annualTaxNow = totalMonthlyTax * 12;
  const yearsLeft = 60 - 30;
  const lifetimeTax = Math.max(0, annualTaxNow * yearsLeft);
  const yearsWorkingForGov = ((effectiveRate / 100) * yearsLeft).toFixed(1);

  // Bracket creep helper
  const bracketTax = useMemo(() => {
    const t = calcProgressiveTax(bracketIncome);
    const rate = (t / bracketIncome) * 100;
    return { t, rate };
  }, [bracketIncome]);

  // Microtext
  const hiddenPctOfTotal =
    totalMonthlyTax > 0 ? (hiddenTaxMonthly / totalMonthlyTax) * 100 : 0;
  const microText =
    effectiveRate > 25
      ? `Wow. ${hiddenPctOfTotal.toFixed(
          0
        )}% of your taxes are baked into prices you can’t see. That’s why life feels expensive even when your “income tax” looks smaller.`
      : effectiveRate > 15
      ? `You’re paying about ${Math.round(
          hiddenPctOfTotal
        )}% in hidden taxes. The visible tax is only part of the story. The real question: do you know where it goes?`
      : `Even at ${effectiveRate.toFixed(
          1
        )}%, roughly ${Math.round(
          hiddenPctOfTotal
        )}% of your total tax load is hidden in everyday spending. That’s the price of a modern economy—know it, then decide if it’s worth it.`;

  // Spending warning
  const overspend =
    monthlyIncome > 0 && totalSpending > monthlyIncome
      ? totalSpending - monthlyIncome
      : 0;

  // UI helpers
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const tfLabel = `${months[taxFreedomDate.getUTCMonth()]} ${taxFreedomDate.getUTCDate()}`;

  return (
    <div className="min-h-screen w-full bg-[#0a0b10] text-white">
      {/* Header */}
      <header className="mx-auto max-w-5xl px-4 pt-10 pb-6">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Nepal <span className="text-rose-400">True Tax Mirror</span>
        </h1>
        <p className="text-sm md:text-base text-neutral-300 mt-2">
          Identical math to your mirror, re-skinned for Gatishil: visible + hidden taxes,
          freedom day, life hours, and lifetime burden — in one seamless flow.
        </p>
      </header>

      {/* True Tax readout */}
      <section className="mx-auto max-w-5xl px-4 pb-4">
        <div className="rounded-3xl bg-gradient-to-b from-[#11131a] to-[#0b0d14] ring-1 ring-white/5 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-neutral-300 text-sm">Your True Tax Rate</div>
              <div className="text-6xl md:text-7xl font-bold leading-none mt-2">
                {isFinite(effectiveRate) ? `${effectiveRate.toFixed(1)}%` : "0.0%"}
              </div>
              <div className="text-neutral-400 text-xs mt-1">
                Range: {rangeLow.toFixed(1)}% – {rangeHigh.toFixed(1)}% (±5%)
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-neutral-400 text-xs">Visible Tax (monthly)</div>
                <div className="text-xl font-semibold">{formatNPR(monthlyDirectTax)}</div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Hidden Tax (monthly)</div>
                <div className="text-xl font-semibold">{formatNPR(hiddenTaxMonthly)}</div>
              </div>
            </div>
          </div>
          {overspend > 0 && (
            <div className="mt-5 rounded-xl bg-amber-500/10 text-amber-200 px-4 py-3 text-sm">
              Your monthly spending exceeds income by <strong>{formatNPR(overspend)}</strong>.
              Time to embrace a frugal lifestyle!
            </div>
          )}
          <p className="text-neutral-300 text-sm mt-5">{microText}</p>
        </div>
      </section>

      {/* Inputs */}
      <section className="mx-auto max-w-5xl px-4 py-4 space-y-8">
        {/* Income */}
        <div className="rounded-3xl bg-[#0f1118] ring-1 ring-white/5 p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4">Monthly Income (NPR)</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {incomeKeys.map((k) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-neutral-300 text-sm capitalize">
                  {k === "otherIncome" ? "Other Income" : k}
                </span>
                <input
                  inputMode="numeric"
                  className="w-full rounded-xl bg-black/40 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-rose-400/40"
                  value={income[k] || ""}
                  placeholder="0"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                    setIncome(k, v);
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Spending */}
        <div className="rounded-3xl bg-[#0f1118] ring-1 ring-white/5 p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4">Monthly Spending (NPR)</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {spendKeys.map((k) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-neutral-300 text-sm">{categoryLabels[k]}</span>
                <input
                  inputMode="numeric"
                  className="w-full rounded-xl bg-black/40 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-rose-400/40"
                  value={spend[k] || ""}
                  placeholder="0"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                    setSpend(k, v);
                  }}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 text-sm text-neutral-300">
            Total spending: <span className="font-semibold">{formatNPR(totalSpending)}</span>
          </div>
        </div>
      </section>

      {/* Breakdown + Heat hints */}
      <section className="mx-auto max-w-5xl px-4 py-4">
        <div className="rounded-3xl bg-gradient-to-b from-[#11131a] to-[#0b0d14] ring-1 ring-white/5 p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4">Hidden Tax by Category</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {spendKeys.map((k) => {
              const b = hiddenBreakdown[k] || { amount: 0, percentageOfIncome: 0 };
              return (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-36 text-sm text-neutral-300">{categoryLabels[k]}</div>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-rose-500"
                      style={{
                        width: `${clamp(b.percentageOfIncome, 0, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-40 text-right text-sm text-neutral-300">
                    {formatNPR(b.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tax Freedom Day */}
      {totalMonthlyTax > 0 && monthlyIncome > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-4">
          <div className="rounded-3xl bg-[#0f1118] ring-1 ring-white/5 p-6 md:p-8">
            <h2 className="text-lg font-semibold">🔥 Tax Freedom Day</h2>
            <p className="text-sm text-neutral-300 mt-1">
              The day you stop working for the government each year.
            </p>
            <div className="mt-4 grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-neutral-400 text-xs">Tax Freedom Day</div>
                <div className="text-2xl font-semibold">{tfLabel}</div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Days worked for gov</div>
                <div className="text-2xl font-semibold">{daysWorkingForGov}</div>
                <div className="text-neutral-400 text-xs">
                  ≈ {monthsWorkedForGov} months {remDays} days
                </div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Effective Rate</div>
                <div className="text-2xl font-semibold">
                  {effectiveRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Life Hours */}
      {totalMonthlyTax > 0 && monthlyIncome > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-4">
          <div className="rounded-3xl bg-gradient-to-b from-[#11131a] to-[#0b0d14] ring-1 ring-white/5 p-6 md:p-8">
            <h2 className="text-lg font-semibold">⏳ Life Hours You Work for Taxes</h2>
            <div className="mt-4 grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-neutral-400 text-xs">Annual</div>
                <div className="text-2xl font-semibold">{hoursForTaxes.toLocaleString()} hrs</div>
                <div className="text-neutral-400 text-xs">
                  ≈ {workingDaysLost} working days
                </div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Per day</div>
                <div className="text-2xl font-semibold">{dailyLifeHours} hrs</div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Per month</div>
                <div className="text-2xl font-semibold">{monthlyLifeHours} hrs</div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Working baseline</div>
                <div className="text-2xl font-semibold">2000 hrs/yr</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lifetime Burden */}
      {totalMonthlyTax > 0 && monthlyIncome > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-4">
          <div className="rounded-3xl bg-[#0f1118] ring-1 ring-white/5 p-6 md:p-8">
            <h2 className="text-lg font-semibold">🏛️ Lifetime Tax Burden (age 30→60)</h2>
            <div className="mt-4 grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-neutral-400 text-xs">Lifetime Taxes</div>
                <div className="text-2xl font-semibold">
                  {`NPR ${(lifetimeTax / 10_000_000).toFixed(1)} Crore`}
                </div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Years “for gov”</div>
                <div className="text-2xl font-semibold">{yearsWorkingForGov} yrs</div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Annual at current pace</div>
                <div className="text-2xl font-semibold">{formatNPR(annualTaxNow)}</div>
              </div>
            </div>
            <p className="text-sm text-neutral-300 mt-3">
              Every rupee you pay is a rupee you can’t invest in your future. If inflation rises,
              the burden grows even faster.
            </p>
          </div>
        </section>
      )}

      {/* Bracket Creep Explorer */}
      <section className="mx-auto max-w-5xl px-4 py-4">
        <div className="rounded-3xl bg-gradient-to-b from-[#11131a] to-[#0b0d14] ring-1 ring-white/5 p-6 md:p-8">
          <h2 className="text-lg font-semibold">📈 Bracket Heat (Instant)</h2>
          <div className="mt-4">
            <input
              type="range"
              min={200_000}
              max={5_000_000}
              step={10_000}
              value={bracketIncome}
              onChange={(e) => setBracketIncome(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500"
            />
            <div className="mt-3 grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-neutral-400 text-xs">Income</div>
                <div className="text-2xl font-semibold">
                  {`NPR ${bracketIncome.toLocaleString()}`}
                </div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Annual Tax</div>
                <div className="text-2xl font-semibold">{formatNPR(bracketTax.t)}</div>
              </div>
              <div>
                <div className="text-neutral-400 text-xs">Effective Rate</div>
                <div className="text-2xl font-semibold">{bracketTax.rate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-neutral-300 mt-3">
            Move the slider to feel the jump between brackets — that jolt you feel is bracket creep.
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-neutral-500 text-xs">
        Built for Gatishil Nepal • Cosmic black, soft glow, no borders • Identical math to your mirror.
      </footer>
    </div>
  );
}
