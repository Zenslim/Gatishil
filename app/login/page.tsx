export const dynamic = 'force-dynamic';
export const revalidate = false;
export const fetchCache = 'force-no-store';

import LoginClient from './LoginClient';

export default function Page({ searchParams }: { searchParams: { next?: string } }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : '/dashboard';
  return <LoginClient nextPath={next} />;
}
