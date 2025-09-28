'use client';
import { useState } from "react";
function SectionTitle({kicker, title, subtitle}:{kicker:string;title:string;subtitle?:string}){
  return (<div className="text-center max-w-3xl mx-auto mb-8">
    <p className="uppercase tracking-widest text-xs text-sky-300/80">{kicker}</p>
    <h2 className="text-2xl md:text-4xl font-bold mt-2">{title}</h2>
    {subtitle && <p className="text-sm md:text-base text-slate-300/80 mt-3">{subtitle}</p>}
  </div>)
}
export default function HomePage() {
  const [email, setEmail] = useState("");
  return (<main className="relative overflow-hidden">
    <div className="bg-stars absolute inset-0 pointer-events-none" />
    <section className="relative pt-20 pb-14 px-6 md:px-10 lg:px-16">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-sky-300/90 text-xs tracking-widest uppercase">GatishilNepal.org</p>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mt-3">
            The <span className="text-sky-300">DAO Party</span> of the Powerless
          </h1>
          <p className="mt-5 text-slate-300/90 text-lg">
            Not another party of faces — a movement that makes thrones irrelevant.
            A democracy that moves, alive every day.
          </p>
          <div className="mt-8 flex gap-3 flex-col sm:flex-row">
            <a href="/join" className="card px-5 py-3 text-center font-semibold hover:-translate-y-0.5 transition">✊ Join the Movement</a>
            <a href="#principles" className="px-5 py-3 text-center font-semibold border border-white/15 rounded-2xl hover:bg-white/5 transition">Read the Principles</a>
          </div>
          <p className="text-xs text-slate-400 mt-3">By joining you agree to transparent, tamper-proof decisions.</p>
        </div>
        <div className="card p-5">
          <h3 className="text-lg font-semibold">🫀 Daily Pulse</h3>
          <p className="text-sm text-slate-300/80 mt-2">Gatishil means moving. We make micro-decisions together every day.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="card p-4">
              <p className="text-slate-300/80">Today&apos;s Poll</p>
              <p className="text-sky-200 font-semibold mt-1">Should local ward meetings be livestreamed?</p>
              <a href="/polls" className="inline-block mt-3 text-xs font-semibold underline underline-offset-4">Vote now →</a>
            </div>
            <div className="card p-4">
              <p className="text-slate-300/80">Active Proposal</p>
              <p className="text-sky-200 font-semibold mt-1">Publish MLA attendance dashboard weekly</p>
              <a href="/proposals" className="inline-block mt-3 text-xs font-semibold underline underline-offset-4">Review & vote →</a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="principles" className="relative py-14 px-6 md:px-10 lg:px-16">
      <SectionTitle kicker="Principles" title="DAO as Nepali Wisdom" subtitle="Decentralized. Autonomous. Organization. Inspired by Guthi, Bhakari, Mandal, Madal — collective rhythm." />
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
        {[
          {title: "Decentralized", body: "Power is shared. No throne to capture."},
          {title: "Autonomous", body: "Rules enforce themselves. No backdoor cheating."},
          {title: "Organization", body: "Every member’s voice adds to the whole."},
        ].map((c) => (<div key={c.title} className="card p-5">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-slate-300/80 text-sm mt-2">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
    <section className="relative py-14 px-6 md:px-10 lg:px-16">
      <SectionTitle kicker="Goals" title="Now → Next → Later" />
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
        {[
          {k:"Now", t:"Launch Movement Hub", d:"GatishilNepal.org as the digital face; clear story & call-to-action."},
          {k:"Next", t:"Interactive Decisions", d:"Polls, proposals, and an accountability feed for daily rhythm."},
          {k:"Later", t:"DAO Party", d:"Formalize as the DAO Party of the Powerless when the movement is ready."},
        ].map((g)=>(<div key={g.k} className="card p-5">
            <p className="uppercase tracking-widest text-xs text-sky-300/80">{g.k}</p>
            <h3 className="font-semibold mt-2">{g.t}</h3>
            <p className="text-slate-300/80 text-sm mt-2">{g.d}</p>
          </div>
        ))}
      </div>
    </section>
    <section className="relative py-14 px-6 md:px-10 lg:px-16">
      <SectionTitle kicker="Stay in the Loop" title="Get movement updates" subtitle="We’ll only send essential decisions and outcomes." />
      <form onSubmit={(e)=>{e.preventDefault(); alert('Subscribed (placeholder) — hook your provider later.')}} className="max-w-md mx-auto card p-3 flex gap-2">
        <input type="email" required placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} className="flex-1 bg-transparent outline-none placeholder:text-slate-400 text-sm px-3" />
        <button className="px-4 py-2 rounded-xl bg-white/90 text-ink font-semibold hover:bg-white">Subscribe</button>
      </form>
    </section>
    <footer className="py-10 px-6 md:px-10 lg:px-16 text-sm text-slate-400">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} GatishilNepal.org · A democracy that moves.</p>
        <nav className="flex gap-5">
          <a href="/join" className="hover:text-white">Join</a>
          <a href="/polls" className="hover:text-white">Polls</a>
          <a href="/proposals" className="hover:text-white">Proposals</a>
          <a href="/docs/PRD" className="hover:text-white">PRD</a>
        </nav>
      </div>
    </footer>
  </main>);
}
