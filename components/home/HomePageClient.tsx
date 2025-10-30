'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ClientOnly from '@/components/ClientOnly';
import TinaInline, { TinaInlineProvider } from '@/components/TinaInline';
import type { HomeContentPatch, HomeContentRecord } from '@/lib/content';
import { useI18n, useT } from '@/lib/i18n';

const Starfield = dynamic(() => import('./StarfieldClient'), { ssr: false });

type ToastState = { type: 'success' | 'error'; text: string } | null;
type Translate = (key: string, fallback?: string) => string;

type HomePageClientProps = {
  initialContent: HomeContentRecord;
  canEdit: boolean;
  onSave: (patch: HomeContentPatch) => Promise<HomeContentRecord | null>;
};

export default function HomePageClient({ initialContent, canEdit, onSave }: HomePageClientProps) {
  const t = useT();
  const { lang, setLang } = useI18n();
  const [content, setContent] = useState<HomeContentRecord>(initialContent);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (!canEdit) {
      setEditMode(false);
    }
  }, [canEdit]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const title = useMemo(() => {
    if (lang === 'np' && content.title_np?.trim()) {
      return content.title_np ?? '';
    }
    return content.title_en ?? 'Gatishil Nepal';
  }, [content.title_en, content.title_np, lang]);

  const body = useMemo(() => {
    if (lang === 'np' && content.body_np?.trim()) {
      return content.body_np ?? '';
    }
    return (
      content.body_en ??
      '<p>Welcome to Gatishil Nepal — the DAO · Guthi · Movement.</p>'
    );
  }, [content.body_en, content.body_np, lang]);

  const titleField: keyof HomeContentPatch = lang === 'np' ? 'title_np' : 'title_en';
  const bodyField: keyof HomeContentPatch = lang === 'np' ? 'body_np' : 'body_en';

  const handleSave = (patch: HomeContentPatch) =>
    new Promise<void>((resolve, reject) => {
      startTransition(() => {
        onSave(patch)
          .then((updated) => {
            if (updated) {
              setContent(updated);
            } else {
              setContent((prev) => ({ ...prev, ...patch }));
            }
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
    });

  const handleTitleSave = async (value: string) => {
    try {
      await handleSave({ [titleField]: value });
      setToast({ type: 'success', text: t('home.content.saved', 'Content updated successfully.') });
    } catch (err) {
      console.error('Failed to save title', err);
      setToast({ type: 'error', text: t('home.content.saveError', 'Could not save changes. Please try again.') });
      throw err;
    }
  };

  const handleBodySave = async (value: string) => {
    try {
      await handleSave({ [bodyField]: value });
      setToast({ type: 'success', text: t('home.content.saved', 'Content updated successfully.') });
    } catch (err) {
      console.error('Failed to save body', err);
      setToast({ type: 'error', text: t('home.content.saveError', 'Could not save changes. Please try again.') });
      throw err;
    }
  };

  const usingNepaliFallback = lang === 'np' && (!content.title_np?.trim() || !content.body_np?.trim());

  return (
    <TinaInlineProvider canEdit={canEdit} editMode={editMode}>
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <Starfield />

        <header className="relative z-20 border-b border-white/5 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/80">
                {t('home.content.header', 'Movement Home Page')}
              </p>
              {usingNepaliFallback && !editMode && (
                <p className="mt-2 max-w-xl text-xs text-slate-300/70">
                  {t(
                    'home.content.fallbackNotice',
                    'Nepali translation not available yet — displaying English copy until it is provided.',
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div className="flex overflow-hidden rounded-full border border-white/10 bg-white/5">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3 py-1.5 font-semibold transition ${
                    lang === 'en'
                      ? 'bg-white text-slate-900 shadow-inner'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('np')}
                  className={`px-3 py-1.5 font-semibold transition ${
                    lang === 'np'
                      ? 'bg-white text-slate-900 shadow-inner'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  NP
                </button>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setToast(null);
                    setEditMode((prev) => !prev);
                  }}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    editMode
                      ? 'border-emerald-400/70 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30'
                      : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {editMode
                    ? t('home.content.exitEdit', 'Exit Edit Mode')
                    : t('home.content.enterEdit', 'Edit Content')}
                </button>
              )}
            </div>
          </div>
          {toast && (
            <div
              role="status"
              className={`border-t border-white/5 bg-slate-900/80 px-4 py-3 text-sm sm:px-6 lg:px-8 ${
                toast.type === 'success'
                  ? 'text-emerald-200'
                  : 'text-rose-200'
              }`}
            >
              {toast.text}
            </div>
          )}
        </header>

        <main className="relative z-10">
          <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-20 pt-16 sm:px-6 lg:flex-row lg:gap-16 lg:px-8">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/90 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <span>{t('home.hero.badge', 'GatishilNepal.org')}</span>
                <span className="hidden text-white/70 sm:inline">DAO · Guthi · Movement</span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                <span className="block text-xl uppercase tracking-[0.4em] text-amber-300/80 sm:text-2xl">
                  {t('home.hero.headline.beforeDao', 'The')}
                </span>
                <EditableTitle value={title} onSave={handleTitleSave} />
                <span className="block text-lg font-normal uppercase tracking-[0.32em] text-amber-200/80 sm:text-xl">
                  {t('home.hero.headline.afterDao', 'Party of the Powerless.')}
                </span>
              </h1>

              <p className="text-lg font-medium text-amber-200/90 sm:text-xl">
                {t('home.hero.tagline', 'Service, Not Career. Community, Not Power.')}
              </p>

              <p className="max-w-3xl text-base leading-relaxed text-slate-200/90 sm:text-lg">
                {t(
                  'home.hero.description.line1',
                  'Not another party of faces, but a movement that makes thrones irrelevant.',
                )}
                <br />
                {t(
                  'home.hero.description.line2',
                  'Live free without fear. Create together. Restore the flow. Rise as one.',
                )}
              </p>

              <div className="space-y-6">
                <EditableBody value={body} onSave={handleBodySave} />

                <div className="flex flex-wrap gap-3 text-sm font-semibold">
                  <Link
                    href="/join"
                    className="rounded-full bg-amber-400 px-6 py-3 text-slate-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300"
                  >
                    {t('home.hero.ctaPrimary', 'Join Us to Restore the Flow')}
                  </Link>
                  <Link
                    href="/manifesto"
                    className="rounded-full border border-white/20 px-6 py-3 text-white transition hover:bg-white/10"
                  >
                    {t('home.hero.ctaSecondary', 'Read Our Manifesto')}
                  </Link>
                </div>

                <p className="text-xs uppercase tracking-[0.28em] text-white/50">
                  {t('home.hero.disclaimer', 'By joining you agree to transparent, tamper-proof decisions.')}
                </p>
              </div>
            </div>

            <DailyPulseCard t={t} />
          </section>

          <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <DaoWord t={t} />
          </section>

          <section id="manifesto" className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
            <SectionTitle
              t={t}
              kickerKey="home.manifesto.kicker"
              titleKey="home.manifesto.title"
              subtitleKey="home.manifesto.subtitle"
              closerKey="home.manifesto.closer"
            />

            <ManifestoGrid t={t} />
          </section>

          <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24">
            <div className="absolute inset-0 opacity-40">
              <ClientOnly>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 2 }}
                  className="h-full bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.25),_transparent_60%)]"
                />
              </ClientOnly>
            </div>
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <SectionTitle
                t={t}
                kickerKey="home.foundations.kicker"
                titleKey="home.foundations.title"
                subtitleKey="home.foundations.subtitle"
                closerKey="home.foundations.closer"
              />
              <FoundationsGrid t={t} />
            </div>
          </section>
        </main>

        <FooterSection t={t} />

        {canEdit && editMode && (
          <div className="fixed bottom-6 right-6 z-40 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-white/70 shadow-lg shadow-black/40">
            {isPending
              ? t('home.content.saving', 'Saving changes…')
              : t('home.content.editingHelp', 'Inline edits update only the active language. Switch languages to localize.')}
          </div>
        )}
      </div>
    </TinaInlineProvider>
  );
}

function EditableTitle({ value, onSave }: { value: string; onSave: (value: string) => Promise<void> }) {
  return (
    <span className="mt-3 block bg-gradient-to-r from-amber-200 via-orange-300 to-rose-300 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl">
      <TinaInline value={value} onSave={onSave} />
    </span>
  );
}

function EditableBody({ value, onSave }: { value: string; onSave: (value: string) => Promise<void> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
      <TinaInline value={value} onSave={onSave} multiline />
    </div>
  );
}

function DaoWord({ t }: { t: Translate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-8 shadow-xl shadow-black/40"
    >
      <div className="grid gap-6 lg:grid-cols-[200px_1fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-start justify-center gap-4"
        >
          <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/90">
            {t('home.daoWord.label', 'DAO')}
          </span>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            {t('home.daoWord.definition', 'DAO = Decentralized Autonomous Organization')}
          </h2>
          <Link
            href="/faq#dao"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200/90 transition hover:text-amber-100"
          >
            {t('home.daoWord.cta', 'Click to read more →')}
          </Link>
        </motion.div>
        <ul className="space-y-4 text-sm leading-relaxed text-slate-200/80 sm:text-base">
          <li className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/20">
            {t(
              'home.daoWord.decentralized',
              'Decentralized → Power is shared, no one owns the throne.',
            )}
          </li>
          <li className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/20">
            {t(
              'home.daoWord.autonomous',
              'Autonomous → Rules enforce themselves, no backdoor cheating.',
            )}
          </li>
          <li className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/20">
            {t(
              'home.daoWord.organization',
              'Organization → A living system, where each member’s voice adds to the whole.',
            )}
          </li>
        </ul>
      </div>
    </motion.div>
  );
}

function SectionTitle({
  t,
  kickerKey,
  titleKey,
  subtitleKey,
  closerKey,
}: {
  t: Translate;
  kickerKey: string;
  titleKey: string;
  subtitleKey: string;
  closerKey?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/70">
        {t(kickerKey, '')}
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
        {t(titleKey, '')}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-slate-300/90 sm:text-lg">
        {t(subtitleKey, '')}
      </p>
      {closerKey && (
        <p className="mt-6 text-sm font-medium text-slate-400/80">
          {t(closerKey, '')}
        </p>
      )}
    </div>
  );
}

function ManifestoGrid({ t }: { t: Translate }) {
  const items = useMemo(
    () => [
      {
        title: t('home.manifesto.items.service.title', 'Serve Before Power'),
        body: t(
          'home.manifesto.items.service.body',
          'Every member offers service weekly before asking for leadership. Authority flows from contribution.',
        ),
      },
      {
        title: t('home.manifesto.items.transparency.title', 'Radical Transparency'),
        body: t(
          'home.manifesto.items.transparency.body',
          'Budgets, attendance, and agreements publish to an open ledger that the people can audit.',
        ),
      },
      {
        title: t('home.manifesto.items.voice.title', 'One Voice, One Vote'),
        body: t(
          'home.manifesto.items.voice.body',
          'Verified assemblies decide policy, not backroom deals. Digital signatures keep every vote tamper-proof.',
        ),
      },
      {
        title: t('home.manifesto.items.commons.title', 'Protect the Commons'),
        body: t(
          'home.manifesto.items.commons.body',
          'Forests, water, and culture are guarded collectively. No private throne can sell what belongs to all.',
        ),
      },
      {
        title: t('home.manifesto.items.parallel.title', 'Build Parallel Life'),
        body: t(
          'home.manifesto.items.parallel.body',
          'Cooperative homes, clinics, and schools free the powerless from patronage dependence.',
        ),
      },
      {
        title: t('home.manifesto.items.wealth.title', 'Shared Wealth Tools'),
        body: t(
          'home.manifesto.items.wealth.body',
          'Mutual credit, rotating savings, and solidarity funds keep cash flowing in the neighborhoods that need it most.',
        ),
      },
      {
        title: t('home.manifesto.items.safety.title', 'Safety Without Fear'),
        body: t(
          'home.manifesto.items.safety.body',
          'Community justice circles end impunity, prioritize survivors, and restore harmony with accountability.',
        ),
      },
      {
        title: t('home.manifesto.items.diaspora.title', 'Diaspora in the Circle'),
        body: t(
          'home.manifesto.items.diaspora.body',
          'Global Nepalis fuel cooperative ventures at home instead of remitting into corrupt patronage networks.',
        ),
      },
    ],
    [t],
  );

  return (
    <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: index * 0.05 }}
          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/40 transition hover:border-amber-300/60 hover:bg-slate-900/90"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200/80">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-300/80">{item.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

function FoundationsGrid({ t }: { t: Translate }) {
  const stones = useMemo(
    () => [
      {
        title: t('home.foundations.stones.service.title', 'Stone I · Service First'),
        description: t(
          'home.foundations.stones.service.body',
          'Leaders prove themselves through open service ledgers, not slogans or patronage.',
        ),
      },
      {
        title: t('home.foundations.stones.structure.title', 'Stone II · Structure the Flow'),
        description: t(
          'home.foundations.stones.structure.body',
          'Ward sabhas, digital commons, and citizen juries keep decisions moving and accountable.',
        ),
      },
      {
        title: t('home.foundations.stones.technology.title', 'Stone III · Technology with Trust'),
        description: t(
          'home.foundations.stones.technology.body',
          'Open-source, Nepali-first tools secure identities and votes without selling data to corporations.',
        ),
      },
      {
        title: t('home.foundations.stones.wealth.title', 'Stone IV · Shared Wealth Engine'),
        description: t(
          'home.foundations.stones.wealth.body',
          'Cooperative finance, land trusts, and maker guilds keep prosperity circulating in every ward.',
        ),
      },
    ],
    [t],
  );

  return (
    <div className="mt-16 grid gap-6 sm:grid-cols-2">
      {stones.map((stone, index) => (
        <motion.article
          key={stone.title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, delay: index * 0.08 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-black/40"
        >
          <div className="absolute right-6 top-6 text-5xl font-bold text-amber-300/20">{index + 1}</div>
          <h3 className="text-2xl font-semibold text-white">{stone.title}</h3>
          <p className="mt-4 text-sm leading-relaxed text-slate-300/80 sm:text-base">{stone.description}</p>
        </motion.article>
      ))}
    </div>
  );
}

function DailyPulseCard({ t }: { t: Translate }) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="w-full max-w-xl self-start rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl shadow-black/50 lg:max-w-sm"
    >
      <h2 className="text-lg font-semibold text-white">
        {t('home.hero.dailyPulse.title', '🫀 Daily Pulse')}
      </h2>
      <p className="mt-2 text-sm text-slate-300/80">
        {t('home.hero.dailyPulse.subtitle', 'Gatishil moves every day — small decisions, big rhythm.')}
      </p>

      <div className="mt-6 space-y-5">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/80">
            {t('home.hero.dailyPulse.todaysPoll', 'Today’s Poll')}
          </p>
          <p className="mt-3 text-base font-semibold text-white">
            {t('home.hero.dailyPulse.pollQuestion', 'Should ward meetings livestream?')}
          </p>
          <Link
            href="/polls"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-200/90 transition hover:text-amber-100"
          >
            {t('home.hero.dailyPulse.voteCta', 'Vote now →')}
          </Link>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/80">
            {t('home.hero.dailyPulse.activeProposal', 'Active Proposal')}
          </p>
          <p className="mt-3 text-base font-semibold text-white">
            {t('home.hero.dailyPulse.proposalTitle', 'Publish MLA attendance weekly')}
          </p>
          <Link
            href="/proposals"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-200/90 transition hover:text-amber-100"
          >
            {t('home.hero.dailyPulse.reviewCta', 'Review →')}
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/80">
            {t('home.hero.dailyPulse.quickJoin', 'Quick Join')}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/join"
              className="flex-1 min-w-[120px] rounded-full bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              {t('home.hero.dailyPulse.quickJoinStart', 'Start')}
            </Link>
            <Link
              href="/onboard"
              className="flex-1 min-w-[120px] rounded-full border border-white/20 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t('home.hero.dailyPulse.quickJoinExplore', 'Explore')}
            </Link>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function FooterSection({ t }: { t: Translate }) {
  return (
    <footer className="relative border-t border-white/5 bg-slate-950/80 py-12 text-slate-300/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-200/80">
            {t('home.footer.site', 'GatishilNepal.org')}
          </p>
          <p className="mt-2 text-base text-slate-200/80">
            {t('home.footer.tagline', 'Democracy That Flows — Not Stagnates.')}
          </p>
          <p className="mt-3 text-xs text-slate-500/80">
            © {new Date().getFullYear()} Gatishil Nepal — {t('home.hero.headline.afterDao', 'Party of the Powerless.')}
          </p>
        </div>
        <nav className="grid gap-3 text-sm font-semibold text-white/80 sm:grid-cols-2 sm:gap-4">
          <Link href="/join" className="transition hover:text-white">
            {t('home.footer.links.join', 'Join')}
          </Link>
          <Link href="/polls" className="transition hover:text-white">
            {t('home.footer.links.polls', 'Polls')}
          </Link>
          <Link href="/proposals" className="transition hover:text-white">
            {t('home.footer.links.proposals', 'Proposals')}
          </Link>
          <Link href="/blog" className="transition hover:text-white">
            {t('home.footer.links.blog', 'Blog')}
          </Link>
          <Link href="/faq" className="transition hover:text-white">
            {t('home.footer.links.faq', 'FAQ')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
