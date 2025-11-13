'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function WuWeiLanding() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col items-center text-center px-6 py-20 space-y-24">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent mb-6"
        >
          Wu-Wei Cooperative OS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-lg md:text-xl text-gray-300 leading-relaxed"
        >
          How <span className="text-amber-400 font-medium">Wu-Wei</span> creates effortless harmony through transparency.  
          When everyone sees the same facts, trust flows naturally — control becomes unnecessary.
        </motion.p>
        <Link href="/en/dashboard" className="inline-block mt-10">
          <button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-lg px-8 py-4 rounded-xl shadow-lg shadow-amber-500/20 transition">
            See Live Dashboard
          </button>
        </Link>
      </section>

      {/* Core Principles */}
      <section className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-semibold text-amber-400 mb-8">🌿 Core Principles</h2>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <Principle
            title="Effortless Action"
            text="Wu-wei means working with natural flow rather than forcing control. When transparency replaces surveillance, people naturally align with community needs."
          />
          <Principle
            title="Visible Reality"
            text="When reality is visible, manipulation isn’t worth trying. Physics-based oversight replaces gossip-based monitoring, creating trust through light, not locks."
          />
          <Principle
            title="Natural Harmony"
            text="Communities function best when everyone sees the same facts and can take small, reversible steps toward better decisions."
          />
        </div>
      </section>

      {/* Key Features */}
      <section className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-semibold text-amber-400 mb-8">🔑 Key Features</h2>
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <Feature
            title="Open-Spend + Public Challenge"
            points={[
              'Immediate transparency — all purchases visible',
              'Community-based validation system',
              'Learning opportunity, not punishment',
            ]}
            text="Anyone can buy what’s needed. Anyone can challenge spending that seems unclear. The community reviews together, learns together, improves together."
          />
          <Feature
            title="Four Clear Outcomes"
            points={[
              'Justify → Provide valid reason',
              'Equalize → Pay difference to commons',
              'Refund → Get shop refund/credit',
              'Improve → Plan better bulk buy',
            ]}
            text="Every challenge leads to one of four clear outcomes, turning disputes into community improvement."
          />
          <Feature
            title="Three Tiny Locks"
            points={[
              'Proposal → Spend Link',
              'Two-Person Rule',
              'No Private Payees',
            ]}
            text="Simple security without friction. Three lightweight rules prevent the most common cooperative problems."
          />
          <Feature
            title="Sunlight Dials"
            points={[
              'Posting delay under 3 minutes',
              'Reversal rate under 5%',
              'Zero orphan spends',
            ]}
            text="Simple health indicators show community wellness at a glance. No complex dashboards — just clarity."
          />
        </div>
      </section>

      {/* Live Prototype Demo */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold text-amber-400 mb-4">💫 Live Prototype Demo</h2>
        <p className="text-gray-300 text-lg mb-6 leading-relaxed">
          Experience the system in action — submit spends, challenge purchases, resolve disputes, and watch sunlight dials update in real-time.
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-6">
          <DemoButton label="Try the System" />
          <DemoButton label="Switch Roles" />
          <DemoButton label="Watch the Dials" />
        </div>
      </section>

      {/* Stakeholder Benefits */}
      <section className="max-w-6xl mx-auto text-left">
        <h2 className="text-3xl font-semibold text-amber-400 mb-8 text-center">🤝 Stakeholder Benefits</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Stakeholder
            role="Villagers"
            features={[
              'Transparent spending records',
              'QR code receipt verification',
              'Community discussion threads',
            ]}
          />
          <Stakeholder
            role="Farmers"
            features={[
              'Harvest weight verification',
              'Fair price benchmarking',
              'Instant payout visibility',
            ]}
          />
          <Stakeholder
            role="Storekeepers"
            features={[
              'Inventory movement tracking',
              'Automated commons contributions',
              'Loss prevention through visibility',
            ]}
          />
          <Stakeholder
            role="CEO / Accountant"
            features={[
              'Approval workflow system',
              'Self-confirmation prevention',
              'Automated reconciliation',
            ]}
          />
          <Stakeholder
            role="Investors"
            features={[
              'Real-time financial dashboard',
              'Downloadable verification data',
              'Commons value tracking',
            ]}
          />
          <Stakeholder
            role="Auditors"
            features={[
              'Instant verification access',
              'Clean audit trails',
              'Cryptographic proofs',
            ]}
          />
        </div>
      </section>

      {/* Why It Works */}
      <section className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold text-amber-400 mb-4">🧠 Why It Works</h2>
        <p className="text-gray-300 text-lg leading-relaxed">
          Everyone sees the same facts — no hidden information means no suspicion.  
          Small, reversible steps reduce fear. Price disputes have standard outcomes.  
          Technology acts as a clear window around a living community — amplifying connection, not control.
        </p>
      </section>

      {/* Footer */}
      <footer className="text-gray-500 text-xs mt-10">
        © {new Date().getFullYear()} Gatishil Nepal — Wu-Wei Cooperative OS · The DAO Party of the Powerless
      </footer>
    </main>
  );
}

/* --- Subcomponents --- */
function Principle({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700 hover:border-amber-400 transition">
      <h3 className="text-2xl font-semibold text-amber-400 mb-2">{title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function Feature({
  title,
  text,
  points,
}: {
  title: string;
  text: string;
  points: string[];
}) {
  return (
    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700 hover:border-amber-400 transition">
      <h3 className="text-2xl font-semibold text-amber-400 mb-2">{title}</h3>
      <p className="text-gray-300 text-sm mb-3">{text}</p>
      <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function Stakeholder({
  role,
  features,
}: {
  role: string;
  features: string[];
}) {
  return (
    <div className="p-6 bg-gray-900/60 rounded-2xl border border-gray-700 hover:border-amber-400 transition">
      <h3 className="text-xl font-semibold text-amber-400 mb-2">{role}</h3>
      <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

function DemoButton({ label }: { label: string }) {
  return (
    <button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-lg shadow-md shadow-amber-500/20 transition">
      {label}
    </button>
  );
}
