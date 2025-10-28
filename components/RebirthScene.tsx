'use client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

type Vec3 = [number, number, number];
const NODE_COUNT = 420;

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

function usePositions() {
  return useMemo(() => {
    const mandal: Vec3[] = [];
    const mapish: Vec3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const r = 0.8 + Math.random() * 0.6;
      const a = (i / NODE_COUNT) * Math.PI * 2 + Math.random() * 0.12;
      mandal.push([Math.cos(a) * r, Math.sin(a) * r * 0.85, (Math.random() - 0.5) * 0.15]);
    }
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (Math.random() * 2 - 1) * 1.4;
      const y = (Math.random() * 2 - 1) * 0.9;
      const skewY = y - 0.25 * Math.max(0, x);
      const ridge = Math.sin((x + 1.4) * 1.2) * 0.15;
      mapish.push([x * 0.85, (skewY + ridge) * 0.85, (Math.random() - 0.5) * 0.1]);
    }
    return { mandal, mapish };
  }, []);
}

function Nodes({ t }: { t: number }) {
  const { mandal, mapish } = usePositions();
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = new THREE.Color('#fbbf24');
  const lowMotion = useIsLowMotion();

  useEffect(() => {
    if (!ref.current) return;
    for (let i = 0; i < NODE_COUNT; i++) {
      const a = mandal[i];
      const b = mapish[i];
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const z = a[2] + (b[2] - a[2]) * t;
      dummy.position.set(x, y, z);
      const s = 0.018 + (Math.sin((i * 13.7 + (t * 6.28)) * 0.3) * 0.004);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      const flick = 0.6 + (Math.sin(i * 1.7 + (t * 3.0)) + 1) * 0.2;
      const c = color.clone().multiplyScalar(flick);
      (ref.current as any).setColorAt(i, c as any);
    }
    ref.current.instanceMatrix.needsUpdate = true
    if ((ref.current as any).instanceColor) (ref.current as any).instanceColor.needsUpdate = true
  }, [t, mandal, mapish, dummy, color]);

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
  const { camera } = useThree();
  const lowMotion = useIsLowMotion();
  const targetZ = 3.6 - t * 0.8;

  useFrame(({ mouse }) => {
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
  const [t, setT] = useState(0);

  useEffect(() => {
    let mounted = true
    const start = performance.now() + 650;
    const hold = 1200;
    const morph = 1200;
    const tick = (now: number) => {
      if (!mounted) return;
      if (now < start + hold) {
        setT(0);
      } else {
        const p = Math.min(1, (now - (start + hold)) / morph);
        const eased = p < 0.5 ? 2*p*p : -1 + (4 - 2*p)*p;
        setT(eased);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { mounted = false };
  }, []);

  return (
    <div className="absolute inset-0 z-20">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 3.8], fov: 42 }} gl={{ antialias: true }}>
        <color attach="background" args={['#000']} />
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 0, 3]} intensity={1.2} color={'#fbbf24'} />

        <Nodes t={t} />
        <Links t={t} />
        <CameraRig t={t} />

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

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 opacity-50 text-[10px]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0, duration: 0.8 }}>
          <span className="inline-block h-1 w-1 rounded-full bg-amber-300/60 mr-1" />
          <span className="inline-block h-1 w-1 rounded-full bg-amber-300/40 mr-1" />
          <span className="inline-block h-1 w-1 rounded-full bg-amber-300/30" />
        </motion.div>
      </div>
    </div>
  );
}
