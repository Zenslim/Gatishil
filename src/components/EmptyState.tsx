export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ border: '1px dashed #334155', borderRadius: 14, padding: 20, textAlign: 'center', opacity: .8 }}>
      <div style={{fontWeight:700, marginBottom:6}}>{title}</div>
      {hint && <div style={{opacity:.7}}>{hint}</div>}
    </div>
  );
}
