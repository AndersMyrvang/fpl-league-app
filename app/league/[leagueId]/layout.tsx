import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { fetchNextDeadline } from "@/lib/fpl";
import RecentLeagueSaver from "@/components/RecentLeagueSaver";

async function getNextDeadlineText(): Promise<string | null> {
  try {
    const next = await fetchNextDeadline();
    return new Date(next.deadline_time).toLocaleString("nb-NO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  const doc = await adminDb.collection("leagues").doc(leagueId).get();
  if (!doc.exists) notFound();

  const { name: leagueName } = doc.data() as { name: string };
  const nextDeadlineText = await getNextDeadlineText();

  return (
    <>
      <RecentLeagueSaver leagueId={leagueId} leagueName={leagueName} />
      <header className="site-header">
        <div className="container header-content">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/"
              title="Home"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--muted)",
                textDecoration: "none",
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.04)",
                lineHeight: 1,
              }}
            >
              FPL
            </Link>
            <Link href={`/league/${leagueId}`} className="brand">
              {leagueName}
            </Link>
          </div>
          <nav className="nav">
            <Link href={`/league/${leagueId}/results`}>Results</Link>
            <Link href={`/league/${leagueId}/statistikk`}>Stats</Link>
          </nav>
        </div>
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer">
        <div className="container">
          {nextDeadlineText && <div>Neste deadline er: {nextDeadlineText}</div>}
        </div>
      </footer>
    </>
  );
}
