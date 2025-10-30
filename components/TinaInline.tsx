'use client';

import dynamic from 'next/dynamic';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { TinaCMS, TinaProvider } from 'tinacms';

type InlineContextValue = {
  canEdit: boolean;
  editMode: boolean;
};

const InlineContext = createContext<InlineContextValue | null>(null);

export function TinaInlineProvider({
  canEdit,
  editMode,
  children,
}: {
  canEdit: boolean;
  editMode: boolean;
  children: React.ReactNode;
}) {
  const cmsRef = useRef<TinaCMS | null>(null);
  if (!cmsRef.current) {
    cmsRef.current = new TinaCMS({ enabled: false, toolbar: { hidden: true } });
  }

  useEffect(() => {
    const cms = cmsRef.current;
    if (!cms) return;
    if (canEdit && editMode) {
      cms.enable();
    } else {
      cms.disable();
    }
  }, [canEdit, editMode]);

  const ctx = useMemo(() => ({ canEdit, editMode }), [canEdit, editMode]);

  return (
    <InlineContext.Provider value={ctx}>
      <TinaProvider cms={cmsRef.current!}>{children}</TinaProvider>
    </InlineContext.Provider>
  );
}

function useInlineContext() {
  const ctx = useContext(InlineContext);
  if (!ctx) {
    throw new Error('TinaInline components must be rendered within <TinaInlineProvider>.');
  }
  return ctx;
}

type TinaInlineProps = {
  value: string;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
};

const RichText = dynamic(() => import('./editor/RichText'), { ssr: false });

export default function TinaInline({ value, onSave, multiline = false }: TinaInlineProps) {
  const { canEdit, editMode } = useInlineContext();
  const [draft, setDraft] = useState<string>(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  if (!canEdit || !editMode) {
    if (multiline) {
      return (
        <div
          className="prose prose-invert max-w-none leading-relaxed"
          dangerouslySetInnerHTML={{ __html: value || '' }}
        />
      );
    }
    return <span>{value}</span>;
  }

  const handleSave = () => {
    setError(null);
    startTransition(() => {
      onSave(draft)
        .then(() => {
          setError(null);
        })
        .catch((err: unknown) => {
          console.error('Failed to save inline content', err);
          setError('Failed to save changes.');
        });
    });
  };

  const handleReset = () => {
    setDraft(value ?? '');
    setError(null);
  };

  const isDirty = draft !== (value ?? '');

  return (
    <div className="space-y-3">
      {multiline ? (
        <RichText value={draft} onChange={setDraft} />
      ) : (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-2xl font-semibold text-white focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="rounded-md bg-amber-400 px-3 py-1.5 font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending || !isDirty}
          className="rounded-md border border-white/20 px-3 py-1.5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset
        </button>
        {error && <span className="text-sm text-rose-400">{error}</span>}
      </div>
    </div>
  );
}
