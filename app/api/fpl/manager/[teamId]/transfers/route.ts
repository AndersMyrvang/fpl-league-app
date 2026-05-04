import { NextResponse } from "next/server";
import { fetchBootstrapCached } from "@/lib/fpl-server";

type FPLTransferRaw = {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const id = Number(teamId);

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const [transfersRes, bootstrap] = await Promise.all([
    fetch(`https://fantasy.premierleague.com/api/entry/${id}/transfers/`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    }),
    fetchBootstrapCached(),
  ]);

  if (!transfersRes.ok) {
    return NextResponse.json({ error: "FPL transfers API error" }, { status: transfersRes.status });
  }

  const transfers = (await transfersRes.json()) as FPLTransferRaw[];
  const bs = bootstrap as { teams: { id: number; short_name: string }[]; elements: { id: number; code: number; web_name: string; team: number; element_type: number }[] };

  const teamMap = new Map<number, string>(
    bs.teams.map((t) => [t.id, t.short_name])
  );

  const elemMap = new Map<number, { name: string; code: number; club: string; role: string }>(
    bs.elements.map((e) => [
      e.id,
      {
        name: e.web_name,
        code: e.code,
        club: teamMap.get(e.team) ?? "",
        role: e.element_type === 1 ? "GK" : e.element_type === 2 ? "DEF" : e.element_type === 3 ? "MID" : "FWD",
      },
    ])
  );

  const fallback = (id: number) => ({ name: `#${id}`, code: 0, club: "", role: "" });

  const result = transfers.map((t) => ({
    event: t.event,
    elementIn:  { id: t.element_in,  ...(elemMap.get(t.element_in)  ?? fallback(t.element_in))  },
    elementOut: { id: t.element_out, ...(elemMap.get(t.element_out) ?? fallback(t.element_out)) },
    costIn: t.element_in_cost,
    costOut: t.element_out_cost,
    time: t.time,
  }));

  return NextResponse.json(result);
}
