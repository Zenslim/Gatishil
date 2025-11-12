'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const TinaAdmin = dynamic(() => import('tinacms').then((mod) => mod.TinaAdmin), {
  ssr: false,
});

type Props = {
  apiUrl: string;
};

type TinaAdminProps = {
  apiURL: string;
};

export default function AdminClient({ apiUrl }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiUrl) {
      setError('Missing Tina GraphQL URL');
    }
  }, [apiUrl]);

  const tinaProps: TinaAdminProps = useMemo(
    () => ({
      apiURL: apiUrl,
    }),
    [apiUrl]
  );

  if (error) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-rose-400/40 bg-rose-400/10 p-6 text-sm text-rose-50">
        <h2 className="text-lg font-semibold">Unable to start Tina Studio</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] rounded-2xl border border-white/10 bg-white/5 p-2">
      <TinaAdmin {...(tinaProps as any)} />
    </div>
  );
}
