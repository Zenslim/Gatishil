export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import dynamic from 'next/dynamic';

const LoginClient = dynamic(() => import('./LoginClient'), {
  ssr: false,
  loading: () => null,
});

export default function Page({ searchParams }: { searchParams: { next?: string } }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/dashboard';
  return <LoginClient nextPath={next} />;
}
