"use client";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ActionType, SunlightAction } from "@/lib/sunlight";

export interface ActionRealtimeCallbacks {
  onInsert?: (action: SunlightAction) => void;
}

export function subscribeToActionStream(callbacks: ActionRealtimeCallbacks = {}): RealtimeChannel {
  const client = getSupabaseBrowserClient();
  const channel = client
    .channel("chautari-actions")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "actions" }, (payload) => {
      if (callbacks.onInsert) {
        callbacks.onInsert(payload.new as SunlightAction);
      }
    })
    .subscribe();

  return channel;
}

export function actionColor(type: ActionType) {
  switch (type) {
    case "seed":
      return "#4ade80";
    case "water":
      return "#38bdf8";
    case "hive":
      return "#f97316";
    case "fire":
      return "#fb923c";
    case "whisper":
      return "#f472b6";
    case "grain":
      return "#facc15";
    case "reflect":
      return "#a855f7";
    case "miracle":
      return "#f59e0b";
    default:
      return "#94a3b8";
  }
}
