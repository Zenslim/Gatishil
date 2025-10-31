'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TinaMarkdown } from 'tinacms/dist/rich-text';
import { useTina } from 'tinacms/dist/react';

import ClientOnly from '@/components/ClientOnly';
import { useI18n, useT } from '@/lib/i18n';

type RichTextContent = Record<string, any> | null | undefined;

type HeroCard = {
  eyebrow_en?: string | null;
  eyebrow_np?: string | null;
  title_en?: string | null;
  title_np?: string | null;
  cta_label_en?: string | null;
  cta_label_np?: string | null;
  href?: string | null;
  highlight?: boolean | null;
  secondary_cta?: {
    label_en?: string | null;
    label_np?: string | null;
    href?: string | null;
  } | null;
};

type HeroBlock = {
  _template: 'hero';
  badge_en?: string | null;
  badge_np?: string | null;
  headline_prefix_en?: string | null;
  headline_prefix_np?: string | null;
  headline_suffix_en?: string | null;
  headline_suffix_np?: string | null;
  tagline_en?: string | null;
  tagline_np?: string | null;
  description_en?: RichTextContent;
  description_np?: RichTextContent;
  primary_cta?: {
    label_en?: string | null;
    label_np?: string | null;
    href?: string | null;
  } | null;
  secondary_cta?: {
    label_en?: string | null;
    label_np?: string | null;
    href?: string | null;
  } | null;
  disclaimer_en?: string | null;
  disclaimer_np?: string | null;
  daily_pulse?: {
    title_en?: string | null;
    title_np?: string | null;
    subtitle_en?: string | null;
    subtitle_np?: string | null;
    cards?: HeroCard[] | null;
  } | null;
};

type ManifestoItem = {
  title_en?: string | null;
  title_np?: string | null;
  body_en?: RichTextContent;
  body_np?: RichTextContent;
};

type ManifestoBlock = {
  _template: 'manifesto';
  kicker_en?: string | null;
  kicker_np?: string | null;
  title_en?: string | null;
  title_np?: string | null;
  subtitle_en?: RichTextContent;
  subtitle_np?: RichTextContent;
  closer_en?: string | null;
  closer_np?: string | null;
  items?: ManifestoItem[] | null;
};

type Foundation = {
  title_en?: string | null;
  title_np?: string | null;
  description_en?: RichTextContent;
  description_np?: RichTextContent;
};

type FoundationsBlock = {
  _template: 'foundations';
  kicker_en?: string | null;
  kicker_np?: string | null;
  title_en?: string | null;
  title_np?: string | null;
  subtitle_en?: RichTextContent;
  subtitle_np?: RichTextContent;
  closer_en?: string | null;
  closer_np?: string | null;
  stones?: Foundation[] | null;
};

type FooterLink = {
  label_en?: string | null;
  label_np?: string | null;
  href?: string | null;
};

type FooterBlock = {
  _template: 'footer';
  site_en?: string | null;
  site_np?: string | null;
  tagline_en?: string | null;
  tagline_np?: string | null;
  copyright_suffix_en?: string | null;
  copyright_suffix_np?: string | null;
  links?: FooterLink[] | null;
};

type PageBlocks = Array<HeroBlock | ManifestoBlock | FoundationsBlock | FooterBlock>;

type HomePageDocument = {
  title_en?: string | null;
  title_np?: string | null;
  body_en?: RichTextContent;
  body_np?: RichTextContent;
  blocks?: PageBlocks | null;
};

type HomePageClientProps = {
  data: { pages: HomePageDocument };
  query: string;
  variables: { relativePath: string };
};

const Starfield = dynamic(() => import('./StarfieldClient'), { ssr: false });

type Translate = (key: string, fallback?: string) => string;

type LocalizedRichText = RichTextContent | null | undefined;

