"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { logSunlightAction, type ActionDefinition, type SunlightAction } from "@/lib/sunlight";

interface ActionModalProps {
  open: boolean;
  action: ActionDefinition | null;
  onClose: () => void;
  onLogged?: (action: SunlightAction) => void;
}

export function ActionModal({ open, action, onClose, onLogged }: ActionModalProps) {
  const [note, setNote] = useState("");
  const [voiceUrl, setVoiceUrl] = useState("");
  const [ward, setWard] = useState("");
  const [tole, setTole] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorMessage(null);
      const timeout = setTimeout(() => noteRef.current?.focus({ preventScroll: true }), 220);
      return () => clearTimeout(timeout);
    }
    setNote("");
    setVoiceUrl("");
    setWard("");
    setTole("");
    return undefined;
  }, [open]);

  if (!action) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note.trim() && !voiceUrl.trim()) {
      setErrorMessage("Offer at least a few words or a voice link.");
      return;
    }

    setStatus("saving");
    setErrorMessage(null);
    try {
      const recorded = await logSunlightAction({
        action_type: action.type,
        description: note,
        voice_url: voiceUrl || undefined,
        ward_id: parseOptionalNumber(ward),
        tole_id: parseOptionalNumber(tole),
      });
      onLogged?.(recorded);
      setStatus("idle");
      onClose();
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "The ledger could not receive this light just yet."
      );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="chautari-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="chautari-modal"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">Sacred action</p>
              <h2>{action.icon} {action.label}</h2>
              <p className="text-sm text-slate-200/80">{action.description}</p>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200/80">{action.mantra}</p>
            </header>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block space-y-2 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Message to the circle</span>
                <textarea
                  ref={noteRef}
                  placeholder="Describe what you did, promised, or witnessed."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Voice link (optional)</span>
                <input
                  type="url"
                  placeholder="https://voice.guthi/nepal-story.mp3"
                  value={voiceUrl}
                  onChange={(event) => setVoiceUrl(event.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Ward</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="11"
                    value={ward}
                    onChange={(event) => setWard(event.target.value)}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-300/70">Tole</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="04"
                    value={tole}
                    onChange={(event) => setTole(event.target.value)}
                  />
                </label>
              </div>
              {errorMessage && (
                <p className="text-xs font-medium text-rose-300">{errorMessage}</p>
              )}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300/70 transition hover:border-amber-200/60 hover:text-amber-200"
                >
                  Close
                </button>
                <button type="submit" disabled={status === "saving"}>
                  {status === "saving" ? "Sending..." : "Log to sunlight ledger"}
                </button>
              </div>
            </form>
            <footer className="chautari-modal-footer">
              <span>Every entry is public, signed, and timestamped.</span>
              <span>Supabase • Realtime</span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
