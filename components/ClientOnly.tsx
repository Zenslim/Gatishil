'use client';
import { PropsWithChildren, useEffect, useState } from 'react';
export default function ClientOnly({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? <>{children}</> : null;
}
