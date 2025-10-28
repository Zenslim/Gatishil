'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Line, Points, PointMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

/**
 * GNStory — Procedural storytelling scene
 * Beats:
 * 1) seed pulse → 2) mandala bloom → 3) morph → 4) Nepal outline → 5) invitation orb
 * All shapes are procedural (no textures). Lightweight for slow internet.
 */

type V2 = [number, number];

const NEPAL_RAW: V2[] = [
  [-83.8,29.7],[-83.0,30.0],[-82.2,30.3],[-81.2,30.2],[-80.3,29.9],[-79.7,29.5],[-79.0,29.2],
  [-78.2,29.0],[-77.4,28.8],[-76.6,28.6],[-76.0,28.4],[-75.0,28.3],[-74.0,28.0],[-73.0,27.8],
  [-72.0,27.6],[-71.0,27.5],[-70.2,27.5],[-69.4,27.6],[-68.8,27.8],[-68.0,27.9],[-67.0,28.0],
  [-66.0,28.0],[-65.0,27.9],[-64.0,27.7],[-63.0,27.6],[-62.0,27.5],[-61.0,27.4],[-60.0,27.3],
  [-59.0,27.2],[-58.0,27.1],[-57.0,27.0],[-56.0,26.9],[-55.0,26.8],[-54.2,26.8],[-53.3,26.9],
  [-52.5,27.1],[-51.6,27.3],[-50.8,27.6],[-50.0,27.8],[-49.0,28.0],[-48.0,28.2],[-47.0,28.4],
  [-46.0,28.5],[-45.0,28.7],[-44.0,28.8],[-43.0,28.9],[-42.0,29.0],[-41.0,29.1],[-40.0,29.2],
  [-39.0,29.3],[-38.0,29.4],[-37.0,29.5],[-36.0,29.6],[-35.0,29.7],
];

function normalizePath(path: V2[], scale = 1.0): V2[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x,y] of path) { if (x<minX) minX=x; if (y<minY) minY=y; if (x>maxX) maxX=x; if (y>maxY) maxY=y; }
  const w = maxX - minX, h = maxY - minY, s = scale / Math.max(w, h || 1);
  const cx = (minX + maxX)/2, cy = (minY + maxY)/2;
  return path.map(([x,y]) => [ (x - cx)*s, (y - cy)*s ]);
}
const NEPAL = normalizePath(NEPAL_RAW, 2.6);

function makeMandala(count: number, rings = 6, radius = 1.25): V2[] {
  const pts: V2[] = [];
  const perRing = Math.max(12, Math.floor(count / rings));
  for (let r = 1; r <= rings; r++) {
    const rad = (radius * r) / rings;
    for (let i = 0; i < perRing; i++) {
      const a = (i / perRing) * Math.PI * 2;
      pts.push([Math.cos(a)*rad, Math.sin(a)*rad]);
    }
  }
  while (pts.length < count) pts.push(pts[pts.length % (perRing * rings)]);
  if (pts.length > count) pts.length = count;
  return pts;
}

function resample(path: V2[], count: number): V2[] {
  const segs: { a: V2; b: V2; d: number }[] = [];
  let L = 0;
  for (let i = 0; i < path.length-1; i++) {
    const a = path[i], b = path[i+1];
    const d = Math.hypot(b[0]-a[0], b[1]-a[1]);
    segs.push({ a, b, d }); L += d;
  }
  const out: V2[] = [];
  for (let k = 0; k < count; k++) {
    const t = (k / Math.max(1, count-1)) * L;
    let acc = 0;
    for (const {a,b,d} of segs) {
      if (acc + d >= t) {
        const u = d ? (t - acc)/d : 0;
        out.push([ a[0] + (b[0]-a[0])*u, a[1] + (b[1]-a[1])*u ]);
        break;
      }
      acc += d;
    }
  }
  return out;
}

type Phase = 'seed' | 'mandala' | 'morph' | 'map' | 'invite';

export default function GNStory() {
  const group = useRef<any>(null);
  const COUNT = 1200;

  const mandala = useMemo(() => makeMandala(COUNT, 7, 1.35), []);
  const nepal = useMemo(() => resample(NEPAL, COUNT), []);

  const pos = useMemo(() => new Float32Array(COUNT*3).fill(0), []);
  const target = useMemo(() => new Float32Array(COUNT*3).fill(0), []);
  const twinkle = useMemo(() => Float32Array.from({length: COUNT}, () => Math.random()), []);

  const [phase, setPhase] = useState<Phase>('seed');
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('mandala'), 1800);
    const t2 = setTimeout(() => setPhase('morph'),   4800);
    const t3 = setTimeout(() => setPhase('map'),     6900);
    const t4 = setTimeout(() => setPhase('invite'),  9200);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    for (let i = 0; i < COUNT; i++) {
      const [mx,my] = mandala[i % mandala.length];
      const [nx,ny] = nepal[i % nepal.length];
      let tx = 0, ty = 0;
      if (phase === 'seed') { tx = 0; ty = 0; }
      else if (phase === 'mandala') { tx = mx; ty = my; }
      else if (phase === 'morph') { tx = mx*0.5 + nx*0.5; ty = my*0.5 + ny*0.5; }
      else { tx = nx; ty = ny; }
      target[i*3+0] = tx;
      target[i*3+1] = ty;
      target[i*3+2] = 0;
    }
  }, [phase, COUNT, target, mandala, nepal]);

  useFrame((state, delta) => {
    const easing = phase === 'seed' ? 0.12 : phase === 'mandala' ? 0.18 : phase === 'morph' ? 0.14 : 0.1;
    for (let i = 0; i < COUNT; i++) {
      pos[i*3+0] = pos[i*3+0] + (target[i*3+0] - pos[i*3+0]) * easing;
      pos[i*3+1] = pos[i*3+1] + (target[i*3+1] - pos[i*3+1]) * easing;
      pos[i*3+2] = Math.sin((state.clock.elapsedTime + twinkle[i]) * 0.8) * 0.02;
    }
    if (group.current) {
      const rotSpeed = phase === 'mandala' ? 0.08 : phase === 'morph' ? 0.04 : 0.01;
      group.current.rotation.z += rotSpeed * delta;
    }
  });

  const ring = useMemo(() => {
    const R: V2[] = [];
    const S = 160;
    for (let i = 0; i < S; i++) {
      const a = (i/S) * Math.PI * 2; R.push([Math.cos(a)*1.25, Math.sin(a)*1.25]);
    }
    return R;
  }, []);

  return (
    <group ref={group}>
      <Points positions={pos} stride={3}>
        <PointMaterial transparent color="#FCD34D" size={0.03} sizeAttenuation depthWrite={false} />
      </Points>

      {(phase === 'mandala' || phase === 'morph') && (
        <Line points={ring.map(([x,y]) => [x,y,0])} color="#FBBF24" lineWidth={1.2} transparent opacity={phase === 'morph' ? 0.35 : 0.6} />
      )}

      {(phase === 'morph' || phase === 'map' || phase === 'invite') && (
        <Line points={NEPAL.map(([x,y]) => [x,y,0])} color="#F59E0B" lineWidth={1.4} transparent opacity={phase === 'morph' ? 0.25 : 0.85} />
      )}

      {(phase === 'invite') && (
        <mesh position={[0,0,0]}>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshBasicMaterial color="#FDE68A" transparent opacity={0.95} />
        </mesh>
      )}
    </group>
  );
}