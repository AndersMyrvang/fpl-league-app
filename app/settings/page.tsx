"use client";
import { useTheme } from "@/lib/theme";
import { useRouter } from "next/navigation";

const THEMES = [
  {
    key: "slate" as const,
    name: "Slate + Amber",
    description: "Dark slate background with warm amber accent",
    swatches: ["#f59e0b", "#34d399", "#09090f"],
  },
  {
    key: "blue" as const,
    name: "Sky Blue",
    description: "Deep navy background with sky blue accent — closest to the original",
    swatches: ["#38bdf8", "#22c55e", "#070c18"],
  },
  {
    key: "green" as const,
    name: "Pitch Green",
    description: "Football pitch dark green with green accent",
    swatches: ["#22c55e", "#22c55e", "#060e0a"],
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <section style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", padding: 0,
            color: "var(--accent)", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontWeight: 900, fontSize: "2rem",
          marginTop: 12, marginBottom: 6,
        }}>Settings</h1>
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--muted)", marginBottom: 12,
      }}>Colour theme</div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {THEMES.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            style={{
              width: "100%",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              gap: 12, padding: "16px 20px",
              background: theme === t.key ? "var(--accent-dim)" : "transparent",
              border: "none",
              borderBottom: i < THEMES.length - 1 ? "1px solid var(--border)" : "none",
              borderRadius: 0,
              cursor: "pointer",
              boxShadow: "none",
              transform: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {t.swatches.map((c, si) => (
                  <div key={si} style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: c, border: "1px solid rgba(255,255,255,0.12)",
                  }}/>
                ))}
              </div>
              <div>
                <div style={{
                  fontWeight: 700, fontSize: 14,
                  color: theme === t.key ? "var(--accent)" : "var(--text)",
                }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {t.description}
                </div>
              </div>
            </div>
            {theme === t.key && (
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "var(--btn-text)", fontWeight: 800,
                flexShrink: 0,
              }}>✓</div>
            )}
          </button>
        ))}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--muted)",
        marginTop: 32, marginBottom: 12,
      }}>About</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {[
          ["App version", "0.9.x"],
          ["Season",      "2024/25"],
          ["Data source", "FPL API"],
        ].map(([k, v], i, arr) => (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 20px",
            borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ fontSize: 14, color: "var(--text-dim)" }}>{k}</span>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
