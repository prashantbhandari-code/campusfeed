"use client";

// Global error boundary — catches failures in the ROOT layout itself
// (error.tsx can't, since it lives inside the layout). Must render its own
// <html>/<body> because the layout that normally provides them has crashed.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#14141f",
            color: "#e4e4f0",
            padding: "16px",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "420px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💥</div>
            <h1 style={{ fontSize: "20px", margin: "0 0 8px" }}>
              The app failed to start
            </h1>
            <p style={{ fontSize: "14px", color: "#9a9ab5", margin: "0 0 24px" }}>
              A critical error occurred while loading the application.
              {error?.digest ? (
                <span style={{ display: "block", marginTop: "8px", fontFamily: "monospace", fontSize: "12px" }}>
                  ref: {error.digest}
                </span>
              ) : null}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 24px",
                borderRadius: "999px",
                border: "none",
                background: "#6366f1",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                margin: "0 8px",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 24px",
                borderRadius: "999px",
                border: "1px solid #3d3d5c",
                background: "transparent",
                color: "#e4e4f0",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                margin: "0 8px",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
