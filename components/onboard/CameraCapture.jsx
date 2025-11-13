// components/onboard/CameraCapture.jsx
"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Phone-first camera with front camera default, Flip, Torch (if supported), Shutter.
 * Emits a blob URL via onCapture(url). Parent handles editing.
 */
export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState("user");    // 'user' | 'environment'
  const [torch, setTorch] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const start = async (mode = facing) => {
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Torch capability check (Chrome Android)
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      setHasTorch(!!caps.torch);
      if (caps.torch) {
        await track.applyConstraints({ advanced: [{ torch }] });
      }
    } catch (e) {
      console.error(e);
      alert("Camera unavailable. Try gallery instead.");
      onCancel?.();
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => { start("user"); return stop; }, []);
  useEffect(() => { start(facing);  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (track?.applyConstraints && hasTorch) {
      track.applyConstraints({ advanced: [{ torch }] }).catch(()=>{});
    }
  }, [torch, hasTorch]);

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const s = Math.min(v.videoWidth, v.videoHeight);
    const sx = (v.videoWidth - s) / 2, sy = (v.videoHeight - s) / 2;
    const c = document.createElement("canvas");
    c.width = s; c.height = s;
    const ctx = c.getContext("2d");
    // Mirror front camera so preview and result match user expectation
    if (facing === "user") {
      ctx.translate(s, 0); ctx.scale(-1, 1);
    }
    ctx.drawImage(v, sx, sy, s, s, 0, 0, s, s);
    c.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      onCapture(url);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div className="relative mx-auto h-full max-w-md">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute left-1/2 top-1/2 h-auto w-full -translate-x-1/2 -translate-y-1/2 ${facing==="user"?"scale-x-[-1]":""}`}
          style={{ aspectRatio: "1/1" }}
        />
        {/* Circle face guide */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/60" />
        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-5">
          <button onClick={onCancel} className="rounded-xl bg-white/10 px-4 py-2">Cancel</button>
          <button
            onClick={capture}
            className="h-16 w-16 rounded-full border-4 border-white/80 bg-white/90 active:scale-95"
            aria-label="Shutter"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setFacing(f => (f === "user" ? "environment" : "user"))} className="rounded-xl bg-white/10 px-3 py-2">Flip</button>
            {hasTorch && (
              <button onClick={() => setTorch(t => !t)} className={`rounded-xl px-3 py-2 ${torch?"bg-yellow-400 text-black":"bg-white/10"}`}>
                Torch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
