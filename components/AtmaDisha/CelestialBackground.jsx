"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * CelestialBackground (portal + dynamic three import)
 * - Loads three.js only on client via dynamic import.
 * - If import fails, quietly renders nothing (avoid breaking build).
 */
export default function CelestialBackground() {
  const [mounted, setMounted] = useState(false);
  const mountRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let renderer, scene, camera, stars, starsGeometry, cleanup = () => {};

    (async () => {
      let THREE;
      try {
        THREE = await import("three");
      } catch (e) {
        console.warn("[CelestialBackground] three import failed:", e);
        return;
      }

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.style.pointerEvents = "none";
      mountRef.current && mountRef.current.appendChild(renderer.domElement);

      const starTexture = new THREE.TextureLoader().load("/textures/star-glow.png");

      const starCount = 1000;
      starsGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      const alphas = new Float32Array(starCount);
      const colors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
        alphas[i] = Math.random();
        colors[i * 3 + 0] = 0.8;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1.0;
      }
      starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      starsGeometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
      starsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const starsMaterial = new THREE.PointsMaterial({
        map: starTexture,
        size: 2.0,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true,
      });

      stars = new THREE.Points(starsGeometry, starsMaterial);
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

      const clock = new THREE.Clock();
      let stop = false;
      const animate = () => {
        if (stop) return;
        requestAnimationFrame(animate);

        const elapsed = clock.getElapsedTime();
        stars.rotation.y += 0.0007;
        stars.rotation.x += 0.0002;

        const alphaAttr = starsGeometry.getAttribute("alpha");
        const colorAttr = starsGeometry.getAttribute("color");
        const hueShift = (elapsed * 0.02) % 1;
        for (let i = 0; i < starCount; i++) {
          const base = (Math.sin(elapsed * 0.5 + i) + 1) / 2;
          alphaAttr.setX(i, 0.5 + base * 0.5);
          const h = (hueShift + i * 0.0005) % 1;
          const c = new THREE.Color(); c.setHSL(h, 0.5, 0.8);
          colorAttr.setXYZ(i, c.r, c.g, c.b);
        }
        alphaAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;

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
        renderer?.dispose();
        starsGeometry?.dispose();
      };
    })();

    return () => cleanup();
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div
      ref={mountRef}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
    />,
    document.body
  );
}
