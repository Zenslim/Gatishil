"use client";

import { supabase } from "@/lib/supabase/unifiedClient";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

export type ActionType =
  | "seed"
  | "water"
  | "hive"
  | "fire"
  | "whisper"
  | "grain"
  | "reflect"
  | "miracle";

export interface ActionDefinition {
  type: ActionType;
  icon: string;
  label: string;
  mantra: string;
  gradient: [string, string];
  glow: string;
  description: string;
}

export interface SunlightAction {
  id: string;
  user_id: string;
  action_type: ActionType;
  description: string | null;
  voice_url: string | null;
  ward_id: number | null;
  tole_id: number | null;
  created_at: string;
}

export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  seed: {
    type: "seed",
    icon: "🌱",
    label: "Plant a Seed",
    mantra: "Offer the first light of an idea.",
    gradient: ["#4ade80", "#bbf7d0"],
    glow: "rgba(74, 222, 128, 0.4)",
    description: "Start a community idea, project, or pledge.",
  },
  water: {
    type: "water",
    icon: "💧",
    label: "Pour Water",
    mantra: "Nourish another's work with care.",
    gradient: ["#38bdf8", "#bae6fd"],
    glow: "rgba(56, 189, 248, 0.4)",
    description: "Offer time, skill, or attention to someone else's seed.",
  },
  hive: {
    type: "hive",
    icon: "🪵",
    label: "Build the Hive",
    mantra: "Weave cooperative muscle.",
    gradient: ["#fde047", "#f97316"],
    glow: "rgba(249, 115, 22, 0.38)",
    description: "Join or create a cooperative team and note the first task.",
  },
  fire: {
    type: "fire",
    icon: "🔥",
    label: "Offer Fire",
    mantra: "Bring heat, clarity, and accountability.",
    gradient: ["#fb923c", "#facc15"],
    glow: "rgba(251, 146, 60, 0.42)",
    description: "Vote, verify, or raise a transparency alert.",
  },
  whisper: {
    type: "whisper",
    icon: "🎶",
    label: "Send a Whisper",
    mantra: "Let a story travel on wind.",
    gradient: ["#f9a8d4", "#f3e8ff"],
    glow: "rgba(249, 168, 212, 0.36)",
    description: "Record or link a 30 second voice story.",
  },
  grain: {
    type: "grain",
    icon: "🌾",
    label: "Fill the Granary",
    mantra: "Share tools, rupees, or harvest.",
    gradient: ["#fcd34d", "#fbbf24"],
    glow: "rgba(252, 211, 77, 0.4)",
    description: "Contribute resources into the shared basket.",
  },
  reflect: {
    type: "reflect",
    icon: "🕊",
    label: "Reflect at Dusk",
    mantra: "Pause, breathe, and name what shifted.",
    gradient: ["#a855f7", "#ddd6fe"],
    glow: "rgba(168, 85, 247, 0.35)",
    description: "Write or speak a daily reflection for the circle.",
  },
  miracle: {
    type: "miracle",
    icon: "🌞",
    label: "Miracle Moment",
    mantra: "Synchronize the nation's pulse.",
    gradient: ["#f97316", "#fde68a"],
    glow: "rgba(253, 230, 138, 0.4)",
    description: "Join the weekly unity pulse and log what sparked.",
  },
};

export const ORDERED_ACTIONS: ActionDefinition[] = [
  ACTION_DEFINITIONS.seed,
  ACTION_DEFINITIONS.water,
  ACTION_DEFINITIONS.hive,
  ACTION_DEFINITIONS.fire,
  ACTION_DEFINITIONS.whisper,
  ACTION_DEFINITIONS.grain,
  ACTION_DEFINITIONS.reflect,
  ACTION_DEFINITIONS.miracle,
];

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatLedgerTimestamp(iso: string) {
  return timeFormatter.format(new Date(iso));
}

export type InsertActionInput = {
  action_type: ActionType;
  description?: string;
  voice_url?: string;
  ward_id?: number | null;
  tole_id?: number | null;
};

export async function logSunlightAction(input: InsertActionInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be signed in to send an action to the ledger.");
  }

  const payload = {
    user_id: user.id,
    action_type: input.action_type,
    description: input.description?.trim() || null,
    voice_url: input.voice_url?.trim() || null,
    ward_id: input.ward_id ?? null,
    tole_id: input.tole_id ?? null,
  } satisfies Omit<SunlightAction, "id" | "created_at">;

  const { data, error } = await supabase
    .from("actions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as SunlightAction;
}

export async function fetchRecentActions(limit = 32) {
  const { data, error } = await supabase
    .from("actions")
    .select("id, user_id, action_type, description, voice_url, ward_id, tole_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as SunlightAction[];
}

export type ActionInsertPayload = RealtimePostgresInsertPayload<SunlightAction>;
