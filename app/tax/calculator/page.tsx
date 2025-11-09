// app/tax/calculator/page.tsx
import dynamic from 'next/dynamic';

// Force runtime rendering so Vercel doesn’t cache an old UI
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const Chrome = dynamic(() => import('./Chrome'), { ssr: true });

export const metadata = {
  title: 'Nepal True Tax Mirror — Gatishil Nepal',
  description: 'A smooth, borderless, single-scroll calculator page styled like the landing.',
};

export default function Page() {
  return <Chrome />;
}
