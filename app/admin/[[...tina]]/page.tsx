'use client';

import NextDynamic from 'next/dynamic';

// Ensure Studio is client-only and always fresh
export const dynamic = 'force-dynamic';

// Load TinaAdmin from the top-level 'tinacms' entry to avoid fragile subpaths
const TinaAdmin = NextDynamic(
  () =>
    import('tinacms').then((m: any) => {
      if (m?.TinaAdmin) return m.TinaAdmin;
      // Graceful fallback if this tinacms version doesn’t ship Admin
      return function MissingTinaAdmin() {
        return (
          <div style={{ padding: 24, fontFamily: 'system-ui' }}>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>Tina Admin not found</h1>
            <p>
              The current <code>tinacms</code> package doesn’t expose <code>TinaAdmin</code>.
              Update <code>tinacms</code> to a version that includes Admin (v2+), then redeploy.
            </p>
          </div>
        );
      };
    }),
  { ssr: false }
);

export default function AdminCatchAll() {
  return <TinaAdmin />;
}
