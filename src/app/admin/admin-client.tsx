"use client";

import { useState } from "react";
import { motion } from "motion/react";

export type AdminLead = {
  id: string;
  phone: string;
  email: string | null;
  callEndedAt: string;
  name: string | null;
  age: number | null;
  city: string | null;
  gender: string | null;
  looking_for: string | null;
  hobbies: string[] | null;
  shared_hobbies: string[] | null;
  type: string | null;
  ideal_first_date: string | null;
  dealbreaker: string | null;
};

type MatchResult = {
  ok: true;
  match: {
    id: string;
    name?: string;
    age?: number;
    city?: string;
    gender?: string;
    hobbies?: string[];
    ideal_first_date?: string;
  };
  cafe: string;
  cafeAddress: string;
  cafeNeighborhood: string;
  suggestedWhen: string;
  pitch: string;
  reasoning: string;
  mapsUrl: string;
  emailSentTo: string;
  emailId: string | null;
};

const easeOut = [0.16, 1, 0.3, 1] as const;

export function AdminClient({
  latest,
  totalCompleted,
}: {
  latest: AdminLead | null;
  totalCompleted: number;
}) {
  const [result, setResult] = useState<MatchResult | { error: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function findMatch() {
    if (!latest) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: latest.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "match failed" });
      } else {
        setResult(data as MatchResult);
      }
    } catch (err) {
      setResult({ error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-bg">
      <div aria-hidden className="pointer-events-none absolute -top-[20%] -left-[10%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(91,58,142,0.7)_0%,rgba(91,58,142,0)_65%)] blur-3xl animate-drift" />
      <div aria-hidden className="pointer-events-none absolute -top-[10%] -right-[15%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(61,107,255,0.5)_0%,rgba(61,107,255,0)_60%)] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-[20%] left-[10%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(108,240,255,0.25)_0%,rgba(108,240,255,0)_60%)] blur-3xl animate-drift" />
      <div aria-hidden className="grain absolute inset-0 pointer-events-none" />
      <div aria-hidden className="scanlines absolute inset-0 pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: easeOut }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-aqua">
            admin · matchmaker
          </p>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-none tracking-[-0.04em] sm:text-6xl">
            <span className="text-bg/30">{totalCompleted}</span>{" "}
            <span className="relative inline-block">
              <motion.span
                aria-hidden
                className="absolute -inset-y-1 -inset-x-2.5 -rotate-2 origin-left rounded-md bg-hot shadow-[0_18px_40px_-12px_rgba(61,107,255,0.55)]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.85, delay: 0.5, ease: easeOut }}
              />
              <span className="relative text-ink">ringed.</span>
            </span>
          </h1>
          <p className="mt-4 text-sm text-bg/60">
            tap match to pair the most recent call with their best fit.
          </p>
        </motion.div>

        {latest ? (
          <motion.div
            className="mt-10 w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: easeOut }}
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-aqua/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-aqua">
                <span className="pulse-dot inline-block size-1 rounded-full bg-aqua shadow-[0_0_8px_var(--aqua)]" />
                call ended
              </span>
              <span className="h-px flex-1 bg-bg/10" aria-hidden />
              <span className="text-[10px] tabular-nums text-bg/40">{relativeTime(latest.callEndedAt)}</span>
            </div>

            <div className="rounded-3xl border border-bg/10 bg-ink/40 p-6 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_30px_80px_-30px_rgba(61,107,255,0.4)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <Avatar name={latest.name} gender={latest.gender} />
                  <div>
                    <h2 className="font-display text-3xl font-extrabold leading-none tracking-[-0.02em]">
                      {latest.name ?? "—"}
                      {latest.age != null && <span className="text-bg/35">, {latest.age}</span>}
                    </h2>
                    <div className="mt-1 text-xs text-bg/55">{latest.city ?? "—"}</div>
                  </div>
                </div>
                {latest.gender && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      latest.gender === "woman"
                        ? "bg-hot/15 text-hot"
                        : "bg-aqua/15 text-aqua"
                    }`}
                  >
                    {latest.gender}
                  </span>
                )}
              </div>

              <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <Field label="looking" value={latest.looking_for} />
                <Field label="type" value={latest.type} />
                <Field label="hobbies" value={latest.hobbies?.join(" · ") ?? null} />
                <Field
                  label="want shared"
                  value={latest.shared_hobbies?.join(" · ") ?? null}
                />
                <Field
                  label="ideal date"
                  value={latest.ideal_first_date}
                  className="sm:col-span-2"
                />
                <Field
                  label="hard pass"
                  value={latest.dealbreaker}
                  tone="warn"
                  className="sm:col-span-2"
                />
              </div>
            </div>

            <button
              onClick={findMatch}
              disabled={loading}
              className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-hot via-[#5b8aff] to-aqua py-4 text-base font-bold text-bg shadow-[0_20px_60px_-12px_rgba(61,107,255,0.55)] transition-all duration-500 ease-out hover:rounded-2xl hover:shadow-[0_24px_70px_-12px_rgba(61,107,255,0.85)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:rounded-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current" />
                  <span className="ml-2">finding the one…</span>
                </span>
              ) : (
                <>
                  match {latest.name ?? "this lead"} now
                  <svg viewBox="0 0 16 16" className="size-4 transition-transform duration-500 ease-out group-hover:translate-x-1" aria-hidden>
                    <path d="M3 8h10m0 0L9 4m4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            {result && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: easeOut }}
              >
                {"error" in result ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-hot/30 bg-hot/10 p-5 text-sm text-hot">
                    <span className="size-2 rounded-full bg-hot" aria-hidden />
                    {result.error}
                  </div>
                ) : (
                  <ResultCard result={result} userName={latest.name ?? "user"} />
                )}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="mt-12 rounded-3xl border border-bg/10 bg-ink/40 p-10 text-center backdrop-blur-xl">
            <p className="text-sm text-bg/60">
              no completed calls yet. submit ur phone on the homepage first.
            </p>
          </div>
        )}

        <p className="mt-10 text-center text-[10px] uppercase tracking-[0.22em] text-bg/40">
          model <span className="font-mono normal-case text-bg/60">gpt-5-nano</span>
          <span className="mx-2 text-bg/20">/</span>
          email → <span className="font-mono normal-case text-bg/60">$ADMIN_EMAIL</span>
        </p>
      </div>
    </main>
  );
}

function Avatar({ name, gender }: { name: string | null; gender: string | null }) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";
  const tint =
    gender === "woman"
      ? "from-hot/40 to-hot/10 text-bg"
      : "from-aqua/40 to-aqua/10 text-bg";
  return (
    <div
      className={`flex size-12 items-center justify-center rounded-full bg-gradient-to-br ${tint} font-display text-xl font-extrabold ring-1 ring-bg/15`}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function Field({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: string;
  value: string | null;
  tone?: "default" | "warn";
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
          tone === "warn" ? "text-hot/80" : "text-bg/40"
        }`}
      >
        {label}
      </div>
      <div className="mt-1 text-sm text-bg/85">{value ?? "—"}</div>
    </div>
  );
}

function ResultCard({ result, userName }: { result: MatchResult; userName: string }) {
  const m = result.match;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-aqua/30 bg-aqua/[0.04] p-6 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(108,240,255,0.18),0_24px_70px_-22px_rgba(108,240,255,0.45)]">
      <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-aqua/15 blur-3xl" />

      <div className="relative inline-flex items-center gap-1.5 rounded-md bg-aqua/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-aqua">
        <span className="size-1 rounded-full bg-aqua shadow-[0_0_8px_var(--aqua)]" />
        date locked
      </div>

      <h3 className="relative mt-3 font-display text-4xl font-extrabold leading-none tracking-[-0.03em]">
        {m.name ?? "?"}
        {m.age != null && <span className="text-bg/35">, {m.age}</span>}
        {m.gender && (
          <span
            className={`ml-3 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-[0.18em] ${
              m.gender === "woman" ? "bg-hot/15 text-hot" : "bg-aqua/15 text-aqua"
            }`}
          >
            {m.gender}
          </span>
        )}
      </h3>
      <div className="relative mt-1 text-sm text-bg/55">{m.city ?? "—"}</div>
      {m.hobbies && m.hobbies.length > 0 && (
        <div className="relative mt-3 text-xs text-bg/65">{m.hobbies.slice(0, 4).join(" · ")}</div>
      )}
      {m.ideal_first_date && (
        <div className="relative mt-1 text-xs italic text-bg/50">&ldquo;{m.ideal_first_date}&rdquo;</div>
      )}

      <div className="relative my-5 h-px bg-bg/10" aria-hidden />

      <div className="relative grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-aqua">
            where
          </div>
          <div className="mt-1.5 font-display text-lg font-bold leading-tight">{result.cafe}</div>
          <div className="mt-0.5 text-xs text-bg/55">{result.cafeAddress}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-hot">
            when
          </div>
          <div className="mt-1.5 font-display text-lg font-bold leading-tight text-hot">
            {result.suggestedWhen}
          </div>
        </div>
      </div>

      <a
        href={result.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-bg px-4 py-2 text-xs font-bold text-ink transition-all duration-500 ease-out hover:rounded-lg hover:bg-aqua"
      >
        open in maps
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
          <path d="M3 8h10m0 0L9 4m4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>

      <div className="relative my-5 h-px bg-bg/10" aria-hidden />

      <p className="relative text-sm text-bg/85">{result.pitch}</p>
      <details className="relative mt-3">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.22em] text-bg/40 hover:text-bg/60">
          why we picked them
        </summary>
        <p className="mt-2 text-xs text-bg/60">{result.reasoning}</p>
      </details>

      <div className="relative mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-bg/35">
        <span
          className={`size-1.5 rounded-full ${
            result.emailId ? "bg-aqua shadow-[0_0_6px_var(--aqua)]" : "bg-hot"
          }`}
          aria-hidden
        />
        {result.emailId
          ? `email sent → ${result.emailSentTo}`
          : "matched but email failed"}
        <span className="ml-auto normal-case text-bg/30">for {userName}</span>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.round((now - then) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}
