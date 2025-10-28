'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

export default function Starfield() {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <motion.div style={{ opacity }} className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 starfield">
        <div className="layer layer-s"></div>
        <div className="layer layer-m"></div>
        <div className="layer layer-l"></div>
      </div>

      <style jsx>{`
        .starfield { position: absolute; inset: 0; overflow: hidden; }
        .layer { position: absolute; inset: -50%; animation: drift 60s linear infinite; opacity: 0.9; }
        .layer-s {
          background-image:
            radial-gradient(white 1px, transparent 1.5px),
            radial-gradient(white 1px, transparent 1.5px);
          background-size: 120px 120px, 160px 160px;
          background-position: 0 0, 60px 80px;
          filter: drop-shadow(0 0 1px rgba(255,255,255,0.35));
          animation-duration: 90s;
        }
        .layer-m {
          background-image:
            radial-gradient(white 1.5px, transparent 2px),
            radial-gradient(white 1.5px, transparent 2px);
          background-size: 200px 200px, 260px 260px;
          background-position: 40px 20px, 160px 100px;
          filter: drop-shadow(0 0 2px rgba(255,255,255,0.25));
          animation-duration: 120s;
        }
        .layer-l {
          background-image:
            radial-gradient(white 2px, transparent 2.5px),
            radial-gradient(white 2px, transparent 2.5px);
          background-size: 320px 320px, 420px 420px;
          background-position: 120px 60px, 260px 180px;
          filter: drop-shadow(0 0 3px rgba(255,255,255,0.2));
          animation-duration: 150s;
        }
        @keyframes drift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-4%, -6%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </motion.div>
  );
}
