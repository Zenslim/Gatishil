'use client';

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold">FAQ</h1>

        <section id="dao" className="mt-8">
          <h2 className="text-xl font-semibold">What is a DAO?</h2>
          <p className="mt-3 text-slate-300/90">
            DAO sounds new, but it is not foreign. It is our old ways, reborn in code.
          </p>
          <ul className="mt-3 space-y-2 text-slate-300/90">
            <li>• In a <span className="font-semibold">Guthi</span>, land, rituals, and festivals were managed together.</li>
            <li>• In the <span className="font-semibold">bhakari</span>, everyone poured grain so no one slept hungry.</li>
            <li>• In the <span className="font-semibold">madal</span>, rhythm came only when both sides struck in harmony.</li>
            <li>• In the <span className="font-semibold">smith’s bellows</span>, every hand fed the same fire.</li>
          </ul>
          <p className="mt-4 text-slate-300/90">
            A DAO (<span className="font-semibold">Decentralized Autonomous Organization</span>) is the same spirit:
          </p>
          <ul className="mt-3 space-y-1 text-slate-300/90">
            <li><span className="font-semibold">Decentralized</span> → Power is shared, no one owns the throne.</li>
            <li><span className="font-semibold">Autonomous</span> → Rules enforce themselves, no backdoor cheating.</li>
            <li><span className="font-semibold">Organization</span> → A living system, where each member’s voice adds to the whole.</li>
          </ul>
          <p className="mt-4 text-amber-300">
            DAO = Nepali wisdom, with digital trust.
          </p>
        </section>
      </div>
    </main>
  );
}
