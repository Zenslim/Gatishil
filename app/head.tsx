// /app/head.tsx
export default function Head() {
  return (
    <>
      <title>Gatishil — DAO · Guthi · Movement</title>
      <meta
        name="description"
        content="The DAO Party of the Powerless. Build parallel life, restore culture, and grow cooperative wealth."
      />
      {/* Force the favicon from /public/favicon.ico */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/favicon.ico" />
    </>
  );
}
