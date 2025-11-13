// app/tax/calculator/page.tsx
import NextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const Chrome = NextDynamic(() => import('./Chrome'), { ssr: true });

export const metadata = {
  title: 'Nepal True Tax Mirror — Gatishil Nepal',
  description: 'A smooth, borderless, single-scroll calculator styled like the landing.',
};

export default function Page() {
  return <Chrome />;
}
