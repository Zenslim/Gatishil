use client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';

/**
 * RebirthScene
 * - A living network that unfolds (seed → mandal) then morphs toward a Nepal-like silhouette.
 * - Cursor orbit + scroll dolly.
 * - Performance-safe: instanced spheres + line segments.
 * - No postprocessing required (glow simulated via additive materials + slight blur sprite).
 */

type Vec3 = [number, number, number];

const NODE_COUNT = 420; // mobile will still be fine; tweak if needed

function useIsLowMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefers(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefers;
}

/** Generate radial "mandal" positions and an approximate Nepal silhouette positions */
function usePositions() {
  return useMemo(() => {
    const mandal: Vec3[] = [];
    const mapish: Vec3[] = [];

    // Mandal radial layout
    for (let i = 0; i < NODE_COUNT; i++) {
      const r = 0.8 + Math.random() * 0.6; // radius
      const a = (i / NODE_COUNT) * Math.PI * 2 + Math.random() * 0.12;
      mandal.push([Math.cos(a) * r, Math.sin(a) * r * 0.85, (Math.random() - 0.5) * 0.15]);
    }

    // Approx Nepal-like skewed outline/cloud (rough artistic impression)
    // We'll bias points into a skewed polygonal blob (longer east-west, tapering south)
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (Math.random() * 2 - 1) * 1.4;           // wider
      const y = (Math.random() * 2 - 1) * 0.9;           // shorter
      const skewY = y - 0.25 * Math.max(0, x);           // south taper
      const ridge = Math.sin((x + 1.4) * 1.2) * 0.15;    // hint ridges
      mapish.push([x * 0.85, (skewY + ridge) * 0.85, (Math.random() - 0.5) * 0.1]);
    }

    return { mandal, mapish };
  }, []);
}

function Nodes({ t }: { t: number }) {
  const { mandal, mapish } = usePositions();
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = new THREE.Color('#fbbf24'); // amber-400-ish
  const lowMotion = useIsLowMotion();

  useEffect(() => {
    if (!ref.current) return;
    for (let i = 0; i < NODE_COUNT; i++) {
      // Lerp positions based on t (0 mandal → 1 mapish)
      const a = mandal[i];
      const b = mapish[i];
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const z = a[2] + (b[2] - a[2]) * t;
      dummy.position.set(x, y, z);

      // Small breathing scale
      const s = 0.018 + (Math.sin((i * 13.7 + (t * 6.28)) * 0.3) * 0.004);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      // Slight flicker
      const flick = 0.6 + (Math.sin(i * 1.7 + (t * 3.0)) + 1) * 0.2;
      const c = color.clone().multiplyScalar(flick);
      ref.current.setColorAt(i, c as any);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if ((ref.current as any).instanceColor) (ref.current as any).instanceColor.needsUpdate = true;
  }, [t, mandal, mapish, dummy, color]);

  // gentle rotation
  const group = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (!group.current || lowMotion) return;
    group.current.rotation.z += delta * 0.06 * (1 - t * 0.5);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={ref} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial vertexColors={true} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    </group>
  );
}

function Links({ t }: { t: number }) {
  // Sparse connections for suggestion of structure
  const { mandal, mapish } = usePositions();
  const geom = useMemo(() => new THREE.BufferGeometry(), []);
  const positions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < NODE_COUNT; i += 7) {
      const j = (i + 23) % NODE_COUNT;
      const k = (i + 71) % NODE_COUNT;

      const a0 = mandal[i], a1 = mandal[j];
      const b0 = mapish[i], b1 = mapish[j];
      const x0 = a0[0] + (b0[0] - a0[0]) * t;
      const y0 = a0[1] + (b0[1] - a0[1]) * t;
      const z0 = a0[2] + (b0[2] - a0[2]) * t;
      const x1 = a1[0] + (b1[0] - a1[0]) * t;
      const y1 = a1[1] + (b1[1] - a1[1]) * t;
      const z1 = a1[2] + (b1[2] - a1[2]) * t;
      arr.push(x0, y0, z0, x1, y1, z1);

      const a2 = mandal[k], b2 = mapish[k];
      const x2 = a2[0] + (b2[0] - a2[0]) * t;
      const y2 = a2[1] + (b2[1] - a2[1]) * t;
      const z2 = a2[2] + (b2[2] - a2[2]) * t;
      arr.push(x0, y0, z0, x2, y2, z2);
    }
    return new Float32Array(arr);
  }, [mandal, mapish, t]);

  useEffect(() => {
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.computeBoundingSphere();
  }, [geom, positions]);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={'#f59e0b'} opacity={0.3} transparent />
    </lineSegments>
  );
}

function CameraRig({ t }: { t: number }) {
  const { camera, viewport } = useThree();
  const lowMotion = useIsLowMotion();
  const targetZ = 3.6 - t * 0.8;

  useFrame(({ mouse }, delta) => {
    const parallaxX = lowMotion ? 0 : mouse.x * 0.1;
    const parallaxY = lowMotion ? 0 : mouse.y * 0.06;

    camera.position.x += (parallaxX - camera.position.x) * 0.05;
    camera.position.y += (parallaxY - camera.position.y) * 0.05;
    camera.position.z += ((targetZ) - camera.position.z) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function RebirthScene() {
  const [phase, setPhase] = useState<'seed' | 'mandal' | 'map'>('seed');
  const [t, setT] = useState(0); // 0 (mandal) -> 1 (map)
  const lowMotion = useIsLowMotion();

  // Timeline: seed -> mandal -> morph to map
  useEffect(() => {
    let mounted = true;
    const seq = async () => {
      await new Promise(r => setTimeout(r, 650)); // seed beat
      if (!mounted) return;
      setPhase('mandal');
      // Hold mandal for a moment
      await new Promise(r => setTimeout(r, 1200));
      if (!mounted) return;
      // Morph over ~1200ms
      const start = performance.now();
      const duration = 1200;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = p < 0.5 ? 2*p*p : -1 + (4 - 2*p)*p; // easeInOutQuad
        setT(eased);
        if (p < 1 && mounted) requestAnimationFrame(tick);
        else setPhase('map');
      };
      requestAnimationFrame(tick);
    };
    seq();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="absolute inset-0 z-20">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 3.8], fov: 42 }}>
        <color attach="background" args={['#000']} />
        {/* Soft ambient */}
        <ambientLight intensity={0.1} />
        {/* Additive "glow" key light */}
        <pointLight position={[0, 0, 3]} intensity={1.2} color={'#fbbf24'} />

        <Nodes t={t} />
        <Links t={t} />
        <CameraRig t={t} />

        {/* Subtle center halo sprite */}
        <mesh position={[0, 0, -0.2]}>
          <planeGeometry args={[4.8, 4.8]} />
          <meshBasicMaterial
            color={'#fbbf24'}
            transparent
            opacity={0.05 + (0.06 * (1 - t))}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Canvas>

      {/* Minimal hint for Flow Mode (no words on scene itself) */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 opacity-50 text-[10px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0, duration: 0.8 }}
        >
          {/* Decorative dots */}
          <span className="inline-block h-1 w-1 rounded-full bg-amber-300/60 mr-1" />
          <span className="inline-block h-1 w-1 rounded-full bg-amber-300/40 mr-1" />
          <span className="inline-block h-1 w-1 rounded-full bg-amber-300/30" />
        </motion.div>
      </div>
    </div>
  );
}
