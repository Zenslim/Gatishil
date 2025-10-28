'use client';
import { useEffect, useRef, useState } from 'react';
let Howl: any;
let Howler: any;

export function useAudioFlow() {
  const [enabled, setEnabled] = useState(false);
  const [bootable, setBootable] = useState(false);
  const humRef = useRef<any>(null);
  const windRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const mod = await import('howler');
        Howl = mod.Howl;
        Howler = mod.Howler;
        setBootable(true);
      } catch (e) {
        console.warn('Howler failed to load:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!Howl) return;
    if (enabled) {
      if (!humRef.current) {
        humRef.current = new Howl({ src: ['/audio/flow-hum.ogg'], loop: true, volume: 0 });
      }
      if (!windRef.current) {
        windRef.current = new Howl({ src: ['/audio/wind-breath.ogg'], loop: true, volume: 0 });
      }
      if (!humRef.current.playing()) humRef.current.play();
      if (!windRef.current.playing()) windRef.current.play();
      humRef.current.fade(0, 0.25, 4000);
      windRef.current.fade(0, 0.15, 5000);
    } else {
      [humRef.current, windRef.current].forEach((s) => {
        try {
          if (s && s.playing()) {
            const vol = s.volume();
            s.fade(vol, 0, 800);
            setTimeout(() => s.stop(), 900);
          }
        } catch {}
      });
    }
  }, [enabled]);

  const toggle = () => {
    if (!Howl) return;
    setEnabled((v) => !v);
  };

  return { enabled, toggle, bootable };
}
