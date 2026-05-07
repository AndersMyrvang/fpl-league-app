"use client";

import { useEffect, useState } from "react";

export default function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Use Capacitor Network plugin when running natively, fall back to browser API
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        setIsOffline(!status.connected);

        const handle = await Network.addListener("networkStatusChange", (s) => {
          setIsOffline(!s.connected);
        });
        cleanup = () => handle.remove();
      } catch {
        // Not in a Capacitor environment — use browser events instead
        const onOnline = () => setIsOffline(false);
        const onOffline = () => setIsOffline(true);
        setIsOffline(!navigator.onLine);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        cleanup = () => {
          window.removeEventListener("online", onOnline);
          window.removeEventListener("offline", onOffline);
        };
      }
    })();

    return () => cleanup?.();
  }, []);

  if (!mounted || !isOffline) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      background: "var(--background, #09090f)",
      color: "var(--text, #e2e2f0)",
      padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
    }}>
      <div style={{ fontSize: 48 }}>📡</div>
      <div style={{ fontSize: 20, fontWeight: 700, textAlign: "center" }}>No connection</div>
      <div style={{ fontSize: 14, color: "var(--muted, #5a5a7a)", textAlign: "center", maxWidth: 260 }}>
        FPL League needs an internet connection to load live data. Check your connection and try again.
      </div>
    </div>
  );
}
