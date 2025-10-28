'use client';

import React, { useState } from 'react';
import GNCanvas from './components/scene/GNCanvas';
import GNStory from './components/scene/GNStory';

function DaoWord({ className = "" }: { className?: string }) {
  return <a href="/faq#dao" className={`underline decoration-dotted underline-offset-2 ${className}`}>DAO</a>;
}

export default function Page() {
  const [open, setOpen] = useState(false);
  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Three.js Narrative Layer */}
      <GNCanvas><GNStory /></GNCanvas>

      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-4 sm:pt-6 relative z-10">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/gatishil-logo.png" alt="Gatishil Nepal" className="h-8 sm:h-9 w-auto"
                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="leading-tight">
              <p className="text-[16px] sm:text-sm font-bold tracking-wide text-white">Gatishil Nepal</p>
              <p className="text-[11px] sm:text-[12px] text-slate-200/85"><DaoWord /> · Guthi · Movement</p>
            </div>
          </a>

          <nav className="hidden md:flex gap-6 items-center text-sm text-slate-300">
            <a className="hover:text-white" href="#story">Story</a>
            <a className="hover:text-white" href="#manifesto">Manifesto</a>
            <a className="hover:text-white" href="/polls">Polls</a>
            <a className="hover:text-white" href="/proposals">Proposals</a>
            <a className="hover:text-white" href="/blog">Blog</a>
            <a className="hover:text-white" href="/faq#dao">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a href="/login" className="px-3 py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5 transition">Login</a>
            <a href="/join" className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold transition shadow-[0_0_30px_rgba(251,191,36,0.35)]">
              Join
            </a>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <a href="/login" className="px-3 py-1.5 border border-white/10 rounded-lg text-[11px] hover:bg-white/5 transition">Login</a>
            <a href="/join" className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-[11px]">Join</a>
            <button type="button" aria-label="Open menu" aria-controls="mobile-menu" aria-expanded={open ? 'true' : 'false'}
                    onClick={() => setOpen(v => !v)} className="inline-flex items-center justify-center rounded-lg p-2 border border-white/10 hover:bg-white/5">
              {!open ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div id="mobile-menu" className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'opacity-100 max-h-64' : 'opacity-0 max-h-0'}`}>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-sm text-slate-300 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <a className="hover:text-white" href="#story">Story</a>
              <a className="hover:text-white" href="#manifesto">Manifesto</a>
              <a className="hover:text-white" href="/polls">Polls</a>
              <a className="hover:text-white" href="/proposals">Proposals</a>
              <a className="hover:text-white" href="/blog">Blog</a>
              <a className="hover:text-white" href="/faq#dao">FAQ</a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Copy */}
      <section id="story" className="relative z-10 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <span className="inline-block text-[10px] uppercase tracking-widest text-amber-300/90 px-2 py-1 border border-amber-300/30 rounded-full bg-black/20">
              GatishilNepal.org
            </span>
            <h1 className="text-[28px] sm:text-4xl md:text-5xl font-extrabold leading-tight mt-3">
              The <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400">DAO</span> Party of the Powerless.
            </h1>
            <p className="mt-4 text-slate-200/90 text-xl sm:text-2xl font-bold max-w-2xl">
              Seed → Mandala → Nepal. Not a poster — a remembrance.
            </p>
            <p className="mt-2 text-slate-200/90 text-sm sm:text-base max-w-2xl">
              We don’t replace faces. We make thrones irrelevant. Live free without fear. Create together. Restore the flow. Rise as one.
            </p>
            <div className="mt-6 flex gap-3 flex-col xs:flex-row">
              <a href="/join" className="px-5 py-3 rounded-2xl bg-amber-400 text-black font-semibold text-center transition hover:translate-y-[-2px] shadow-[0_0_40px_rgba(251,191,36,0.35)]">
                Sit under the Tree
              </a>
              <a href="#manifesto" className="px-5 py-3 rounded-2xl border border-white/15 text-sm hover:bg-white/5 transition text-center">
                Read Our Manifesto
              </a>
            </div>
            <p className="text-[11px] text-slate-300 mt-3">By joining you agree to transparent, tamper-proof decisions.</p>
          </div>

          <aside className="lg:col-span-5 p-5 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-[0_0_35px_rgba(255,255,255,0.05)]">
            <h3 className="text-base sm:text-lg font-semibold">🫀 Daily Pulse</h3>
            <p className="text-xs sm:text-sm text-slate-200/85 mt-1">Gatishil moves every day — small decisions, big rhythm.</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-200/85 text-[11px]">Today’s Poll</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Should ward meetings livestream?</p>
                  <a href="/polls" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Vote now →</a>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-slate-200/85 text-[11px]">Active Proposal</p>
                  <p className="text-amber-200 font-semibold mt-1 text-xs sm:text-sm">Publish MLA attendance weekly</p>
                  <a href="/proposals" className="inline-block mt-2 text-[11px] font-semibold underline underline-offset-4">Review →</a>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[11px] text-slate-200/85">Quick Join</p>
                <div className="mt-2 flex gap-2">
                  <a href="/join" className="flex-1 px-3 py-2 text-sm text-black bg-amber-300 rounded-lg text-center font-semibold">Start</a>
                  <a href="/explore" className="px-3 py-2 border border-white/10 rounded-lg text-sm">Explore</a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Manifesto header (keep your cards below if present) */}
      <section id="manifesto" className="relative z-10 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="text-center max-w-3xl mx-auto mb-8 px-2">
            <p className="uppercase tracking-widest text-[10px] text-amber-300/85">Manifesto</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2">The Power of the Powerless</h2>
            <p className="text-sm sm:text-base text-slate-300/85 mt-3">Eight vows to give Nepal back to its people.</p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-8 sm:py-10 text-sm text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16">
          <div className="flex flex-col items-center gap-2">
            <p className="text-center">© {new Date().getFullYear()} GatishilNepal.org</p>
            <p className="text-center text-slate-400">Democracy That Flows — Not Stagnates.</p>
            <nav className="mt-3 flex flex-wrap items-center justify-center gap-4 text-slate-300">
              <a href="/join" className="hover:text-white">Join</a>
              <a href="/polls" className="hover:text-white">Polls</a>
              <a href="/proposals" className="hover:text-white">Proposals</a>
              <a href="/blog" className="hover:text-white">Blog</a>
              <a href="/faq#dao" className="hover:text-white">FAQ</a>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}