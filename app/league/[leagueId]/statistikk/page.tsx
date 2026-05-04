"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchManagerHistory, fetchManagerTransfers, ManagerGWEntry, TransferItem } from "@/lib/fpl";
import { StatsPitch, PitchRow, avatarHex } from "@/components/Pitch";

type Player = { id: string; name: string; fplTeamId?: number };

type StatPlayer = {
  elementId: number;
  owned: number;
  captained: number;
  name: string;
  code: number;
  club: string;
  role: string;
};

function ins(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Season Race ────────────────────────────────────────────────────────────────

type CursorGW = { gw: number; svgX: number };
type Vp = { x0: number; x1: number; y0: number; y1: number };

const SVG_W = 600, SVG_H = 280, SVG_ML = 44, SVG_MR = 96, SVG_MT = 16, SVG_MB = 30;
const SVG_CW = SVG_W - SVG_ML - SVG_MR;
const SVG_CH = SVG_H - SVG_MT - SVG_MB;

function SeasonChart({
  players,
  histories,
}: {
  players: Player[];
  histories: Record<string, ManagerGWEntry[]>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<CursorGW | null>(null);
  const [vp, setVp] = useState<Vp | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const vpRef = useRef<Vp | null>(null);
  const defVpRef = useRef<Vp>({ x0: 0, x1: 38, y0: 0, y1: 2000 });
  const dragRef = useRef<{ cx: number; cy: number; vp: Vp } | null>(null);
  const pinchRef = useRef<{ dist: number; sx: number; sy: number } | null>(null);
  const cursorRef = useRef<CursorGW | null>(null);
  const allGwsRef = useRef<number[]>([]);

  const allGws = useMemo(() => {
    const set = new Set<number>();
    Object.values(histories).forEach((h) => h.forEach((e) => set.add(e.event)));
    return [...set].sort((a, b) => a - b);
  }, [histories]);

  const withData = useMemo(
    () => players.filter((p) => p.fplTeamId && (histories[p.id]?.length ?? 0) > 0),
    [players, histories]
  );

  const ranked = useMemo(
    () =>
      [...withData].sort((a, b) => {
        const aMax = Math.max(...(histories[a.id]?.map((e) => e.total_points) ?? [0]));
        const bMax = Math.max(...(histories[b.id]?.map((e) => e.total_points) ?? [0]));
        return bMax - aMax;
      }),
    [withData, histories]
  );

  vpRef.current = vp;
  cursorRef.current = cursor;
  allGwsRef.current = allGws;

  const allPts = withData.flatMap((p) => histories[p.id]!.map((e) => e.total_points));
  const maxPts = Math.max(...allPts, 1);
  const minPts = Math.min(...allPts, 0);
  const spread = Math.max(maxPts - minPts, 1);

  const defVp: Vp = {
    x0: (allGws[0] ?? 1) - 0.3,
    x1: (allGws[allGws.length - 1] ?? 1) + 0.3,
    y0: 0,
    y1: maxPts + spread * 0.05,
  };
  defVpRef.current = defVp;

  const cv = vp ?? defVp;

  const xOf = (gw: number) => SVG_ML + ((gw - cv.x0) / (cv.x1 - cv.x0)) * SVG_CW;
  const yOf = (pts: number) => SVG_MT + SVG_CH - ((pts - cv.y0) / (cv.y1 - cv.y0)) * SVG_CH;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const toSvgPos = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * SVG_W,
        y: ((clientY - r.top) / r.height) * SVG_H,
      };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = toSvgPos(e.clientX, e.clientY);
      const delta = e.deltaMode === 0 ? e.deltaY / 200 : e.deltaY * 0.15;
      const zf = Math.pow(1.1, delta);
      const c = vpRef.current ?? defVpRef.current;
      const mx = c.x0 + ((x - SVG_ML) / SVG_CW) * (c.x1 - c.x0);
      const my = c.y0 + ((SVG_MT + SVG_CH - y) / SVG_CH) * (c.y1 - c.y0);
      const next: Vp = {
        x0: mx + (c.x0 - mx) * zf,
        x1: mx + (c.x1 - mx) * zf,
        y0: my + (c.y0 - my) * zf,
        y1: my + (c.y1 - my) * zf,
      };
      if (next.x1 - next.x0 < 0.4 || next.y1 - next.y0 < 10) return;
      vpRef.current = next;
      setVp(next);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        dragRef.current = null;
        const { x, y } = toSvgPos(
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2
        );
        pinchRef.current = {
          dist: Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          ),
          sx: x, sy: y,
        };
      } else if (e.touches.length === 1) {
        dragRef.current = { cx: e.touches[0].clientX, cy: e.touches[0].clientY, vp: vpRef.current ?? defVpRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && pinchRef.current) {
        const newDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const zf = pinchRef.current.dist / Math.max(newDist, 1);
        pinchRef.current.dist = newDist;
        const c = vpRef.current ?? defVpRef.current;
        const { sx, sy } = pinchRef.current;
        const mx = c.x0 + ((sx - SVG_ML) / SVG_CW) * (c.x1 - c.x0);
        const my = c.y0 + ((SVG_MT + SVG_CH - sy) / SVG_CH) * (c.y1 - c.y0);
        const next: Vp = {
          x0: mx + (c.x0 - mx) * zf,
          x1: mx + (c.x1 - mx) * zf,
          y0: my + (c.y0 - my) * zf,
          y1: my + (c.y1 - my) * zf,
        };
        if (next.x1 - next.x0 >= 0.4 && next.y1 - next.y0 >= 10) {
          vpRef.current = next;
          setVp(next);
        }
      } else if (e.touches.length === 1 && dragRef.current) {
        const { cx, cy, vp: dv } = dragRef.current;
        const r = el.getBoundingClientRect();
        const dSvgX = ((e.touches[0].clientX - cx) / r.width) * SVG_W;
        const dSvgY = ((e.touches[0].clientY - cy) / r.height) * SVG_H;
        const next: Vp = {
          x0: dv.x0 - (dSvgX / SVG_CW) * (dv.x1 - dv.x0),
          x1: dv.x1 - (dSvgX / SVG_CW) * (dv.x1 - dv.x0),
          y0: dv.y0 + (dSvgY / SVG_CH) * (dv.y1 - dv.y0),
          y1: dv.y1 + (dSvgY / SVG_CH) * (dv.y1 - dv.y0),
        };
        vpRef.current = next;
        setVp(next);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (
        e.changedTouches.length === 1 &&
        dragRef.current !== null &&
        pinchRef.current === null
      ) {
        const dx = e.changedTouches[0].clientX - dragRef.current.cx;
        const dy = e.changedTouches[0].clientY - dragRef.current.cy;
        if (Math.hypot(dx, dy) < 8) {
          const r = el.getBoundingClientRect();
          const sx = ((e.changedTouches[0].clientX - r.left) / r.width) * SVG_W;
          const c = vpRef.current ?? defVpRef.current;
          const gws = allGwsRef.current;
          const visible = gws.filter((gw) => gw >= c.x0 - 0.5 && gw <= c.x1 + 0.5);
          if (visible.length > 0) {
            const xOfGw = (gw: number) => SVG_ML + ((gw - c.x0) / (c.x1 - c.x0)) * SVG_CW;
            const nearest = visible.reduce((best, gw) =>
              Math.abs(xOfGw(gw) - sx) < Math.abs(xOfGw(best) - sx) ? gw : best
            );
            if (cursorRef.current?.gw === nearest) {
              setCursor(null);
            } else {
              setCursor({ gw: nearest, svgX: xOfGw(nearest) });
            }
          }
          dragRef.current = null;
          pinchRef.current = null;
          return;
        }
      }
      dragRef.current = null;
      pinchRef.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => setFullscreen(false));
    } else if (document.fullscreenEnabled) {
      containerRef.current.requestFullscreen().catch(() => setFullscreen((f) => !f));
    } else {
      setFullscreen((f) => !f);
    }
  };

  if (allGws.length === 0) {
    return <div style={{ color: "var(--muted)", fontSize: 14 }}>Ingen GW-data funnet ennå.</div>;
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const sy = ((e.clientY - rect.top) / rect.height) * SVG_H;
    if (sx < SVG_ML || sx > SVG_W - SVG_MR || sy < SVG_MT || sy > SVG_H - SVG_MB) return;
    const startVp = vpRef.current ?? defVpRef.current;
    dragRef.current = { cx: e.clientX, cy: e.clientY, vp: startVp };
    setDragging(true);
    setCursor(null);
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const { cx, cy, vp: dv } = dragRef.current;
      const r = svgRef.current!.getBoundingClientRect();
      const dSvgX = ((me.clientX - cx) / r.width) * SVG_W;
      const dSvgY = ((me.clientY - cy) / r.height) * SVG_H;
      const next: Vp = {
        x0: dv.x0 - (dSvgX / SVG_CW) * (dv.x1 - dv.x0),
        x1: dv.x1 - (dSvgX / SVG_CW) * (dv.x1 - dv.x0),
        y0: dv.y0 + (dSvgY / SVG_CH) * (dv.y1 - dv.y0),
        y1: dv.y1 + (dSvgY / SVG_CH) * (dv.y1 - dv.y0),
      };
      vpRef.current = next;
      setVp(next);
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const visible = allGws.filter((gw) => gw >= cv.x0 - 0.5 && gw <= cv.x1 + 0.5);
    if (!visible.length) return;
    const nearest = visible.reduce((best, gw) =>
      Math.abs(xOf(gw) - sx) < Math.abs(xOf(best) - sx) ? gw : best
    );
    setCursor({ gw: nearest, svgX: xOf(nearest) });
  };

  const visibleGws = allGws.filter((gw) => gw >= cv.x0 - 0.5 && gw <= cv.x1 + 0.5);
  const pxPerGw = SVG_CW / Math.max(cv.x1 - cv.x0, 1);
  const labelStep = pxPerGw > 38 ? 1 : pxPerGw > 20 ? 2 : Math.ceil(32 / Math.max(pxPerGw, 1));
  const gwLabels = visibleGws.filter((gw) => (gw - (allGws[0] ?? 0)) % labelStep === 0);

  const yTickValues = Array.from({ length: 6 }, (_, i) =>
    Math.round(cv.y0 + ((cv.y1 - cv.y0) / 5) * i)
  );

  const tooltipRows = (cursor && !dragging)
    ? withData
        .map((p) => {
          const entry = histories[p.id]?.find((e) => e.event === cursor.gw);
          return entry
            ? { id: p.id, name: p.name.split(" ")[0], gwPts: entry.points, total: entry.total_points }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0)) as {
          id: string; name: string; gwPts: number; total: number;
        }[]
    : [];

  const ROW_H = 17, TIP_W = 154;
  const TIP_H = 22 + tooltipRows.length * ROW_H + 2;
  const tipX = cursor ? (cursor.svgX > SVG_W * 0.55 ? SVG_ML + 4 : cursor.svgX + 14) : 0;
  const isZoomed = vp !== null;

  return (
    <div
      ref={containerRef}
      style={fullscreen ? {
        position: "fixed", inset: 0, zIndex: 1000,
        background: "#0b1120",
        padding: "12px 16px",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      } : {}}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", userSelect: "none" }}>
          ↕↔ Scroll/pinch for å zoome · Dra for å panorere
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {isZoomed && (
            <button
              onClick={() => { setVp(null); setDragging(false); }}
              style={{
                padding: "4px 11px", borderRadius: 7, border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.05)", color: "var(--muted)",
                fontWeight: 600, fontSize: 11, cursor: "pointer",
              }}
            >
              Tilbakestill
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            title={fullscreen ? "Lukk fullskjerm" : "Fullskjerm"}
            style={{
              padding: "4px 9px", borderRadius: 7, border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.05)", color: "var(--muted)",
              fontWeight: 600, fontSize: 13, cursor: "pointer", lineHeight: 1,
            }}
          >
            {fullscreen ? "✕" : "⛶"}
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          width: "100%", display: "block",
          cursor: dragging ? "grabbing" : "crosshair",
          touchAction: "none", userSelect: "none",
          ...(fullscreen ? { height: "calc(100svh - 90px)" } : {}),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (!dragging) setCursor(null); }}
      >
        <defs>
          <clipPath id="sc-clip">
            <rect x={SVG_ML} y={SVG_MT} width={SVG_CW} height={SVG_CH} />
          </clipPath>
        </defs>

        {yTickValues.map((pts) => {
          const y = yOf(pts);
          if (y < SVG_MT - 2 || y > SVG_H - SVG_MB + 2) return null;
          return (
            <g key={pts}>
              <line x1={SVG_ML} y1={y} x2={SVG_W - SVG_MR} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={SVG_ML - 4} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.28)">
                {pts}
              </text>
            </g>
          );
        })}

        {gwLabels.map((gw) => (
          <text key={gw} x={xOf(gw)} y={SVG_H - 4}
            textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.28)">
            GW{gw}
          </text>
        ))}

        {cursor && !dragging && (
          <line
            x1={cursor.svgX} y1={SVG_MT} x2={cursor.svgX} y2={SVG_H - SVG_MB}
            stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3,3"
          />
        )}

        <g clipPath="url(#sc-clip)">
          {withData.map((p) => {
            const color = avatarHex(p.id);
            const hist = histories[p.id]!;
            const pts = allGws
              .map((gw) => hist.find((e) => e.event === gw))
              .filter(Boolean) as ManagerGWEntry[];
            if (pts.length === 0) return null;

            const polyPts = pts.map((e) => `${xOf(e.event)},${yOf(e.total_points)}`).join(" ");
            const hasCursor = !!cursor && !dragging;
            const hasMatch = hasCursor && pts.some((e) => e.event === cursor!.gw);

            return (
              <g key={p.id}>
                <polyline
                  points={polyPts}
                  fill="none" stroke={color}
                  strokeWidth={hasMatch ? "2.5" : "2"}
                  strokeLinejoin="round" strokeLinecap="round"
                  opacity={hasCursor ? (hasMatch ? 1 : 0.15) : 0.85}
                />
                {pts.map((e) => {
                  const active = cursor?.gw === e.event && !dragging;
                  return (
                    <circle key={e.event}
                      cx={xOf(e.event)} cy={yOf(e.total_points)}
                      r={active ? 5.5 : 3}
                      fill={color}
                      stroke={active ? "#fff" : "none"} strokeWidth="1.5"
                      opacity={hasCursor ? (active ? 1 : 0.12) : 0.9}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>

        {withData.map((p) => {
          const hist = histories[p.id]!;
          const last = [...hist].sort((a, b) => b.event - a.event)[0];
          if (!last) return null;
          const lx = xOf(last.event) + 8;
          const ly = yOf(last.total_points) + 4;
          if (lx < SVG_ML || lx > SVG_W - 4 || ly < SVG_MT || ly > SVG_H - SVG_MB) return null;
          return (
            <text key={p.id} x={lx} y={ly}
              fontSize="10" fontWeight="700" fill={avatarHex(p.id)}
              opacity={cursor && !dragging ? 0.2 : 1}>
              {p.name.split(" ")[0]}
            </text>
          );
        })}

        {cursor && !dragging && tooltipRows.length > 0 && (
          <g style={{ pointerEvents: "none" }}>
            <rect x={tipX} y={SVG_MT} width={TIP_W} height={TIP_H}
              rx="6" fill="#080f1e" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <text x={tipX + 10} y={SVG_MT + 14}
              fontSize="10" fontWeight="700" letterSpacing="0.07em" fill="rgba(255,255,255,0.45)">
              GW {cursor.gw}
            </text>
            {tooltipRows.map((row, i) => {
              const color = avatarHex(row.id);
              const ry = SVG_MT + 22 + i * ROW_H;
              return (
                <g key={row.id}>
                  <circle cx={tipX + 9} cy={ry + 4} r="3.5" fill={color} />
                  <text x={tipX + 18} y={ry + 8} fontSize="10" fontWeight="600" fill="rgba(255,255,255,0.82)">
                    {row.name}
                  </text>
                  <text x={tipX + TIP_W - 42} y={ry + 8}
                    textAnchor="end" fontSize="10" fontWeight="700" fill={color}>
                    +{row.gwPts}
                  </text>
                  <text x={tipX + TIP_W - 6} y={ry + 8}
                    textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">
                    {row.total}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {!fullscreen && <div style={{ marginTop: 20, display: "flex", flexDirection: "column" }}>
        {ranked.map((p, i) => {
          const hist = histories[p.id] ?? [];
          const total = hist.length > 0 ? Math.max(...hist.map((e) => e.total_points)) : 0;
          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 0", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ width: 20, textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
                {i + 1}.
              </span>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                backgroundColor: avatarHex(p.id),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 10,
              }}>
                {ins(p.name)}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{p.name}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{hist.length} GWs</span>
              <span style={{
                fontSize: 15, fontWeight: 800, color: "var(--accent)",
                fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-head, inherit)",
              }}>
                {total}
              </span>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

// ── Transfers ─────────────────────────────────────────────────────────────────

type TransferGain = {
  playerName: string;
  elementIn: string;
  elementOut: string;
  ptsIn: number;
  ptsOut: number;
  net: number;
};

type NetTransferPair = {
  elementOut: TransferItem["elementOut"];
  elementIn:  TransferItem["elementIn"];
  costIn: number;
};

function computeNetTransfers(transfers: TransferItem[]): { net: NetTransferPair[]; redundant: TransferItem[] } {
  if (transfers.length === 0) return { net: [], redundant: [] };

  const soldFor    = new Map<number, number>();
  const infoById   = new Map<number, TransferItem["elementIn"]>();
  const costByInId = new Map<number, number>();

  for (const t of transfers) {
    soldFor.set(t.elementOut.id, t.elementIn.id);
    infoById.set(t.elementOut.id, t.elementOut);
    infoById.set(t.elementIn.id,  t.elementIn);
    costByInId.set(t.elementIn.id, t.costIn);
  }

  const inIds  = new Set(transfers.map((t) => t.elementIn.id));
  const outIds = new Set(transfers.map((t) => t.elementOut.id));

  const transit    = new Set([...inIds].filter((id) => outIds.has(id)));
  const chainHeads = [...outIds].filter((id) => !inIds.has(id));

  const net: NetTransferPair[] = [];
  for (const headId of chainHeads) {
    const visited = new Set<number>();
    let finalIn = soldFor.get(headId)!;
    while (transit.has(finalIn) && soldFor.has(finalIn) && !visited.has(finalIn)) {
      visited.add(finalIn);
      finalIn = soldFor.get(finalIn)!;
    }
    if (transit.has(finalIn)) continue;
    net.push({
      elementOut: infoById.get(headId)    as TransferItem["elementOut"],
      elementIn:  infoById.get(finalIn)   as TransferItem["elementIn"],
      costIn:     costByInId.get(finalIn) ?? 0,
    });
  }

  const redundant = transfers.filter((t) => transit.has(t.elementIn.id) || transit.has(t.elementOut.id));
  return { net, redundant };
}

function TransfersView({ players }: { players: Player[] }) {
  const [allTransfers, setAllTransfers] = useState<Record<string, TransferItem[]>>({});
  const [gwPoints, setGwPoints] = useState<Record<number, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);
  const [loadingPoints, setLoadingPoints] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const withFpl = players.filter((p) => p.fplTeamId);
      if (withFpl.length === 0) { setLoading(false); return; }

      try {
        const results = await Promise.all(
          withFpl.map(async (p) => {
            const transfers = await fetchManagerTransfers(p.fplTeamId!);
            return [p.id, transfers] as [string, TransferItem[]];
          })
        );
        const transferMap = Object.fromEntries(results);
        setAllTransfers(transferMap);
        setLoading(false);

        const allItems = Object.values(transferMap).flat();
        const uniqueGws = [...new Set(allItems.map((t) => t.event))];
        if (uniqueGws.length === 0) return;

        setLoadingPoints(true);
        const CHUNK = 5;
        const pointsMap: Record<number, Record<number, number>> = {};
        for (let i = 0; i < uniqueGws.length; i += CHUNK) {
          const chunk = await Promise.all(
            uniqueGws.slice(i, i + CHUNK).map(async (gw) => {
              try {
                const res = await fetch(`/api/fpl/gw-live?gw=${gw}`, { cache: "no-store" });
                return [gw, res.ok ? await res.json() : {}] as [number, Record<number, number>];
              } catch {
                return [gw, {}] as [number, Record<number, number>];
              }
            })
          );
          for (const [gw, pts] of chunk) pointsMap[gw] = pts;
          setGwPoints({ ...pointsMap });
        }
        setLoadingPoints(false);
      } catch {
        setLoading(false);
      }
    };
    void load();
  }, [players]);

  const byGw = useMemo(() => {
    const map = new Map<number, { player: Player; transfers: TransferItem[] }[]>();
    players.filter((p) => p.fplTeamId).forEach((p) => {
      const ts = allTransfers[p.id] ?? [];
      for (const t of ts) {
        if (!map.has(t.event)) map.set(t.event, []);
        const existing = map.get(t.event)!.find((x) => x.player.id === p.id);
        if (existing) {
          existing.transfers.push(t);
        } else {
          map.get(t.event)!.push({ player: p, transfers: [t] });
        }
      }
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [allTransfers, players]);

  const bestWorstByGw = useMemo(() => {
    const result: Record<number, { best: TransferGain | null; worst: TransferGain | null }> = {};
    for (const [gw, playerTransfers] of byGw) {
      const pts = gwPoints[gw];
      if (!pts || Object.keys(pts).length === 0) continue;
      let best: TransferGain | null = null;
      let worst: TransferGain | null = null;
      for (const { player, transfers } of playerTransfers) {
        const { net: netPairs } = computeNetTransfers(transfers);
        for (const t of netPairs) {
          const ptsIn  = pts[t.elementIn.id]  ?? null;
          const ptsOut = pts[t.elementOut.id] ?? null;
          if (ptsIn === null || ptsOut === null) continue;
          const net = ptsIn - ptsOut;
          const gain: TransferGain = {
            playerName: player.name.split(" ")[0],
            elementIn:  t.elementIn.name,
            elementOut: t.elementOut.name,
            ptsIn, ptsOut, net,
          };
          if (!best || net > best.net) best = gain;
          if (!worst || net < worst.net) worst = gain;
        }
      }
      result[gw] = { best, worst };
    }
    return result;
  }, [byGw, gwPoints]);

  if (loading) {
    return <div style={{ color: "var(--muted)", fontSize: 14 }}>Henter overganger…</div>;
  }
  if (byGw.length === 0) {
    return <div style={{ color: "var(--muted)", fontSize: 14 }}>Ingen overganger registrert ennå.</div>;
  }

  const chip = (green: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 8px", borderRadius: 99,
    background: green ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${green ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
    fontSize: 11, fontWeight: green ? 600 : 500,
    color: green ? "#22c55e" : "var(--muted)",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {byGw.map(([gw, playerTransfers]) => {
        const bw = bestWorstByGw[gw];
        return (
          <div
            key={gw}
            style={{
              borderRadius: 12, border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.02)", overflow: "hidden",
            }}
          >
            <div style={{
              padding: "10px 16px", background: "rgba(0,0,0,0.2)",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: bw?.best ? 10 : 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "var(--accent)" }} />
                <span style={{
                  fontFamily: "var(--font-head, inherit)", fontWeight: 700,
                  fontSize: 13, color: "var(--text)",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  Gameweek {gw}
                </span>
                {loadingPoints && !bw?.best && (
                  <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto", fontStyle: "italic" }}>
                    beregner…
                  </span>
                )}
              </div>

              {bw?.best && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span>🏆</span>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>{bw.best.playerName}</span>
                    <span style={{ color: "var(--muted)" }}>
                      {bw.best.elementIn} ↑ ({bw.best.ptsIn}p) / {bw.best.elementOut} ↓ ({bw.best.ptsOut}p)
                    </span>
                    <span style={{
                      marginLeft: "auto", fontWeight: 800, fontSize: 12,
                      color: bw.best.net >= 0 ? "#22c55e" : "#f87171",
                    }}>
                      {bw.best.net >= 0 ? "+" : ""}{bw.best.net}
                    </span>
                  </div>
                  {bw.worst && bw.worst !== bw.best && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <span>💀</span>
                      <span style={{ color: "#f87171", fontWeight: 700 }}>{bw.worst.playerName}</span>
                      <span style={{ color: "var(--muted)" }}>
                        {bw.worst.elementIn} ↑ ({bw.worst.ptsIn}p) / {bw.worst.elementOut} ↓ ({bw.worst.ptsOut}p)
                      </span>
                      <span style={{
                        marginLeft: "auto", fontWeight: 800, fontSize: 12,
                        color: bw.worst.net >= 0 ? "#22c55e" : "#f87171",
                      }}>
                        {bw.worst.net >= 0 ? "+" : ""}{bw.worst.net}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {playerTransfers.map(({ player, transfers }) => {
                const { net: netPairs, redundant } = computeNetTransfers(transfers);
                return (
                  <div key={player.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: avatarHex(player.id),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: 10, marginTop: 2,
                    }}>
                      {ins(player.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                        {player.name.split(" ")[0]}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {netPairs.map((t, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={chip(true)}>
                              ↑ {t.elementIn.name}
                              <span style={{ opacity: 0.6, fontSize: 9 }}>{t.elementIn.role}</span>
                            </span>
                            <span style={chip(false)}>
                              ↓ {t.elementOut.name}
                              <span style={{ opacity: 0.6, fontSize: 9 }}>{t.elementOut.role}</span>
                            </span>
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>
                              £{(t.costIn / 10).toFixed(1)}m
                            </span>
                          </div>
                        ))}
                        {netPairs.length === 0 && redundant.length > 0 && (
                          <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                            Ingen faktiske overganger
                          </span>
                        )}
                      </div>

                      {redundant.length > 0 && (
                        <div style={{ marginTop: 8, opacity: 0.45 }}>
                          <div style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                            textTransform: "uppercase", color: "var(--muted)", marginBottom: 5,
                          }}>
                            Redundante overganger
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {redundant.map((t, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={chip(true)}>
                                  ↑ {t.elementIn.name}
                                  <span style={{ opacity: 0.6, fontSize: 9 }}>{t.elementIn.role}</span>
                                </span>
                                <span style={chip(false)}>
                                  ↓ {t.elementOut.name}
                                  <span style={{ opacity: 0.6, fontSize: 9 }}>{t.elementOut.role}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dream Team ────────────────────────────────────────────────────────────────

function DreamTeamView({ players }: { players: Player[] }) {
  const [stats, setStats] = useState<StatPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const withFpl = players.filter((p) => p.fplTeamId);
      if (withFpl.length === 0) { setLoading(false); return; }
      const teamIds = withFpl.map((p) => p.fplTeamId).join(",");
      try {
        const res = await fetch(`/api/fpl/league/stats?teamIds=${teamIds}`, { cache: "no-store" });
        if (res.ok) setStats(await res.json());
      } catch {
        // silently ignore
      }
      setLoading(false);
    };
    void load();
  }, [players]);

  const bestXI = useMemo(() => {
    const top = (role: string, n: number) =>
      stats.filter((p) => p.role === role).slice(0, n);
    return {
      gk:  top("GK",  1),
      def: top("DEF", 4),
      mid: top("MID", 3),
      fwd: top("FWD", 3),
    };
  }, [stats]);

  const topCaptained = useMemo(
    () =>
      [...stats]
        .filter((p) => p.captained > 0)
        .sort((a, b) => b.captained - a.captained)
        .slice(0, 5),
    [stats]
  );

  const mostCaptainedId = topCaptained[0]?.elementId ?? null;

  if (loading) {
    return <div style={{ color: "var(--muted)", fontSize: 14 }}>Beregner mest brukte laget (kan ta noen sekunder)</div>;
  }
  if (stats.length === 0) {
    return <div style={{ color: "var(--muted)", fontSize: 14 }}>Ingen data ennå.</div>;
  }

  const toTile = (p: StatPlayer) => ({
    name: p.name,
    photoId: p.code,
    club: p.club,
    badge: p.elementId === mostCaptainedId ? "🎖" : undefined,
    badgeGold: p.elementId === mostCaptainedId,
  });

  const pitchRows: PitchRow[] = [
    { label: "Angrep",   players: bestXI.fwd.map(toTile) },
    { label: "Midtbane", players: bestXI.mid.map(toTile) },
    { label: "Forsvar",  players: bestXI.def.map(toTile) },
    { label: "Keeper",   players: bestXI.gk.map(toTile) },
  ];

  return (
    <div>
      <StatsPitch rows={pitchRows} />

      {topCaptained.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            color: "var(--muted)", textTransform: "uppercase", marginBottom: 12,
          }}>
            Mest valgt som kaptein
          </div>
          {topCaptained.map((p, i) => (
            <div
              key={p.elementId}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0", borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ width: 24, textAlign: "center", fontSize: 14 }}>
                {i === 0 ? "🎖" : `${i + 1}.`}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {p.name}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.club}</span>
              <span style={{
                fontSize: 15, fontWeight: 800, color: "#f59e0b",
                fontVariantNumeric: "tabular-nums",
                fontFamily: "var(--font-head, inherit)",
              }}>
                {p.captained}×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = ["Sesongløpet", "Overganger", "Mest brukte laget"] as const;
type Tab = (typeof TABS)[number];

export default function StatistikkPage() {
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [tab, setTab] = useState<Tab>("Sesongløpet");
  const [players, setPlayers] = useState<Player[]>([]);
  const [histories, setHistories] = useState<Record<string, ManagerGWEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "leagues", leagueId, "players"));
        const data = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? d.id,
          fplTeamId: d.data().fplTeamId as number | undefined,
        }));
        setPlayers(data);

        const withFpl = data.filter((p) => p.fplTeamId);
        if (withFpl.length > 0) {
          const results = await Promise.all(
            withFpl.map(async (p) => {
              const hist = await fetchManagerHistory(p.fplTeamId!);
              return [p.id, hist] as [string, ManagerGWEntry[]];
            })
          );
          setHistories(Object.fromEntries(results));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [leagueId]);

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "7px 16px",
    borderRadius: 8,
    border: "1px solid",
    borderColor: tab === t ? "var(--accent)" : "var(--border)",
    background: tab === t ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.04)",
    color: tab === t ? "var(--accent)" : "var(--muted)",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.12s",
  });

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="section-title">
        <h1><span>📈</span> Statistikk</h1>
        <p>Sesongens løp, overganger og mest brukte laget.</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: "var(--muted)", fontSize: 14 }}>Henter spillerdata…</div>
        ) : (
          <>
            {tab === "Sesongløpet" && (
              <SeasonChart players={players} histories={histories} />
            )}
            {tab === "Overganger" && <TransfersView players={players} />}
            {tab === "Mest brukte laget" && <DreamTeamView players={players} />}
          </>
        )}
      </div>
    </section>
  );
}
