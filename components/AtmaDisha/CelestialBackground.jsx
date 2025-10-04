"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function CelestialBackground() {
  const [mounted, setMounted] = useState(false);
  const mountRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let renderer, scene, camera, stars, starsGeometry, cleanup = () => {};

    (async () => {
      let THREE;
      try { THREE = await import("three"); } catch { return; }

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.style.pointerEvents = "none";
      mountRef.current && mountRef.current.appendChild(renderer.domElement);

      const starTexture = new THREE.TextureLoader().load("/textures/star-glow.png");

      const starCount = 900;
      starsGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
      starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const starsMaterial = new THREE.PointsMaterial({
        map: starTexture,
        size: 2.0,
        transparent: true,
        depthWrite: false,
        blending: (await import("three")).AdditiveBlending,
        sizeAttenuation: true,
        color: 0xffffff,
        opacity: 0.95,
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

      let stop = false;
      const animate = () => {
        if (stop) return;
        requestAnimationFrame(animate);
        stars.rotation.y += 0.0007;
        stars.rotation.x += 0.0002;
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
    })();

    return () => cleanup();
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        maxWidth: "100dvw",
        maxHeight: "100dvh",
        backgroundColor: "#000",
        // Push behind all app content; overlays can sit above with positive z
        zIndex: -1,
        pointerEvents: "none",
      }}
    />,
    document.body
  );
}
