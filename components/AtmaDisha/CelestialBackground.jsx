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
      const onMove = (x, y) => { targetX = (x * 2 - 1) * 2; targetY = (-(y * 2 - 1)) * 2; };
      const mm = (e) => onMove(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
      const tm = (e) => { if (!e.touches?.length) return; const t = e.touches[0]; onMove(t.clientX / window.innerWidth, t.clientY / window.innerHeight); };
      document.addEventListener("mousemove", mm);
      document.addEventListener("touchmove", tm, { passive: true });
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
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);
      cleanup = () => {
        stop = true;
        window.removeEventListener("resize", onResize);
        document.removeEventListener("mousemove", mm);
        document.removeEventListener("touchmove", tm);
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
    <div ref={mountRef} style={{ position:"fixed", inset:0, width:"100dvw", height:"100dvh", backgroundColor:"#000", zIndex:0, pointerEvents:"none" }} />,
    document.body
  );
}
