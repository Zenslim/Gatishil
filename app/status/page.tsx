// Server wrapper for Status; controls caching and runtime.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import StatusClient from './StatusClient';

export default function StatusPage() {
  return <StatusClient />;
}
