"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ACTION_DEFINITIONS,
  formatLedgerTimestamp,
  type SunlightAction,
} from "@/lib/sunlight";

interface ActionFeedProps {
  entries: SunlightAction[];
}

export function ActionFeed({ entries }: ActionFeedProps) {
  return (
    <div className="chautari-feed" role="log" aria-live="polite">
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const meta = ACTION_DEFINITIONS[entry.action_type];
          return (
            <motion.article
              layout
              key={entry.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
              className="chautari-feed-item"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/40 text-2xl">
                {meta.icon}
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-white">
                  {meta.label}
                  <span className="ml-2 text-xs uppercase tracking-[0.32em] text-amber-200/70">
                    {entry.user_id.slice(0, 6)}···{entry.user_id.slice(-4)}
                  </span>
                </p>
                {entry.description ? (
                  <p className="text-xs text-slate-200/80">{entry.description}</p>
                ) : (
                  <p className="text-xs italic text-slate-300/70">Voice-only entry</p>
                )}
                {entry.voice_url && (
                  <a
                    href={entry.voice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-200 transition hover:text-amber-100"
                  >
                    Listen to whisper →
                  </a>
                )}
              </div>
              <time className="text-right text-[11px] uppercase tracking-[0.28em] text-slate-300/70">
                {formatLedgerTimestamp(entry.created_at)}
              </time>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
