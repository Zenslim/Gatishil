'use client';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

/**
 * ClientOnly
 * - Prevents SSR/CSR hydration mismatches by rendering nothing (or a fallback) until mount.
 * - Optional delayMs lets you defer first render of children if you have heavy client-only widgets.
 *
 * Usage:
 *   <ClientOnly><StarsCanvas /></ClientOnly>
 *   <ClientOnly fallback={<div style={{height:120}} />}><WebAuthnWidget /></ClientOnly>
 */
export default function ClientOnly({
  children,
  fallback = null,
  delayMs = 0,
}: PropsWithChildren<{ fallback?: ReactNode; delayMs?: number }>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (delayMs > 0) {
      const id = setTimeout(() => setReady(true), delayMs);
      return () => clearTimeout(id);
    }
    setReady(true);
  }, [delayMs]);

  return ready ? <>{children}</> : <>{fallback}</>;
}

/**
 * useIsClient
 * - Lightweight hook for places where you just need a boolean.
 * - Example: const isClient = useIsClient(); if (!isClient) return null;
 */
export function useIsClient() {
  const [isClient, set] = useState(false);
  useEffect(() => set(true), []);
  return isClient;
}
