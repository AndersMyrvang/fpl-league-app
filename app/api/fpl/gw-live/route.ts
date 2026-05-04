import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const gw = new URL(req.url).searchParams.get("gw");
  const gwNum = Number(gw);
  if (!gwNum || isNaN(gwNum)) {
    return NextResponse.json({ error: "Missing or invalid gw" }, { status: 400 });
  }

  const res = await fetch(
    `https://fantasy.premierleague.com/api/event/${gwNum}/live/`,
    { next: { revalidate: 60 }, headers: { "User-Agent": "Mozilla/5.0" } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "FPL live API error" }, { status: res.status });
  }

  const data = await res.json();
  const points: Record<number, number> = {};
  for (const el of data.elements as { id: number; stats: { total_points: number } }[]) {
    points[el.id] = el.stats.total_points;
  }

  return NextResponse.json(points);
}
