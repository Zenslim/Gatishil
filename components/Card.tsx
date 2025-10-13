import { ReactNode } from 'react';

export default function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #0f172a 0%, #0b1222 100%)',
      border: '1px solid #1f2a44',
      borderRadius: 16,
      padding: 16
    }}>
      <div style={{fontWeight:800, marginBottom:6}}>{title}</div>
      <div style={{opacity:.9}}>{children}</div>
    </div>
  );
}
