"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchManagerHistory, ManagerGWEntry } from "@/lib/fpl";

type Player = { id: string; name: string; fplTeamId?: number };

const AVATAR_HEX = ["#0284c7","#7c3aed","#059669","#e11d48","#d97706","#db2777","#0d9488","#4338ca"];
function avatarHex(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_HEX[h % AVATAR_HEX.length];
}
function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function StandingsPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [players, setPlayers] = useState<Player[]>([]);
  const [histories, setHistories] = useState<Record<string, ManagerGWEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "leagues", leagueId, "players"));
        const data: Player[] = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? d.id,
          fplTeamId: d.data().fplTeamId as number | undefined,
        }));
        setPlayers(data);

        const withFpl = data.filter((p) => p.fplTeamId);
        if (withFpl.length === 0) { setLoading(false); return; }

        const CHUNK = 3;
        const entries: [string, ManagerGWEntry[]][] = [];
        for (let i = 0; i < withFpl.length; i += CHUNK) {
          const chunk = await Promise.all(
            withFpl.slice(i, i + CHUNK).map(async (p) => {
              const hist = await fetchManagerHistory(p.fplTeamId!);
              return [p.id, hist] as [string, ManagerGWEntry[]];
            })
          );
          entries.push(...chunk);
        }
        setHistories(Object.fromEntries(entries));
      } catch (err) {
        console.error(err);
        setError("Could not load standings.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [leagueId]);

  const standings = useMemo(() => {
    return players
      .filter((p) => p.fplTeamId && histories[p.id])
      .map((p) => {
        const hist = histories[p.id];
        const total = hist.length > 0 ? Math.max(...hist.map((e) => e.total_points)) : 0;
        const gwsPlayed = hist.length;
        return { player: p, total, gwsPlayed };
      })
      .sort((a, b) => b.total - a.total);
  }, [players, histories]);

  // Find last-GW winner
  const lastGwWinnerId = useMemo(() => {
    if (standings.length === 0) return null;
    const allGws = new Set<number>();
    standings.forEach(({ player }) =>
      histories[player.id]?.forEach((e) => allGws.add(e.event))
    );
    if (allGws.size === 0) return null;
    const lastGw = Math.max(...allGws);
    let bestId: string | null = null;
    let bestPts = -1;
    for (const { player } of standings) {
      const entry = histories[player.id]?.find((e) => e.event === lastGw);
      if (entry && entry.points > bestPts) {
        bestPts = entry.points;
        bestId = player.id;
      }
    }
    return bestId;
  }, [standings, histories]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="section-title">
        <h1>Standings</h1>
        <p>Overall league table, ranked by total points.</p>
      </div>

      {loading && (
        <div className="card" style={{ color: "var(--muted)" }}>Loading standings…</div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-700/60 bg-rose-900/30 p-6 text-rose-100">{error}</div>
      )}
      {!loading && !error && standings.length === 0 && (
        <div className="card" style={{ color: "var(--muted)", fontSize: 14 }}>
          No FPL data yet. Make sure players have their FPL Team ID set.
        </div>
      )}

      {!loading && standings.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {standings.map(({ player, total, gwsPlayed }, i) => {
            const isLastGwWinner = player.id === lastGwWinnerId;
            return (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: i < standings.length - 1 ? "1px solid var(--border)" : "none",
                  background: i === 0 ? "rgba(56,189,248,0.04)" : "transparent",
                }}
              >
                <span style={{
                  width: 28,
                  textAlign: "center",
                  fontSize: i < 3 ? 18 : 13,
                  color: "var(--muted)",
                  flexShrink: 0,
                }}>
                  {i < 3 ? MEDALS[i] : `${i + 1}.`}
                </span>

                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: avatarHex(player.id),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 12,
                }}>
                  {initials(player.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: "var(--text)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {player.name}
                    {isLastGwWinner && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: "2px 7px", borderRadius: 99,
                        background: "rgba(251,191,36,0.15)",
                        border: "1px solid rgba(251,191,36,0.35)",
                        color: "#fbbf24",
                        letterSpacing: "0.04em",
                      }}>
                        GW win
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {gwsPlayed} gameweeks
                  </div>
                </div>

                <div style={{
                  fontSize: 22, fontWeight: 900,
                  color: i === 0 ? "var(--accent)" : "var(--text)",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "var(--font-head, inherit)",
                  flexShrink: 0,
                }}>
                  {total}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
