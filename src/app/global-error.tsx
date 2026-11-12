"use client";

/* Last-resort error screen when the root layout itself fails. Must render its own <html> and <body>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#fff", color: "#14161a" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 32 }}>Something went wrong</h1>
          <p style={{ color: "#5d6470" }}>Surfaced couldn&apos;t load. Your saved checks are safe in your browser.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 999, border: 0, background: "#14161a", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
