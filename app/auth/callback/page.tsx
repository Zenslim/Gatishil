// Server wrapper for /auth/callback
import { Suspense } from 'react';
import Client from './Client';
import Card from '@/components/Card';

export const dynamic = 'force-dynamic';
export const revalidate = false;

export default function Page() {
  return (
    <Suspense fallback={<Card title="🔑 Sign-in"><div style={{opacity:.8}}>Loading…</div></Card>}>
      <Client />
    </Suspense>
  );
}
