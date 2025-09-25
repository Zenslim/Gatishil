export default function Home() {
  return (
    <main style={{padding:20}}>
      <h1>✅ Gatishil — Home</h1>
      <ul>
        <li><a href="/people">People →</a></li>
        <li><a href="/api/hello" target="_blank" rel="noreferrer">Test API → /api/hello</a></li>
        <li><a href="/api/people" target="_blank" rel="noreferrer">People API → /api/people</a></li>
      </ul>
    </main>
  );
}
