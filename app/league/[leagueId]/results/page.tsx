"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchManagerHistory, ManagerGWEntry } from "@/lib/fpl";

type FirestorePlayer = { id: string; name: string; fplTeamId?: number };
type PlayerGWPoints  = { playerId: string; name: string; points: number | null };
type GWResult        = { gw: number; players: PlayerGWPoints[] };
type CardVariant     = "winner" | "loser" | "neutral";

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_HEX = ["#0284c7","#7c3aed","#059669","#e11d48","#d97706","#db2777","#0d9488","#4338ca"];
function avatarHex(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_HEX[h % AVATAR_HEX.length];
}

function medalFor(rank: number): string {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
}

// ─── Score card ───────────────────────────────────────────────────────────────

const CARD_CFG = {
  winner: {
    border: "2px solid #22c55e",
    background: "linear-gradient(160deg, rgba(34,197,94,0.2) 0%, rgba(7,12,24,0.95) 80%)",
    scoreColor: "#22c55e",
    nameColor: "#ffffff",
    label: "VINNER ✓",
    labelColor: "#22c55e",
  },
  loser: {
    border: "2px solid #f43f5e",
    background: "linear-gradient(160deg, rgba(244,63,94,0.18) 0%, rgba(7,12,24,0.95) 80%)",
    scoreColor: "#fb7185",
    nameColor: "#fecdd3",
    label: "TAPER ✗",
    labelColor: "#f43f5e",
  },
  neutral: {
    border: "1px solid var(--border)",
    background: "var(--card)",
    scoreColor: "var(--muted)",
    nameColor: "var(--text)",
    label: null,
    labelColor: "transparent",
  },
} as const;

function ScoreCard({ player, rank, variant }: { player: PlayerGWPoints; rank: number; variant: CardVariant }) {
  const cfg = CARD_CFG[variant];
  const firstName = player.name.split(" ")[0];
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
        borderRadius: 14, padding: "14px 10px",
        width: 120, flexShrink: 0,
        border: cfg.border, background: cfg.background,
      }}
    >
      <span style={{ fontSize: 18 }}>{medalFor(rank)}</span>
      <div
        style={{
          width: 40, height: 40, borderRadius: "50%",
          backgroundColor: avatarHex(player.playerId),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0,
          boxShadow: `0 2px 8px ${avatarHex(player.playerId)}55`,
        }}
      >
        {initials(player.name)}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, textAlign: "center", color: cfg.nameColor,
        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {firstName}
      </div>
      <div style={{
        fontSize: 46, fontWeight: 900, lineHeight: 1, color: cfg.scoreColor,
        fontVariantNumeric: "tabular-nums",
        fontFamily: "var(--font-head, inherit)",
      }}>
        {player.points != null ? player.points : "—"}
      </div>
      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: -4 }}>pts</div>
      {cfg.label && (
        <div style={{ fontSize: 10, fontWeight: 800, color: cfg.labelColor, letterSpacing: "0.05em" }}>
          {cfg.label}
        </div>
      )}
    </div>
  );
}

// ─── GW card ─────────────────────────────────────────────────────────────────

function GWCard({ gw, players: ranked }: GWResult) {
  const topScore    = ranked[0]?.points ?? null;
  const bottomScore = ranked[ranked.length - 1]?.points ?? null;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--accent)", flexShrink: 0 }} />
        <span style={{
          fontFamily: "var(--font-head, inherit)", fontWeight: 800,
          letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 13, color: "var(--text)",
        }}>
          Gameweek {gw}
        </span>
        {topScore != null && (
          <span style={{
            marginLeft: "auto",
            display: "inline-flex", alignItems: "center",
            padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700,
            color: "#22c55e", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
          }}>
            Høyest: {topScore}
          </span>
        )}
      </div>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 10, minWidth: "max-content" }}>
          {ranked.map((p) => {
            const rank      = ranked.filter((o) => (o.points ?? -1) > (p.points ?? -1)).length + 1;
            const isWinner  = p.points != null && topScore != null && p.points > 0 && p.points === topScore;
            const isLoser   = ranked.length > 1 && p.points != null && bottomScore != null && p.points === bottomScore && bottomScore !== topScore;
            return (
              <ScoreCard
                key={p.playerId}
                player={p}
                rank={rank}
                variant={isWinner ? "winner" : isLoser ? "loser" : "neutral"}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [players,   setPlayers]   = useState<FirestorePlayer[]>([]);
  const [histories, setHistories] = useState<Record<string, ManagerGWEntry[]>>({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const snap = await getDocs(collection(db, "leagues", leagueId, "players"));
        const data = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? d.id,
          fplTeamId: d.data().fplTeamId as number | undefined,
        }));
        setPlayers(data);

        const withFpl = data.filter((p) => p.fplTeamId);
        if (withFpl.length === 0) { setLoading(false); return; }

        const entries: [string, ManagerGWEntry[]][] = [];
        const CHUNK = 3;
        for (let i = 0; i < withFpl.length; i += CHUNK) {
          const chunk = await Promise.all(
            withFpl.slice(i, i + CHUNK).map(async (p) => {
              const history = await fetchManagerHistory(p.fplTeamId!);
              return [p.id, history] as [string, ManagerGWEntry[]];
            })
          );
          entries.push(...chunk);
        }
        setHistories(Object.fromEntries(entries));
      } catch (err) {
        console.error(err);
        setError("Kunne ikke laste data.");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [leagueId]);

  const gwResults = useMemo<GWResult[]>(() => {
    const gwSet = new Set<number>();
    Object.values(histories).forEach((hist) => hist.forEach((h) => gwSet.add(h.event)));
    if (gwSet.size === 0) return [];

    return [...gwSet].sort((a, b) => b - a).map((gw) => ({
      gw,
      players: players
        .filter((p) => p.fplTeamId && histories[p.id])
        .map((p) => ({
          playerId: p.id,
          name: p.name,
          points: histories[p.id]?.find((h) => h.event === gw)?.points ?? null,
        }))
        .sort((a, b) => (b.points ?? -1) - (a.points ?? -1)),
    }));
  }, [histories, players]);

  const playersWithFpl = players.filter((p) => p.fplTeamId);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="section-title">
        <h1><span>📊</span> Resultater</h1>
        <p>FPL-poeng per gameweek for alle spillere.</p>
      </div>

      {loading && (
        <div className="card" style={{ color: "var(--muted)" }}>Henter FPL-historikk…</div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-700/60 bg-rose-900/30 p-6 text-rose-100">{error}</div>
      )}
      {!loading && !error && playersWithFpl.length === 0 && (
        <div className="card" style={{ color: "var(--muted)", fontSize: 14 }}>
          Ingen spillere har koblet FPL-konto ennå. Gå til Admin og legg inn FPL Team ID.
        </div>
      )}
      {!loading && !error && playersWithFpl.length > 0 && gwResults.length === 0 && (
        <div className="card" style={{ color: "var(--muted)", fontSize: 14 }}>
          Ingen GW-data funnet fra FPL ennå.
        </div>
      )}

      {!loading && gwResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {gwResults.map((result) => <GWCard key={result.gw} {...result} />)}
        </div>
      )}
    </section>
  );
}
