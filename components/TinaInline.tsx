'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { TinaCMS, TinaProvider, useForm, usePlugin } from 'tinacms';
import { InlineForm, InlineText, InlineTextarea } from 'react-tinacms-inline';

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

export default function TinaInline({ value, onSave, multiline = false }: TinaInlineProps) {
  const { canEdit, editMode } = useInlineContext();
  const reactId = useId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [, form] = useForm({
    id: `tina-inline-${reactId}`,
    initialValues: { value },
    onSubmit: async (vals: { value: string }) => {
      await onSave(vals.value ?? '');
    },
  });
  usePlugin(form);

  useEffect(() => {
    form.updateInitialValues({ value });
  }, [value, form]);

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
      form
        .submit()
        .then(() => {
          setError(null);
        })
        .catch((err) => {
          console.error('Failed to save inline content', err);
          setError('Failed to save changes.');
        });
    });
  };

  const handleReset = () => {
    form.reset();
    setError(null);
  };

  return (
    <InlineForm form={form} className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
        {multiline ? (
          <InlineTextarea
            name="value"
            className="min-h-[240px] w-full rounded-lg border border-white/20 bg-black/60 p-3 text-base text-white focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            displayOnlyClassName="prose prose-invert max-w-none"
          />
        ) : (
          <InlineText
            name="value"
            className="w-full rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-2xl font-semibold text-white focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            displayOnlyClassName="text-3xl font-semibold"
          />
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-amber-400 px-3 py-1.5 font-semibold text-black transition hover:bg-amber-300 disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-md border border-white/20 px-3 py-1.5 text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            Reset
          </button>
          {error && <span className="text-sm text-rose-400">{error}</span>}
        </div>
      </div>
    </InlineForm>
  );
}
