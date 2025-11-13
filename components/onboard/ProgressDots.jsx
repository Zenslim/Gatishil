"use client";
import styles from "@/styles/OnboardFX.module.css";
export default function ProgressDots({ index, total }) {
  return (
    <div className="flex items-center gap-3">
      {[...Array(total)].map((_, i) => (
        <div key={i} className={`${styles.dot} ${i<=index?styles.dotActive:""}`} />
      ))}
    </div>
  );
}
