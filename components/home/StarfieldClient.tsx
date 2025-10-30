'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function StarfieldClient() {
  const stars = useMemo(
    () =>
      Array.from({ length: 120 }).map((_, index) => ({
        id: index,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.5 + 0.4,
        duration: Math.random() * 6 + 6,
        delay: Math.random() * 4,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.08),_rgba(15,23,42,0.95))]" />
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="absolute rounded-full bg-white/70"
          style={{ top: `${star.top}%`, left: `${star.left}%`, width: star.size, height: star.size }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.2], scale: [1, 1.3, 1] }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
