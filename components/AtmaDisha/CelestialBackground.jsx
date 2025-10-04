"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * CelestialBackground v6.0
 * - Tries WebGL starfield via three.js.
 * - If it fails, shows a CSS animated starfield fallback.
 * - Renders to <body> with zIndex:0 so app content can sit above (z >= 1).
 */
export default function CelestialBackground() {
  const [mounted, setMounted] = useState(false);
  const mountRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || fallback) return;
    let renderer, scene, camera, stars, starsGeometry, cleanup = () => {};

    (async () => {
      let THREE;
      try { THREE = await import("three"); } catch { setFallback(true); return; }

      try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.pointerEvents = "none";
        mountRef.current && mountRef.current.appendChild(renderer.domElement);

        const starTexture = new THREE.TextureLoader().load("/textures/star-glow.png", undefined, undefined, () => setFallback(true));

        const starCount = 900;
        starsGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
          positions[i * 3 + 0] = (Math.random() - 0.5) * 200;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const THREEpkg = await import("three");
        const starsMaterial = new THREEpkg.PointsMaterial({
          map: starTexture,
          size: 2.0,
          transparent: true,
          depthWrite: false,
          blending: THREEpkg.AdditiveBlending,
          sizeAttenuation: true,
          color: 0xffffff,
          opacity: 0.95,
        });

        stars = new THREEpkg.Points(starsGeometry, starsMaterial);
        scene.add(stars);

        let targetX = 0, targetY = 0;
        const onMove = (xNorm, yNorm) => {
          targetX = (xNorm * 2 - 1) * 2;
          targetY = (-(yNorm * 2 - 1)) * 2;
        };

        const handleMouse = (e) => onMove(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
        const handleTouch = (e) => {
          if (e.touches && e.touches.length) {
            const t = e.touches[0];
            onMove(t.clientX / window.innerWidth, t.clientY / window.innerHeight);
          }
        };
        document.addEventListener("mousemove", handleMouse);
        document.addEventListener("touchmove", handleTouch, { passive: true });

        let stop = false;
        const animate = () => {
          if (stop) return;
          requestAnimationFrame(animate);
          if (stars) {
            stars.rotation.y += 0.0007;
            stars.rotation.x += 0.0002;
          }
          camera.position.x += (targetX - camera.position.x) * 0.04;
          camera.position.y += (targetY - camera.position.y) * 0.04;
          camera.lookAt(scene.position);
          renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        cleanup = () => {
          stop = true;
          window.removeEventListener("resize", handleResize);
          document.removeEventListener("mousemove", handleMouse);
          document.removeEventListener("touchmove", handleTouch);
          if (mountRef.current && renderer?.domElement && mountRef.current.contains(renderer.domElement)) {
            mountRef.current.removeChild(renderer.domElement);
          }
          renderer?.dispose(); starsGeometry?.dispose();
        };
      } catch (e) {
        setFallback(true);
      }
    })();

    return () => cleanup();
  }, [mounted, fallback]);

  if (!mounted) return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100dvw",
        height: "100dvh",
        backgroundColor: "#000",
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />
      {fallback && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(30,30,40,0.4), rgba(0,0,0,0.9) 60%), \
               transparent",
            maskImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.9) 1px, transparent 1px), \
               radial-gradient(circle at 80% 70%, rgba(255,255,255,0.8) 1px, transparent 1px), \
               radial-gradient(circle at 60% 40%, rgba(255,255,255,0.6) 1px, transparent 1px)",
            WebkitMaskSize: "6px 6px, 8px 8px, 10px 10px",
            WebkitMaskRepeat: "repeat",
            animation: "twinkle 6s linear infinite",
          }}
        />
      )}
      <style>{`
        @keyframes twinkle {
          0%   { opacity: 0.9; transform: translate3d(0,0,0) }
          50%  { opacity: 0.75; transform: translate3d(0.2rem,-0.2rem,0) }
          100% { opacity: 0.9; transform: translate3d(0,0,0) }
        }
      `}</style>
    </div>,
    document.body
  );
}