export default function HomePageClient(props: HomePageClientProps) {
  const t = useT();
  const { lang, setLang } = useI18n();
  const { data } = useTina(props);

  const page = data.pages ?? {};
  const blocks = page.blocks ?? [];

  const hero = findBlock<HeroBlock>(blocks, 'hero');
  const manifesto = findBlock<ManifestoBlock>(blocks, 'manifesto');
  const foundations = findBlock<FoundationsBlock>(blocks, 'foundations');
  const footer = findBlock<FooterBlock>(blocks, 'footer');

  const title = localizeString(page.title_en, page.title_np, lang) || 'Gatishil Nepal';
  const body = selectRichText(page.body_en, page.body_np, lang);

  const usingNepaliFallback =
    lang === 'np' && (!page.title_np || !hasRichTextContent(page.body_np));

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Starfield />

            <main className="relative z-10">
        <section className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-20 pt-16 sm:px-6 lg:flex-row lg:gap-16 lg:px-8">
          <div className="flex-1 space-y-8">
            <HeroBadge hero={hero} lang={lang} />

            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              <span className="block text-xl uppercase tracking-[0.4em] text-amber-300/80 sm:text-2xl">
                {localizeString(hero?.headline_prefix_en, hero?.headline_prefix_np, lang) ||
                  t('home.hero.headline.beforeDao', 'The')}
              </span>
              <span className="mt-3 block bg-gradient-to-r from-amber-200 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                {title}
              </span>
              <span className="mt-2 block text-lg font-normal uppercase tracking-[0.32em] text-amber-200/80 sm:text-xl">
                {localizeString(hero?.headline_suffix_en, hero?.headline_suffix_np, lang) ||
                  t('home.hero.headline.afterDao', 'Party of the Powerless.')}
              </span>
            </h1>

            <p className="text-lg font-medium text-amber-200/90 sm:text-xl">
              {localizeString(hero?.tagline_en, hero?.tagline_np, lang) ||
                t('home.hero.tagline', 'Service, Not Career. Community, Not Power.')}
            </p>

            <div className="max-w-3xl text-base leading-relaxed text-slate-200/90 sm:text-lg">
              <RichText content={selectRichText(hero?.description_en, hero?.description_np, lang)} />
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                <RichText content={body} />
              </div>

              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                {hero?.primary_cta?.href && (
                  <Link
                    href={hero.primary_cta.href}
                    className="rounded-full bg-amber-400 px-6 py-3 text-slate-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300"
                  >
                    {localizeString(hero.primary_cta.label_en, hero.primary_cta.label_np, lang) ||
                      t('home.hero.ctaPrimary', 'Join Us to Restore the Flow')}
                  </Link>
                )}
                {hero?.secondary_cta?.href && (
                  <Link
                    href={hero.secondary_cta.href}
                    className="rounded-full border border-white/20 px-6 py-3 text-white transition hover:bg-white/10"
                  >
                    {localizeString(hero.secondary_cta.label_en, hero.secondary_cta.label_np, lang) ||
                      t('home.hero.ctaSecondary', 'Read Our Manifesto')}
                  </Link>
                )}
              </div>

              <p className="text-xs uppercase tracking-[0.28em] text-white/50">
                {localizeString(hero?.disclaimer_en, hero?.disclaimer_np, lang) ||
                  t('home.hero.disclaimer', 'By joining you agree to transparent, tamper-proof decisions.')}
              </p>
            </div>
          </div>

          <DailyPulseCard hero={hero} lang={lang} t={t} />
        </section>

        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <DaoWord t={t} />
        </section>

        <section id="manifesto" className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
          <SectionTitle
            kicker={localizeString(manifesto?.kicker_en, manifesto?.kicker_np, lang)}
            title={localizeString(manifesto?.title_en, manifesto?.title_np, lang)}
            subtitle={selectRichText(manifesto?.subtitle_en, manifesto?.subtitle_np, lang)}
            closer={localizeString(manifesto?.closer_en, manifesto?.closer_np, lang)}
          />

          <ManifestoGrid items={manifesto?.items ?? []} lang={lang} />
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
              kicker={localizeString(foundations?.kicker_en, foundations?.kicker_np, lang)}
              title={localizeString(foundations?.title_en, foundations?.title_np, lang)}
              subtitle={selectRichText(foundations?.subtitle_en, foundations?.subtitle_np, lang)}
              closer={localizeString(foundations?.closer_en, foundations?.closer_np, lang)}
            />
            <FoundationsGrid foundations={foundations?.stones ?? []} lang={lang} />
          </div>
        </section>
      </main>

      <FooterSection footer={footer} lang={lang} t={t} />
    </div>
  );
}

