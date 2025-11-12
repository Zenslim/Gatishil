"use client";

import { motion } from "framer-motion";
import type { ActionDefinition } from "@/lib/sunlight";

interface ActionButtonProps {
  action: ActionDefinition;
  active?: boolean;
  onSelect: (action: ActionDefinition) => void;
}

export function ActionButton({ action, active, onSelect }: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(action)}
      className={`group relative overflow-hidden rounded-3xl border px-5 py-6 text-left transition focus:outline-none focus:ring-2 focus:ring-amber-200/60 focus:ring-offset-2 focus:ring-offset-slate-950 ${
        active
          ? "border-amber-200/60 shadow-[0_0_40px_rgba(250,204,107,0.25)]"
          : "border-white/10 shadow-[0_8px_40px_rgba(15,23,42,0.45)]"
      }`}
      style={{
        background: `linear-gradient(135deg, ${action.gradient[0]}20, ${action.gradient[1]}40)` as string,
      }}
    >
      <span className="text-3xl drop-shadow-[0_0_8px_rgba(15,23,42,0.75)]">{action.icon}</span>
      <div className="mt-4 space-y-1">
        <p className="text-sm font-semibold tracking-wide text-white">
          {action.label}
        </p>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-200/80">{action.mantra}</p>
      </div>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-60"
        style={{
          background: `radial-gradient(circle at center, ${action.glow}, transparent 65%)`,
        }}
      />
    </motion.button>
  );
}
