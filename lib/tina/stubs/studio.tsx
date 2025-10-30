'use client';

import Link from 'next/link';

type TinaAdminProps = {
  config?: unknown;
};

export function TinaAdmin({ config }: TinaAdminProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-6 py-10 text-slate-200">
      <h1 className="text-2xl font-semibold">Tina Studio (Local Stub)</h1>
      <p>
        This environment uses local content files. Launch the site and use the inline editor to update
        copy. For full Tina Studio features install the official TinaCMS packages.
      </p>
      <p>
        <Link className="text-amber-300 underline" href="/">
          Back to site
        </Link>
      </p>
      <pre className="overflow-x-auto rounded bg-slate-900/80 p-4 text-xs text-slate-300">
        {JSON.stringify(config ?? {}, null, 2)}
      </pre>
    </div>
  );
}

export function getStaticProps() {
  return { props: {} };
}
