"use client";

import React, { useEffect } from "react";

// Note: global-error must be a minimal page that doesn't depend on root layout
// It cannot use context providers since the root layout itself may be broken
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "1rem",
        }}>
          <div style={{
            textAlign: "center",
            maxWidth: "28rem",
          }}>
            <h1 style={{
              fontSize: "3.75rem",
              fontWeight: "bold",
              color: "#d32f2f",
              marginBottom: "1rem",
            }}>
              Oops!
            </h1>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "1rem",
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: "1rem",
              color: "#6b7280",
              marginBottom: "2rem",
            }}>
              We&apos;re sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#d32f2f",
                color: "white",
                fontWeight: "500",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
