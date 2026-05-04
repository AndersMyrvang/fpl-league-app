export type PlayerTile = {
  name: string;
  photoId: number;
  club: string;
  badge?: string;
  badgeGold?: boolean;
};

export type PitchRow = {
  label: string;
  players: PlayerTile[];
};

const AVATAR_HEX = [
  "#0284c7", "#7c3aed", "#059669", "#e11d48",
  "#d97706", "#db2777", "#0d9488", "#4338ca",
];

export function avatarHex(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_HEX[h % AVATAR_HEX.length];
}

// Vivid ring color palette — assigned deterministically per club
const RING_PALETTE = [
  "#F59E0B", "#EC4899", "#F97316", "#14B8A6",
  "#6366F1", "#22C55E", "#EF4444", "#8B5CF6",
  "#0EA5E9", "#84CC16", "#F43F5E", "#A78BFA",
];

function clubRingColor(club: string): string {
  let h = 0;
  for (const c of club) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return RING_PALETTE[h % RING_PALETTE.length];
}

function PlayerCard({ tile }: { tile: PlayerTile }) {
  const photoUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${tile.photoId}.png`;
  const ring = clubRingColor(tile.club);
  const lastName = tile.name.includes(" ") ? tile.name.split(" ").slice(-1)[0] : tile.name;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      width: 84,
    }}>
      {/* Photo circle */}
      <div style={{ position: "relative" }}>
        <div style={{
          width: 68, height: 68, borderRadius: "50%",
          border: `4px solid ${ring}`,
          overflow: "hidden",
          background: "rgba(0,0,0,0.4)",
          boxShadow: `0 0 14px ${ring}55, 0 4px 12px rgba(0,0,0,0.6)`,
          flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={tile.name}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "center 10%",
              display: "block",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        {/* Captain / badge */}
        {tile.badge && (
          <div style={{
            position: "absolute", top: -4, right: -4,
            width: 22, height: 22, borderRadius: "50%",
            background: tile.badgeGold ? "#F59E0B" : "rgba(15,15,20,0.9)",
            border: `2px solid ${tile.badgeGold ? "#fff" : "rgba(255,255,255,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 900,
            color: tile.badgeGold ? "#0a0500" : "#fff",
            boxShadow: tile.badgeGold ? "0 2px 6px rgba(245,158,11,0.5)" : "none",
          }}>
            {tile.badge}
          </div>
        )}
      </div>

      {/* Name pill */}
      <div style={{
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        borderRadius: 7,
        padding: "3px 9px",
        textAlign: "center",
        maxWidth: 84,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: "#ffffff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          lineHeight: 1.3,
          letterSpacing: "0.01em",
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          {lastName}
        </div>
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.6)",
          lineHeight: 1.1,
          letterSpacing: "0.06em",
        }}>
          {tile.club}
        </div>
      </div>
    </div>
  );
}

function PitchMarkings() {
  const s = "rgba(255,255,255,0.45)";
  const sw = 2;
  return (
    <svg
      viewBox="0 0 800 530"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
      }}
    >
      <g stroke={s} strokeWidth={sw} fill="none">
        {/* Outer boundary */}
        <rect x="22" y="12" width="756" height="506" />
        {/* Halfway line */}
        <line x1="22" y1="265" x2="778" y2="265" />
        {/* Center circle */}
        <circle cx="400" cy="265" r="72" />
        {/* Top penalty area */}
        <rect x="218" y="12" width="364" height="118" />
        {/* Top goal area */}
        <rect x="308" y="12" width="184" height="48" />
        {/* Bottom penalty area */}
        <rect x="218" y="400" width="364" height="118" />
        {/* Bottom goal area */}
        <rect x="308" y="470" width="184" height="48" />
        {/* Top penalty arc (outside penalty box) */}
        <path d="M 328 130 A 72 72 0 0 1 472 130" />
        {/* Bottom penalty arc */}
        <path d="M 328 400 A 72 72 0 0 0 472 400" />
        {/* Corner arcs */}
        <path d="M 22 36 A 18 18 0 0 0 40 12" />
        <path d="M 762 12 A 18 18 0 0 0 778 36" />
        <path d="M 778 494 A 18 18 0 0 0 760 518" />
        <path d="M 40 518 A 18 18 0 0 0 22 494" />
      </g>
      {/* Spots and dots */}
      <circle cx="400" cy="265" r="4.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="400" cy="88" r="3.5" fill="rgba(255,255,255,0.45)" />
      <circle cx="400" cy="442" r="3.5" fill="rgba(255,255,255,0.45)" />
      {/* Goals */}
      <rect x="330" y="6" width="140" height="8" fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <rect x="330" y="516" width="140" height="8" fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
    </svg>
  );
}

export function StatsPitch({ rows }: { rows: PitchRow[] }) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 16,
      overflow: "hidden",
      border: "2px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      {/* Grass stripes */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          repeating-linear-gradient(
            180deg,
            rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 44px,
            transparent 44px, transparent 88px
          ),
          linear-gradient(180deg,
            #1a5e2a 0%,
            #1d6a2f 20%,
            #1a5e2a 40%,
            #1d6a2f 60%,
            #1a5e2a 80%,
            #1d6a2f 100%
          )
        `,
      }} />

      <PitchMarkings />

      {/* Rows */}
      <div style={{ position: "relative", zIndex: 1, padding: "20px 12px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {rows.map((row) => (
            <div key={row.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
                textShadow: "0 1px 4px rgba(0,0,0,0.9)",
              }}>
                {row.label}
              </div>
              <div style={{
                display: "flex", justifyContent: "center",
                gap: row.players.length >= 4 ? 6 : row.players.length === 1 ? 0 : 14,
                flexWrap: "nowrap",
              }}>
                {row.players.map((tile, i) => (
                  <PlayerCard key={`${tile.name}-${i}`} tile={tile} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
