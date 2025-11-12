"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface AmbientLayerProps {
  children: React.ReactNode;
}

type DroneSource = { osc: OscillatorNode; gain: GainNode };

export function AmbientLayer({ children }: AmbientLayerProps) {
  const [enabled, setEnabled] = useState(false);
  const [tooltip, setTooltip] = useState("Sound blooms when you join the circle.");
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<DroneSource[]>([]);

  useEffect(() => {
    if (!enabled) {
      nodesRef.current.forEach(({ osc }) => osc.stop());
      nodesRef.current = [];
      contextRef.current?.close().catch(() => undefined);
      contextRef.current = null;
      setTooltip("Sound blooms when you join the circle.");
      return;
    }

    let cancelled = false;
    const setup = async () => {
      if (contextRef.current) {
        await contextRef.current.resume();
        if (!cancelled) {
          setTooltip("Cloud-borne bansuri in C major.");
        }
        return;
      }

      const context = new AudioContext();
      const base = [196, 246.94, 329.63];
      const created: DroneSource[] = base.map((freq, index) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = index === 0 ? "sine" : index === 1 ? "triangle" : "sawtooth";
        osc.frequency.value = freq;
        gain.gain.value = 0.0006 + index * 0.0003;
        osc.connect(gain).connect(context.destination);
        osc.start();
        return { osc, gain };
      });

      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 12;
      lfo.connect(lfoGain);
      created[1].osc.frequency.setValueAtTime(base[1], context.currentTime);
      lfoGain.connect(created[1].osc.frequency);
      lfo.start();

      nodesRef.current = [...created, { osc: lfo, gain: lfoGain }];
      contextRef.current = context;
      if (!cancelled) {
        setTooltip("Cloud-borne bansuri in C major.");
      }
    };

    void setup();

    return () => {
      cancelled = true;
      nodesRef.current.forEach(({ osc }) => osc.stop());
      nodesRef.current = [];
      contextRef.current?.close().catch(() => undefined);
      contextRef.current = null;
    };
  }, [enabled]);

  return (
    <div className="chautari-shell">
      {children}
      <AnimatePresence>
        <motion.button
          key={enabled ? "playing" : "muted"}
          type="button"
          onClick={() => setEnabled((value) => !value)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25 }}
          className="chautari-ambient-toggle"
        >
          <span className="flex items-center gap-3 text-[0.68rem] tracking-[0.32em]">
            {enabled ? "⏸" : "▶"} {enabled ? "Pause Dawn Drone" : "Hear the Dawn"}
          </span>
        </motion.button>
      </AnimatePresence>
      <p className="pointer-events-none fixed right-6 bottom-20 text-[0.6rem] uppercase tracking-[0.3em] text-slate-300/70">
        {tooltip}
      </p>
    </div>
  );
}
