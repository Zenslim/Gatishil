"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function QuestionRotator({ items = [], periodMs = 4000 }){
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % items.length), periodMs);
    return () => clearInterval(t);
  }, [items.length, periodMs]);
  if(items.length === 0) return null;
  return (
    <div className="min-h-[2.25rem]">
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="font-medium"
        >
          {items[i]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
