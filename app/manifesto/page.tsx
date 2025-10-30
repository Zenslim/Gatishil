import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import ManifestoEN from '@/content/manifesto.en.mdx';
import ManifestoNP from '@/content/manifesto.np.mdx';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Manifesto — Gatishil Nepal',
  description:
    'The living manifesto of Gatishil Nepal. Eight vows to return Nepal to its people.',
};

export default function ManifestoPage() {
  const langCookie = cookies().get('lang')?.value;
  const lang = langCookie === 'np' ? 'np' : 'en';
  const Content = lang === 'np' ? ManifestoNP : ManifestoEN;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/70">Manifesto</p>
          <h1 className="mt-3 text-3xl font-semibold text-amber-100 sm:text-4xl">
            {lang === 'np' ? 'घोषणा पत्र — शक्तिहीनको शक्ति' : 'Manifesto — The Power of the Powerless'}
          </h1>
        </header>
        <article className="prose prose-invert prose-headings:text-amber-200 prose-strong:text-amber-100 prose-a:text-amber-300">
          <Content />
        </article>
      </div>
    </main>
  );
}
