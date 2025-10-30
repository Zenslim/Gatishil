'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import TinaInline, { TinaInlineProvider } from '@/components/TinaInline';
import type { HomeContentPatch, HomeContentRecord } from '@/lib/content';
import { useI18n } from '@/lib/i18n';

type HomePageClientProps = {
  initialContent: HomeContentRecord;
  canEdit: boolean;
  onSave: (patch: HomeContentPatch) => Promise<HomeContentRecord | null>;
};

type ToastState = { type: 'success' | 'error'; text: string } | null;

export default function HomePageClient({ initialContent, canEdit, onSave }: HomePageClientProps) {
  const { lang, t, setLang } = useI18n();
  const [content, setContent] = useState<HomeContentRecord>(initialContent);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (!canEdit) {
      setEditMode(false);
    }
  }, [canEdit]);

  const title = useMemo(() => {
    if (lang === 'np') {
      return content.title_np?.trim()?.length ? content.title_np ?? '' : content.title_en ?? '';
    }
    return content.title_en ?? '';
  }, [content.title_en, content.title_np, lang]);

  const body = useMemo(() => {
    if (lang === 'np') {
      return content.body_np?.trim()?.length ? content.body_np ?? '' : content.body_en ?? '';
    }
    return content.body_en ?? '';
  }, [content.body_en, content.body_np, lang]);

  const titleField = lang === 'np' ? 'title_np' : 'title_en';
  const bodyField = lang === 'np' ? 'body_np' : 'body_en';

  const handleSave = (patch: HomeContentPatch) =>
    new Promise<void>((resolve, reject) => {
      startTransition(() => {
        onSave(patch)
          .then((updated) => {
            if (updated) {
              setContent(updated);
            } else {
              setContent((prev) => ({ ...prev, ...patch }));
            }
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      });
    });

  const handleTitleSave = async (value: string) => {
    try {
      await handleSave({ [titleField]: value });
      setToast({ type: 'success', text: t('home.content.saved', 'Content updated successfully.') });
    } catch (err) {
      console.error('Failed to save title', err);
      setToast({ type: 'error', text: t('home.content.saveError', 'Could not save changes. Please try again.') });
      throw err;
    }
  };

  const handleBodySave = async (value: string) => {
    try {
      await handleSave({ [bodyField]: value });
      setToast({ type: 'success', text: t('home.content.saved', 'Content updated successfully.') });
    } catch (err) {
      console.error('Failed to save body', err);
      setToast({ type: 'error', text: t('home.content.saveError', 'Could not save changes. Please try again.') });
      throw err;
    }
  };

  const usingNepaliFallback = lang === 'np' && (!content.title_np?.trim() || !content.body_np?.trim());

  return (
    <TinaInlineProvider canEdit={canEdit} editMode={editMode}>
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-sm font-semibold tracking-wide text-amber-300/90">
              {t('home.content.header', 'Movement Home Page')}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <div className="flex overflow-hidden rounded-full border border-white/15">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3 py-1.5 transition ${lang === 'en' ? 'bg-white text-black' : 'bg-black text-white/70 hover:bg-white/10'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('np')}
                  className={`px-3 py-1.5 transition ${lang === 'np' ? 'bg-white text-black' : 'bg-black text-white/70 hover:bg-white/10'}`}
                >
                  NP
                </button>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setToast(null);
                    setEditMode((prev) => !prev);
                  }}
                  className={`rounded-full border px-3 py-1.5 transition ${
                    editMode
                      ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/25'
                      : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {editMode ? t('home.content.exitEdit', 'Exit Edit Mode') : t('home.content.enterEdit', 'Edit Content')}
                </button>
              )}
            </div>
          </header>

          {toast && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm ${
                toast.type === 'success'
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                  : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
              }`}
            >
              {toast.text}
            </div>
          )}

          {usingNepaliFallback && !editMode && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
              {t(
                'home.content.fallbackNotice',
                'Nepali translation not available yet — displaying English copy until it is provided.',
              )}
            </p>
          )}

          <article className="space-y-6">
            <TinaInline value={title} onSave={handleTitleSave} />
            <TinaInline value={body} onSave={handleBodySave} multiline />
          </article>

          {canEdit && editMode && (
            <p className="text-xs text-white/60">
              {isPending
                ? t('home.content.saving', 'Saving changes…')
                : t('home.content.editingHelp', 'Inline edits update only the active language. Switch languages to localize.')}
            </p>
          )}
        </section>
      </main>
    </TinaInlineProvider>
  );
}
