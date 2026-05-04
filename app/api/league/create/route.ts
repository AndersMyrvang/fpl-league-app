import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fplLeagueId, leagueName } = body as {
    fplLeagueId: unknown;
    leagueName: unknown;
  };

  if (!fplLeagueId || !leagueName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const leagueId = String(Number(fplLeagueId));

  // Check for duplicate — doc existence is instant, no index needed
  const existing = await adminDb.collection("leagues").doc(leagueId).get();
  if (existing.exists) {
    return NextResponse.json(
      { error: "already_exists", leagueId },
      { status: 409 }
    );
  }

  const fplRes = await fetch(
    `https://fantasy.premierleague.com/api/leagues-classic/${fplLeagueId}/standings/`,
    { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
  );

  if (!fplRes.ok) {
    return NextResponse.json({ error: "FPL league not found" }, { status: 404 });
  }

  const fplData = await fplRes.json();
  const managers = (
    fplData.standings.results as { player_name: string; entry: number }[]
  ).map((r) => ({ name: r.player_name, fplTeamId: r.entry }));

  const leagueRef = adminDb.collection("leagues").doc(leagueId);
  await leagueRef.set({
    name: leagueName,
    fplLeagueId: Number(fplLeagueId),
    createdAt: FieldValue.serverTimestamp(),
  });

  const batch = adminDb.batch();
  for (const manager of managers) {
    const playerRef = leagueRef.collection("players").doc(String(manager.fplTeamId));
    batch.set(playerRef, { name: manager.name, fplTeamId: manager.fplTeamId });
  }
  await batch.commit();

  return NextResponse.json({ leagueId });
}
