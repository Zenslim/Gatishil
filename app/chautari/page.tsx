"use client";

export const dynamic = "force-dynamic";
export const revalidate = false;

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ORDERED_ACTIONS,
  type ActionDefinition,
  type ActionType,
  type SunlightAction,
  fetchRecentActions,
} from "@/lib/sunlight";
import { subscribeToActionStream } from "@/lib/realtime";
import { ActionButton } from "./actions/ActionButton";
import { ActionFeed } from "./actions/ActionFeed";
import { ActionModal } from "./actions/ActionModal";
import { MandalCanvas } from "./actions/MandalCanvas";

const INITIAL_COUNTS: Record<ActionType, number> = {
  seed: 0,
  water: 0,
  hive: 0,
  fire: 0,
  whisper: 0,
  grain: 0,
  reflect: 0,
  miracle: 0,
};

export default function ChautariPage() {
  const [entries, setEntries] = useState<SunlightAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionDefinition>(ORDERED_ACTIONS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const initial = await fetchRecentActions(40);
        if (!active) return;
        setEntries(initial);
      } catch (error) {
        console.error(error);
        if (active) {
          setStatusMessage("Unable to reach the Sunlight Ledger. Latest actions may appear slowly.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void hydrate();
    const channel = subscribeToActionStream({
      onInsert: (action) => {
        setEntries((previous) => {
          const filtered = previous.filter((item) => item.id !== action.id);
          return [action, ...filtered].slice(0, 80);
        });
      },
    });

    return () => {
      active = false;
      void channel.unsubscribe();
    };
  }, []);

  const totals = useMemo(() => {
    const counts = { ...INITIAL_COUNTS };
    entries.forEach((entry) => {
      counts[entry.action_type] = (counts[entry.action_type] ?? 0) + 1;
    });
    return counts;
  }, [entries]);

  const openActionModal = (action: ActionDefinition) => {
    setSelectedAction(action);
    setIsModalOpen(true);
  };

  const handleLogged = (action: SunlightAction) => {
    setEntries((previous) => {
      const filtered = previous.filter((item) => item.id !== action.id);
      return [action, ...filtered].slice(0, 80);
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-16 sm:px-8">
      <section className="chautari-panel relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,107,0.18),transparent_65%)] opacity-70" />
        <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.32em] text-amber-200/80">डिजिटल चौतारी · Digital Chauṭarī</p>
              <h1 className="text-3xl font-semibold leading-snug text-white sm:text-4xl">
                Stand beneath the dawn-lit tree where the nation can see, speak, and act together.
              </h1>
              <p className="text-sm text-slate-200/85">
                Presence over performance. Transparency over authority. Emotion before analytics. Every orb is a living act logged on the Sunlight Ledger.
              </p>
            </div>
            <div className="chautari-badge-row">
              <span className="chautari-badge">Sacred like a temple</span>
              <span className="chautari-badge">Alive like a festival</span>
              <span className="chautari-badge">Transparent like sunlight</span>
            </div>
            {statusMessage && (
              <p className="text-xs text-amber-200/80">{statusMessage}</p>
            )}
          </div>
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">Choose your act</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ORDERED_ACTIONS.map((action) => (
                  <ActionButton
                    key={action.type}
                    action={action}
                    active={action.type === selectedAction.type && isModalOpen}
                    onSelect={openActionModal}
                  />
                ))}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => openActionModal(selectedAction)}
              className="mt-6 inline-flex items-center justify-center gap-3 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-200/80 via-orange-200/80 to-rose-200/80 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_0_35px_rgba(251,191,36,0.35)]"
            >
              Send your light into the circle <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                ✨
              </motion.span>
            </motion.button>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-8">
          <MandalCanvas entries={entries} />
          <div className="chautari-panel">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-amber-200">Sunlight Feed · जिउँदो बहि</h2>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">Every action public, every timestamp signed</p>
              </div>
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-300/60">Supabase Realtime channel</span>
            </header>
            <div className="mt-6 min-h-[180px]">
              {loading ? (
                <p className="text-sm text-slate-300/80">Gathering the latest pulses…</p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-slate-300/80">Be the first to light the ledger today.</p>
              ) : (
                <ActionFeed entries={entries.slice(0, 12)} />
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="chautari-panel">
            <h3 className="text-sm font-semibold text-amber-200">Collective Vital Signs</h3>
            <p className="mt-1 text-xs text-slate-300/75">Counts glow as elements, not charts.</p>
            <div className="mt-5 space-y-4">
              {ORDERED_ACTIONS.map((action) => (
                <div key={action.type} className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-300/70">
                    <span className="flex items-center gap-2 text-white">
                      <span className="text-lg">{action.icon}</span>
                      {action.label}
                    </span>
                    <span>{totals[action.type]}</span>
                  </div>
                  <div className="chautari-stat-bar">
                    <span
                      style={{
                        background: `linear-gradient(90deg, ${action.gradient[0]}, ${action.gradient[1]})`,
                        width: `${Math.min(100, totals[action.type] * 12)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chautari-panel space-y-3 text-sm text-slate-200/85">
            <h3 className="text-sm font-semibold text-amber-200">Sunlight Ledger Contract</h3>
            <p>
              Actions write themselves into public tables secured by Row Level Security. Merkle proofs and ward attestations follow soon.
            </p>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-300/75">
              <li>• Inserts permitted for authenticated members; reads open to all.</li>
              <li>• Supabase realtime mirrors every insert to this Mandal instantly.</li>
              <li>• Voice links remain accessible for community playback layers.</li>
            </ul>
          </div>
        </aside>
      </section>

      <ActionModal
        open={isModalOpen}
        action={selectedAction}
        onClose={() => setIsModalOpen(false)}
        onLogged={handleLogged}
      />
    </div>
  );
}
