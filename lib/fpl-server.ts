// Server-only module — never import from client components.
// Keeps bootstrap-static in process memory so the ~2.6 MB response is only
// fetched once per server restart (or after TTL), bypassing Next.js's 2 MB
// data-cache limit that prevents `force-cache` from working on that endpoint.

const TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedBootstrap: { data: unknown; at: number } | null = null;

export async function fetchBootstrapCached(): Promise<unknown> {
  if (cachedBootstrap && Date.now() - cachedBootstrap.at < TTL_MS) {
    return cachedBootstrap.data;
  }
  const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Bootstrap fetch failed: ${res.status}`);
  const data = await res.json();
  cachedBootstrap = { data, at: Date.now() };
  return data;
}
