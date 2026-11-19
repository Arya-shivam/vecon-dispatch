"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>Unable to load dispatch</h1>
      <p>Check your connection and database configuration, then try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
