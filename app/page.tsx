"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getRecentLeagues, type RecentLeague } from "@/components/RecentLeagueSaver";

export default function HomePage() {
  const router = useRouter();
  const [leagueId, setLeagueId] = useState("");
  const [recent, setRecent] = useState<RecentLeague[]>([]);

  useEffect(() => {
    setRecent(getRecentLeagues());
  }, []);

  const handleView = (e: React.FormEvent) => {
    e.preventDefault();
    const id = leagueId.trim();
    if (id) router.push(`/league/${id}`);
  };

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 40,
        padding: "80px 20px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <Link href="/settings" style={{
          fontSize: 11, fontWeight: 700, color: "var(--muted)",
          padding: "5px 10px", borderRadius: 8,
          border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)",
        }}>⚙ Theme</Link>
      </div>
      <div>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 900,
            marginBottom: 12,
            fontFamily: "var(--font-head, inherit)",
          }}
        >
          FPL League
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 480 }}>
          Create a shareable page for your FPL mini-league. Track results,
          transfers, and season stats with your mates.
        </p>
      </div>

      <Link
        href="/create"
        style={{
          display: "inline-block",
          padding: "14px 36px",
          borderRadius: 12,
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
          textDecoration: "none",
        }}
      >
        Create a league
      </Link>

      <div
        style={{
          width: "100%",
          maxWidth: 400,
          borderTop: "1px solid var(--border)",
          paddingTop: 32,
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 14 }}>
          Already have a league?
        </p>
        <form onSubmit={handleView} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            placeholder="Enter league ID"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.07)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            View
          </button>
        </form>
      </div>

      {recent.length > 0 && (
        <div style={{ width: "100%", maxWidth: 400, textAlign: "left" }}>
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 10,
          }}>
            Recently viewed
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recent.map((l) => (
              <Link
                key={l.leagueId}
                href={`/league/${l.leagueId}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.03)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                  {l.leagueName}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
