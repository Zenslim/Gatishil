"use client";

import { useEffect, useMemo, useRef } from "react";
import { actionColor } from "@/lib/realtime";
import type { SunlightAction } from "@/lib/sunlight";

interface MandalCanvasProps {
  entries: SunlightAction[];
}

type OrbState = {
  angle: number;
  radius: number;
  drift: number;
};

const hexToRgba = (hex: string, alpha: number) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function MandalCanvas({ entries }: MandalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbitMapRef = useRef<Map<string, OrbState>>(new Map());
  const orderedEntries = useMemo(() => [...entries].slice(0, 64), [entries]);

  useEffect(() => {
    const map = orbitMapRef.current;
    const ids = new Set(orderedEntries.map((entry) => entry.id));
    // prune old entries
    for (const key of map.keys()) {
      if (!ids.has(key)) {
        map.delete(key);
      }
    }
    orderedEntries.forEach((entry, index) => {
      if (!map.has(entry.id)) {
        map.set(entry.id, {
          angle: Math.random() * Math.PI * 2,
          radius: 80 + Math.sqrt(index) * 26,
          drift: 0.25 + Math.random() * 0.65,
        });
      }
    });
  }, [orderedEntries]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      if ("resetTransform" in context) {
        context.resetTransform();
      } else {
        context.setTransform(1, 0, 0, 1, 0, 0);
      }
      context.scale(dpr, dpr);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const render = (time: number) => {
      const { clientWidth: width, clientHeight: height } = canvas;
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalAlpha = 0.7;
      const gradient = context.createRadialGradient(
        width / 2,
        height / 2,
        30,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.4,
      );
      gradient.addColorStop(0, "rgba(148, 163, 184, 0.08)");
      gradient.addColorStop(1, "rgba(15, 23, 42, 0.65)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.restore();

      orderedEntries.forEach((entry, index) => {
        const orb = orbitMapRef.current.get(entry.id);
        if (!orb) return;
        const baseAngle = orb.angle + (time / 1000) * 0.12 * orb.drift;
        const wobble = Math.sin(time / 1200 + index) * 8;
        const radius = orb.radius + wobble;
        const centerX = width / 2 + Math.cos(baseAngle) * radius;
        const centerY = height / 2 + Math.sin(baseAngle) * radius * 0.6;
        const color = actionColor(entry.action_type);

        const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 68);
        glow.addColorStop(0, hexToRgba(color, 0.55));
        glow.addColorStop(1, hexToRgba(color, 0));
        context.beginPath();
        context.fillStyle = glow;
        context.arc(centerX, centerY, 46, 0, Math.PI * 2);
        context.fill();

        const orbGradient = context.createRadialGradient(centerX, centerY, 6, centerX, centerY, 30);
        orbGradient.addColorStop(0, hexToRgba("#ffffff", 0.85));
        orbGradient.addColorStop(1, hexToRgba(color, 0.9));
        context.beginPath();
        context.fillStyle = orbGradient;
        context.arc(centerX, centerY, 22 + Math.sin(time / 800 + index) * 2, 0, Math.PI * 2);
        context.fill();
      });

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [orderedEntries]);

  return (
    <div className="chautari-mandal" aria-hidden>
      <canvas ref={canvasRef} />
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center text-xs uppercase tracking-[0.4em] text-slate-200/60">
        <span>Realtime Mandal — every orb is a living civic act</span>
      </div>
    </div>
  );
}
