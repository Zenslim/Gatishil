'use client';

import { TinaAdmin } from 'tinacms/dist/admin';

// Ensure Studio is always SSR-disabled and loads fresh
export const dynamic = 'force-dynamic';

export default function AdminCatchAll() {
  return <TinaAdmin />;
}
