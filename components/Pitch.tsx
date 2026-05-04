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

function PlayerCard({ tile }: { tile: PlayerTile }) {
  const photoUrl = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${tile.photoId}.png`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 72 }}>
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={tile.name}
          width={48}
          height={60}
          style={{ borderRadius: 6, objectFit: "cover", display: "block" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        {tile.badge && (
          <span style={{
            position: "absolute", top: -6, right: -6,
            fontSize: tile.badgeGold ? 16 : 13,
          }}>
            {tile.badge}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#fff",
        textAlign: "center", lineHeight: 1.2,
        maxWidth: "100%", overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap",
        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
      }}>
        {tile.name.split(" ").slice(-1)[0]}
      </div>
      <div style={{
        fontSize: 9, color: "rgba(255,255,255,0.6)",
        textAlign: "center", lineHeight: 1,
      }}>
        {tile.club}
      </div>
    </div>
  );
}

export function StatsPitch({ rows }: { rows: PitchRow[] }) {
  return (
    <div style={{
      borderRadius: 12,
      overflow: "hidden",
      background: "linear-gradient(180deg, #166534 0%, #15803d 40%, #16a34a 60%, #15803d 100%)",
      border: "2px solid rgba(255,255,255,0.1)",
      padding: "20px 12px",
    }}>
      {/* Centre line */}
      <div style={{
        borderTop: "1px dashed rgba(255,255,255,0.2)",
        marginBottom: 20,
      }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
            }}>
              {row.label}
            </div>
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: row.players.length > 3 ? 8 : 16,
              flexWrap: "wrap",
            }}>
              {row.players.map((tile, i) => (
                <PlayerCard key={`${tile.name}-${i}`} tile={tile} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom arc */}
      <div style={{
        borderTop: "1px dashed rgba(255,255,255,0.2)",
        marginTop: 20,
      }} />
    </div>
  );
}
