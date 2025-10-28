'use client';

import React from 'react';
import dynamic from 'next/dynamic';

/**
 * GNCanvas — SSR-safe Canvas wrapper
 * Dynamically loads @react-three/fiber Canvas only on client.
 */
const R3FCanvas = dynamic(
  () => import('@react-three/fiber').then(m => m.Canvas as any),
  { ssr: false }
);

export default function GNCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 -z-10">
      <R3FCanvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.6], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 3]} intensity={0.6} color="#ffd9a0" />
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </R3FCanvas>
    </div>
  );
}