import { NextResponse } from "next/server";
import { fetchBootstrapCached } from "@/lib/fpl-server";

type PickEntry = { element: number; position: number; is_captain: boolean };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamIdsParam = url.searchParams.get("teamIds");
  if (!teamIdsParam) {
    return NextResponse.json({ error: "Missing teamIds" }, { status: 400 });
  }

  const teamIds = teamIdsParam
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);

  if (teamIds.length === 0) {
    return NextResponse.json({ error: "No valid teamIds" }, { status: 400 });
  }

  const bs = await fetchBootstrapCached() as {
    events:   { id: number; finished: boolean; is_current: boolean }[];
    teams:    { id: number; short_name: string }[];
    elements: { id: number; code: number; web_name: string; team: number; element_type: number }[];
  };

  const finishedGWs = bs.events
    .filter((e) => e.finished || e.is_current)
    .map((e) => e.id);

  if (finishedGWs.length === 0) {
    return NextResponse.json([]);
  }

  const owned = new Map<number, number>();
  const captained = new Map<number, number>();

  // Batch to avoid overwhelming the FPL API
  const CHUNK = 20;
  const tasks: (() => Promise<void>)[] = teamIds.flatMap((teamId) =>
    finishedGWs.map((gw) => async () => {
      try {
        const res = await fetch(
          `https://fantasy.premierleague.com/api/entry/${teamId}/event/${gw}/picks/`,
          { cache: "force-cache", headers: { "User-Agent": "Mozilla/5.0" } }
        );
        if (!res.ok) return;
        const data = await res.json();
        for (const pick of data.picks as PickEntry[]) {
          if (pick.position <= 11) {
            owned.set(pick.element, (owned.get(pick.element) ?? 0) + 1);
          }
          if (pick.is_captain) {
            captained.set(pick.element, (captained.get(pick.element) ?? 0) + 1);
          }
        }
      } catch {
        // skip failed
      }
    })
  );

  for (let i = 0; i < tasks.length; i += CHUNK) {
    await Promise.all(tasks.slice(i, i + CHUNK).map((fn) => fn()));
  }

  const teamMap = new Map<number, string>(
    (bs.teams as { id: number; short_name: string }[]).map((t) => [t.id, t.short_name])
  );

  const elemMap = new Map<number, { name: string; code: number; club: string; role: string }>(
    (
      bs.elements as {
        id: number;
        code: number;
        web_name: string;
        team: number;
        element_type: number;
      }[]
    ).map((e) => [
      e.id,
      {
        name: e.web_name,
        code: e.code,
        club: teamMap.get(e.team) ?? "",
        role:
          e.element_type === 1 ? "GK" : e.element_type === 2 ? "DEF" : e.element_type === 3 ? "MID" : "FWD",
      },
    ])
  );

  const result = [...owned.entries()]
    .map(([id, count]) => ({
      elementId: id,
      owned: count,
      captained: captained.get(id) ?? 0,
      ...(elemMap.get(id) ?? { name: `#${id}`, code: 0, club: "", role: "" }),
    }))
    .sort((a, b) => b.owned - a.owned);

  return NextResponse.json(result);
}
