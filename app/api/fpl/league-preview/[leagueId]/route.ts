import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;

  const res = await fetch(
    `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "FPL league not found" }, { status: 404 });
  }

  const data = await res.json();

  return NextResponse.json({
    leagueName: data.league.name as string,
    managers: (
      data.standings.results as { player_name: string; entry: number }[]
    ).map((r) => ({ name: r.player_name, entry: r.entry })),
  });
}
