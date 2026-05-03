"use client";

import { useState } from "react";

type Step = "phone" | "email" | "submitting" | "ringing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function PhoneForm() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10;
  const emailValid = EMAIL_RE.test(email.trim());

  function onPhoneSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phoneValid) {
      setError("drop a valid 10-digit number");
      return;
    }
    setError(null);
    setStep("email");
  }

  async function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!emailValid) {
      setError("that doesn't look like an email");
      return;
    }
    setError(null);
    setStep("submitting");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `+1${phoneDigits}`,
          email: email.trim().toLowerCase(),
        }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text) as { error?: string };
        } catch {
          // server returned non-JSON (timeout, crash, edge error page, etc.)
        }
      }
      if (!res.ok) {
        throw new Error(data.error ?? `request failed (${res.status})`);
      }
      setStep("ringing");
    } catch (err) {
      setError((err as Error).message);
      setStep("email");
    }
  }

  if (step === "ringing") {
    return (
      <div className="mt-1 w-full max-w-md rounded-full border border-aqua/60 bg-ink/50 px-6 py-3 text-center backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_60px_-20px_rgba(108,240,255,0.6)]">
        <p className="text-sm font-medium text-bg">
          we&apos;ll be in touch with u. soon.
        </p>
      </div>
    );
  }

  if (step === "email" || step === "submitting") {
    const submitting = step === "submitting";
    return (
      <div className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-aqua">
            step 2 / 2 · almost there
          </span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("phone");
            }}
            className="text-[11px] text-bg/60 underline-offset-2 hover:text-bg hover:underline"
          >
            ← back
          </button>
        </div>
        <form
          onSubmit={onEmailSubmit}
          aria-label="email form"
          className="group flex items-center gap-1 rounded-full border border-bg/25 bg-ink/45 p-1.5 pl-4 backdrop-blur-xl transition-all duration-500 ease-out shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_20px_60px_-20px_rgba(108,240,255,0.45)] focus-within:border-aqua/80 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_24px_70px_-18px_rgba(108,240,255,0.85)]"
        >
          <div className="flex shrink-0 items-center gap-2 pr-2.5 text-bg/70">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path
                d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 0 9 6 9-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="h-5 w-px bg-bg/15" aria-hidden />
          </div>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            disabled={submitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="u@somewhere.cool"
            className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-bg outline-none placeholder:text-bg/30 placeholder:font-normal disabled:opacity-50"
            aria-label="email"
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting || !emailValid}
            className="group/btn relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-br from-bg to-bg/90 px-5 py-2.5 text-sm font-bold text-ink transition-all duration-500 ease-out hover:rounded-xl hover:from-aqua hover:to-aqua/85 hover:text-ink hover:shadow-[0_8px_24px_-6px_var(--aqua)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:rounded-full disabled:hover:from-bg disabled:hover:to-bg/90 disabled:hover:shadow-none"
          >
            {submitting ? (
              <span className="flex items-center gap-1" aria-label="loading">
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current" />
              </span>
            ) : (
              <>
                send it
                <svg viewBox="0 0 16 16" className="size-3.5 transition-transform duration-500 ease-out group-hover/btn:translate-x-0.5" aria-hidden>
                  <path d="M3 8h10m0 0L9 4m4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-bg/60">
          we&apos;ll send ur date deets here. no newsletter, no spam, ever.
        </p>
        {error && (
          <p className="mt-1 text-center text-[11px] text-hot" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-2 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bg/55">
          step 1 / 2
        </span>
      </div>
      <form
        onSubmit={onPhoneSubmit}
        aria-label="ring me form"
        className="group flex items-center gap-1 rounded-full border border-bg/25 bg-ink/45 p-1.5 pl-4 backdrop-blur-xl transition-all duration-500 ease-out shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_20px_60px_-20px_rgba(61,107,255,0.45)] focus-within:border-hot/80 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_24px_70px_-18px_rgba(61,107,255,0.85)]"
      >
        <div className="flex shrink-0 items-center gap-2 pr-2.5 text-bg/70">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-medium tabular-nums">+1</span>
          <span className="h-5 w-px bg-bg/15" aria-hidden />
        </div>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="(555) 010-7464"
          maxLength={14}
          className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium tabular-nums tracking-wide text-bg outline-none placeholder:text-bg/30 placeholder:font-normal"
          aria-label="phone number"
        />
        <button
          type="submit"
          disabled={!phoneValid}
          className="group/btn relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-br from-bg to-bg/90 px-5 py-2.5 text-sm font-bold text-ink transition-all duration-500 ease-out hover:rounded-xl hover:from-hot hover:to-hot/85 hover:text-bg hover:shadow-[0_8px_24px_-6px_var(--hot)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:rounded-full disabled:hover:from-bg disabled:hover:to-bg/90 disabled:hover:text-ink disabled:hover:shadow-none"
        >
          ring me
          <svg viewBox="0 0 16 16" className="size-3.5 transition-transform duration-500 ease-out group-hover/btn:translate-x-0.5" aria-hidden>
            <path d="M3 8h10m0 0L9 4m4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      {error && (
        <p className="mt-2 text-center text-[11px] text-hot" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
