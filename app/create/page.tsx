"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Manager = { name: string; entry: number };
type Step = "input" | "preview" | "success";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 6,
};

export default function CreatePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("input");
  const [fplLeagueId, setFplLeagueId] = useState("");
  const [previewLeagueName, setPreviewLeagueName] = useState("");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [leagueName, setLeagueName] = useState("");
  const [createdLeagueId, setCreatedLeagueId] = useState("");
  const [existingLeagueId, setExistingLeagueId] = useState<string | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = fplLeagueId.trim();
    if (!id) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setExistingLeagueId(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/fpl/league-preview/${id}`);
      if (!res.ok) {
        setPreviewError("FPL league not found. Check the league ID and try again.");
        return;
      }
      const data = await res.json();
      setManagers(data.managers);
      setPreviewLeagueName(data.leagueName);
      setLeagueName(data.leagueName);
      setStep("preview");
    } catch {
      setPreviewError("Something went wrong. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError(null);
    setExistingLeagueId(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/league/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fplLeagueId: Number(fplLeagueId),
          leagueName: leagueName.trim(),
        }),
      });

      if (res.status === 409) {
        const { leagueId } = await res.json();
        setExistingLeagueId(leagueId);
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        setSubmitError(err.error ?? "Failed to create league.");
        return;
      }

      const { leagueId } = await res.json();
      setCreatedLeagueId(leagueId);
      setStep("success");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (step === "success") {
    const url = `${window.location.origin}/league/${createdLeagueId}`;
    return (
      <section style={{ maxWidth: 560, margin: "60px auto", padding: "0 20px" }}>
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontFamily: "var(--font-head, inherit)", fontWeight: 800, marginBottom: 8 }}>
            League created!
          </h1>
          <p style={{ color: "var(--muted)", marginBottom: 24 }}>
            Share this link with your mates:
          </p>
          <div style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            fontFamily: "monospace",
            fontSize: 14,
            wordBreak: "break-all",
            marginBottom: 24,
            color: "var(--accent)",
          }}>
            {url}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(url).catch(() => {})}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.07)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: 12,
              marginRight: 10,
            }}
          >
            Copy link
          </button>
          <button
            onClick={() => router.push(`/league/${createdLeagueId}`)}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Go to league
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 560, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--font-head, inherit)",
          fontWeight: 900,
          fontSize: "1.8rem",
          marginBottom: 8,
        }}>
          Create a league
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Enter your FPL mini-league ID to get started.
          Find it in the URL on the FPL website under Leagues.
        </p>
      </div>

      {/* Step 1: FPL league ID + preview */}
      <form onSubmit={handlePreview}>
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>FPL Mini-League ID</label>
            <input
              type="number"
              placeholder="e.g. 12345"
              value={fplLeagueId}
              onChange={(e) => {
                setFplLeagueId(e.target.value);
                if (step === "preview") setStep("input");
                setExistingLeagueId(null);
              }}
              style={inputStyle}
              required
            />
            {previewError && (
              <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{previewError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={previewLoading || !fplLeagueId.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.07)",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              opacity: previewLoading || !fplLeagueId.trim() ? 0.5 : 1,
            }}
          >
            {previewLoading ? "Fetching…" : "Preview managers"}
          </button>
        </div>
      </form>

      {/* Step 2: Preview + confirm */}
      {step === "preview" && (
        <form onSubmit={handleCreate}>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--muted)", marginBottom: 12,
            }}>
              Managers from {previewLeagueName}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {managers.map((m) => (
                <div
                  key={m.entry}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.03)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{m.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>#{m.entry}</span>
                </div>
              ))}
            </div>

            <div>
              <label style={labelStyle}>League display name</label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                style={inputStyle}
                required
                maxLength={60}
              />
            </div>

            {existingLeagueId && (
              <div style={{
                marginTop: 16,
                padding: "12px 16px",
                borderRadius: 8,
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-border)",
                fontSize: 13,
                color: "var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <span>This FPL league is already registered.</span>
                <Link
                  href={`/league/${existingLeagueId}`}
                  style={{ color: "var(--gold)", fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  View it →
                </Link>
              </div>
            )}

            {submitError && (
              <p style={{ color: "#f87171", fontSize: 12, marginTop: 12 }}>{submitError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitLoading || !leagueName.trim()}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              border: "none",
              background: "var(--btn-bg)",
              color: "var(--btn-text)",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              opacity: submitLoading || !leagueName.trim() ? 0.5 : 1,
            }}
          >
            {submitLoading ? "Creating league…" : "Create league"}
          </button>
        </form>
      )}
    </section>
  );
}