function HeroBadge({ hero, lang }: { hero?: HeroBlock; lang: string }) {
  const badge = localizeString(hero?.badge_en, hero?.badge_np, lang);
  if (!badge) {
    return (
      <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/90 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
        <span>GatishilNepal.org</span>
        <span className="hidden text-white/70 sm:inline">DAO · Guthi · Movement</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/90 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
      <span>{badge}</span>
      <span className="hidden text-white/70 sm:inline">DAO · Guthi · Movement</span>
    </div>
  );
}

function ManifestoGrid({ items, lang }: { items: ManifestoItem[]; lang: string }) {
  const content = useMemo(() => items ?? [], [items]);

  if (!content.length) return null;

  return (
    <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {content.map((item, index) => (
        <motion.article
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: index * 0.05 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/40"
        >
          <div className="text-2xl font-semibold text-white">
            {localizeString(item.title_en, item.title_np, lang)}
          </div>
          <div className="mt-4 text-sm leading-relaxed text-slate-300/80 sm:text-base">
            <RichText content={selectRichText(item.body_en, item.body_np, lang)} />
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function FoundationsGrid({ foundations, lang }: { foundations: Foundation[]; lang: string }) {
  if (!foundations?.length) return null;

  return (
    <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {foundations.map((stone, index) => (
        <motion.article
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: index * 0.05 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/40"
        >
          <div className="absolute right-6 top-6 text-5xl font-bold text-amber-300/20">{index + 1}</div>
          <h3 className="text-2xl font-semibold text-white">
            {localizeString(stone.title_en, stone.title_np, lang)}
          </h3>
          <div className="mt-4 text-sm leading-relaxed text-slate-300/80 sm:text-base">
            <RichText content={selectRichText(stone.description_en, stone.description_np, lang)} />
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function DailyPulseCard({ hero, lang, t }: { hero?: HeroBlock; lang: string; t: Translate }) {
  const pulse = hero?.daily_pulse;
  const cards = pulse?.cards ?? [];

  if (!pulse && cards.length === 0) {
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
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="w-full max-w-xl self-start rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 p-6 shadow-2xl shadow-black/50 lg:max-w-sm"
    >
      <h2 className="text-lg font-semibold text-white">
        {localizeString(pulse?.title_en, pulse?.title_np, lang) ||
          t('home.hero.dailyPulse.title', '🫀 Daily Pulse')}
      </h2>
      <p className="mt-2 text-sm text-slate-300/80">
        {localizeString(pulse?.subtitle_en, pulse?.subtitle_np, lang) ||
          t('home.hero.dailyPulse.subtitle', 'Gatishil moves every day — small decisions, big rhythm.')}
      </p>

      <div className="mt-6 space-y-5">
        {cards.map((card, index) => (
          <DailyPulseItem key={index} card={card} lang={lang} />
        ))}
      </div>
    </motion.aside>
  );
}

function DailyPulseItem({ card, lang }: { card: HeroCard; lang: string }) {
  const highlight = card.highlight;
  const primaryLabel = localizeString(card.cta_label_en, card.cta_label_np, lang);
  const secondaryLabel = localizeString(
    card.secondary_cta?.label_en,
    card.secondary_cta?.label_np,
    lang,
  );

  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? 'border-amber-300/40 bg-amber-300/10'
          : 'border-white/5 bg-white/5'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/80">
        {localizeString(card.eyebrow_en, card.eyebrow_np, lang)}
      </p>
      <p className="mt-3 text-base font-semibold text-white">
        {localizeString(card.title_en, card.title_np, lang)}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
        {card.href && primaryLabel && (
          <Link
            href={card.href}
            className={
              highlight
                ? 'flex-1 min-w-[120px] rounded-full bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-slate-950 transition hover:bg-amber-300'
                : 'inline-flex items-center gap-2 text-amber-200/90 transition hover:text-amber-100'
            }
          >
            {primaryLabel}
          </Link>
        )}
        {card.secondary_cta?.href && secondaryLabel && (
          <Link
            href={card.secondary_cta.href}
            className={
              highlight
                ? 'flex-1 min-w-[120px] rounded-full border border-white/20 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-white/10'
                : 'inline-flex items-center gap-2 text-amber-200/90 transition hover:text-amber-100'
            }
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  subtitle,
  closer,
}: {
  kicker?: string | null;
  title?: string | null;
  subtitle?: LocalizedRichText;
  closer?: string | null;
}) {
  if (!kicker && !title && !hasRichTextContent(subtitle)) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl text-center">
      {kicker && (
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/70">
          {kicker}
        </p>
      )}
      {title && (
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
      )}
      {hasRichTextContent(subtitle) && (
        <div className="mt-4 text-base leading-relaxed text-slate-300/90 sm:text-lg">
          <RichText content={subtitle} />
        </div>
      )}
      {closer && (
        <p className="mt-6 text-sm font-medium text-slate-400/80">{closer}</p>
      )}
    </div>
  );
}

function FooterSection({ footer, lang, t }: { footer?: FooterBlock; lang: string; t: Translate }) {
  const year = new Date().getFullYear();
  const site = localizeString(footer?.site_en, footer?.site_np, lang) || 'GatishilNepal.org';
  const tagline =
    localizeString(footer?.tagline_en, footer?.tagline_np, lang) ||
    t('home.footer.tagline', 'Democracy That Flows — Not Stagnates.');
  const suffix =
    localizeString(footer?.copyright_suffix_en, footer?.copyright_suffix_np, lang) ||
    t('home.hero.headline.afterDao', 'Party of the Powerless.');
  const fallbackLinks: FooterLink[] = [
    { label_en: t('home.footer.links.join', 'Join'), href: '/join' },
    { label_en: t('home.footer.links.polls', 'Polls'), href: '/polls' },
    { label_en: t('home.footer.links.proposals', 'Proposals'), href: '/proposals' },
    { label_en: t('home.footer.links.blog', 'Blog'), href: '/blog' },
    { label_en: t('home.footer.links.faq', 'FAQ'), href: '/faq' },
  ];
  const links = footer?.links && footer.links.length > 0 ? footer.links : fallbackLinks;

  return (
    <footer className="relative border-t border-white/5 bg-slate-950/80 py-12 text-slate-300/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-amber-200/80">{site}</p>
          <p className="mt-2 text-base text-slate-200/80">{tagline}</p>
          <p className="mt-3 text-xs text-slate-500/80">
            © {year} Gatishil Nepal — {suffix}
          </p>
        </div>
        <nav className="grid gap-3 text-sm font-semibold text-white/80 sm:grid-cols-2 sm:gap-4">
          {links.map((link, index) => (
            <Link key={index} href={link.href ?? '#'} className="transition hover:text-white">
              {localizeString(link.label_en, link.label_np, lang) ?? link.label_en ?? ''}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
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
            {t('home.daoWord.decentralized', 'Decentralized → Power is shared, no one owns the throne.')}
          </li>
          <li className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/20">
            {t('home.daoWord.autonomous', 'Autonomous → Rules enforce themselves, no backdoor cheating.')}
          </li>
          <li className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/20">
            {t('home.daoWord.organization', "Organization → A living system, where each member’s voice adds to the whole.")}
          </li>
        </ul>
      </div>
    </motion.div>
  );
}

function localizeString(
  en?: string | null,
  np?: string | null,
  lang?: string,
): string | null | undefined {
  if (lang === 'np' && np && np.trim().length > 0) {
    return np;
  }
  return en ?? np ?? null;
}

function selectRichText(
  en?: RichTextContent,
  np?: RichTextContent,
  lang?: string,
): RichTextContent {
  if (lang === 'np' && hasRichTextContent(np)) {
    return np;
  }
  return hasRichTextContent(en) ? en : np;
}

function hasRichTextContent(content?: RichTextContent): boolean {
  if (!content) return false;
  if (Array.isArray(content)) {
    return content.some((child) => hasRichTextContent(child));
  }
  if (Array.isArray(content.children)) {
    return content.children.some((child: any) => hasRichTextContent(child));
  }
  if (typeof content === 'object') {
    if ('text' in content && typeof content.text === 'string') {
      return content.text.trim().length > 0;
    }
    if ('children' in content) {
      return hasRichTextContent(content.children);
    }
  }
  return false;
}

function RichText({ content }: { content?: RichTextContent }) {
  if (!hasRichTextContent(content)) {
    return null;
  }
  return <TinaMarkdown content={content} />;
}

function findBlock<T extends { _template?: string }>(
  blocks: PageBlocks,
  template: string,
) {
  return blocks.find((block) => block?._template === template) as T | undefined;
}
