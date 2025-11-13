// components/onboard/ImageEditor.jsx
"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Touch/mouse editor: pan/zoom/rotate; circular crop preview; light auto-enhance.
 * Emits a 1024×1024 JPEG blob via onConfirm(blob).
 */
export default function ImageEditor({ src, onConfirm, onRetake }) {
  const cvsRef = useRef(null);
  const [img, setImg] = useState(null);
  const [scale, setScale] = useState(1);
  const [rot, setRot] = useState(0); // radians
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const size = 360; // on-screen editor size

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);

  const stateRef = useRef({ dragging:false, px:0, py:0 });
  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.px = e.clientX; stateRef.current.py = e.clientY;
  };
  const onPointerMove = (e) => {
    if (!stateRef.current.dragging) return;
    const dx = e.clientX - stateRef.current.px;
    const dy = e.clientY - stateRef.current.py;
    stateRef.current.px = e.clientX; stateRef.current.py = e.clientY;
    setTx(v => v + dx); setTy(v => v + dy);
  };
  const onPointerUp = () => { stateRef.current.dragging = false; };

  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    setScale(s => Math.min(5, Math.max(0.5, s * factor)));
  };

  const draw = () => {
    const cvs = cvsRef.current; if (!cvs || !img) return;
    const ctx = cvs.getContext("2d");
    const dim = size;
    ctx.clearRect(0,0,dim,dim);
    // circle mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(dim/2, dim/2, dim*0.45, 0, Math.PI*2);
    ctx.clip();

    ctx.translate(dim/2 + tx, dim/2 + ty);
    ctx.rotate(rot);
    const base = Math.min(img.width, img.height);
    const renderSize = base * scale * (dim / base);
    ctx.drawImage(img,
      (img.width - base)/2, (img.height - base)/2, base, base,
      -renderSize/2, -renderSize/2, renderSize, renderSize);

    ctx.restore();
    // subtle brighten overlay
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(0,0,dim,dim);
    ctx.globalCompositeOperation = "source-over";
  };

  useEffect(() => { draw(); }, [img, scale, tx, ty, rot]);

  const confirm = () => {
    if (!img) return;
    const dim = 1024;
    const c = document.createElement("canvas");
    c.width = dim; c.height = dim;
    const ctx = c.getContext("2d");
    ctx.beginPath(); ctx.arc(dim/2, dim/2, dim*0.45, 0, Math.PI*2); ctx.clip();

    const base = Math.min(img.width, img.height);
    const scaleFactor = scale * (dim / size);
    ctx.translate(dim/2 + (tx * (dim/size)), dim/2 + (ty * (dim/size)));
    ctx.rotate(rot);
    const renderSize = base * scaleFactor;
    ctx.drawImage(img,
      (img.width - base)/2, (img.height - base)/2, base, base,
      -renderSize/2, -renderSize/2, renderSize, renderSize);

    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(0,0,dim,dim);
    ctx.globalCompositeOperation = "source-over";

    c.toBlob((b) => onConfirm(b), "image/webp", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 text-white">
      <div className="w-[92vw] max-w-sm rounded-2xl border border-white/10 bg-black/60 p-4">
        <h3 className="text-center text-lg font-semibold">Adjust your selfie</h3>
        <div className="mt-3 grid place-items-center">
          <canvas
            ref={cvsRef}
            width={size}
            height={size}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            className="rounded-2xl bg-black/40 touch-none"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(s => Math.min(5, s*1.1))} className="rounded-xl bg-white/10 px-3 py-2">Zoom +</button>
            <button onClick={() => setScale(s => Math.max(0.5, s*0.9))} className="rounded-xl bg-white/10 px-3 py-2">Zoom −</button>
            <button onClick={() => setRot(r => r + Math.PI/12)} className="rounded-xl bg-white/10 px-3 py-2">↻</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRetake} className="rounded-xl bg-white/10 px-4 py-2">Retake</button>
            <button onClick={confirm} className="rounded-2xl bg-indigo-500 px-4 py-2 text-white">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}
