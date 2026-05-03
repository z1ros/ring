import { Logo } from "@/components/Logo";
import { PhoneForm } from "@/components/PhoneForm";

const chips = ["no swipes", "1 ring · 1 date", "0% spam"];

export default function Home() {
  return (
    <main className="relative w-full">
      <section className="relative isolate flex h-[100svh] min-h-[680px] w-full flex-col justify-center overflow-hidden text-bg">
        <div aria-hidden className="absolute inset-0 -z-40 bg-ink" />
        <div
          aria-hidden
          className="absolute inset-0 z-[-35] bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-25 mix-blend-screen"
        />
        <div className="absolute -top-[20%] -left-[15%] -z-30 h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(91,58,142,1)_0%,rgba(91,58,142,0.85)_30%,rgba(91,58,142,0)_75%)] blur-xl animate-drift" />
        <div className="absolute -top-[15%] -right-[20%] -z-30 h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(61,107,255,0.95)_0%,rgba(61,107,255,0.7)_30%,rgba(61,107,255,0)_75%)] blur-xl" />
        <div className="absolute -bottom-[25%] left-[5%] -z-30 h-[65vh] w-[65vh] rounded-full bg-[radial-gradient(circle,rgba(108,240,255,0.6)_0%,rgba(108,240,255,0.35)_30%,rgba(108,240,255,0)_75%)] blur-xl animate-drift" />
        <div className="absolute -bottom-[10%] -right-[10%] -z-30 h-[45vh] w-[45vh] rounded-full bg-[radial-gradient(circle,rgba(184,164,222,0.75)_0%,rgba(184,164,222,0.5)_30%,rgba(184,164,222,0)_75%)] blur-xl" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(8,6,15,0.8)_100%)]" />
        <div className="grain absolute inset-0 -z-10" />
        <div className="grain-light absolute inset-0 -z-10" />
        <div className="scanlines absolute inset-0 -z-10" />

        <div className="relative z-30 flex shrink-0 justify-center">
          <Logo />
        </div>

        <div className="relative z-30 mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2 px-6">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-bg/30 bg-ink/30 text-bg/90 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(0,0,0,0.45)] px-4 py-1.5 text-xs sm:text-sm tracking-tight"
            >
              {c}
            </span>
          ))}
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
          <div className="absolute left-[5%] top-[44%] w-[170px] -rotate-[6deg]">
            <span className="absolute -top-2.5 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-aqua px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink shadow-[0_8px_24px_-6px_var(--aqua)]">
              <span className="size-1 rounded-full bg-ink" />
              ringed · 4d
            </span>
            <div className="overflow-hidden rounded-md border border-bg/15 bg-ink shadow-[0_24px_50px_-18px_rgba(108,240,255,0.4),0_0_0_1px_rgba(255,255,255,0.05)]">
              <div className="relative aspect-[5/4] bg-[url('/couple-1.jpg')] bg-cover bg-center">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/85 to-transparent" />
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-sm bg-ink/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-aqua backdrop-blur">
                  <span className="pulse-dot inline-block size-1 rounded-full bg-aqua" />
                  call · 02:14
                </span>
                <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-aqua backdrop-blur">
                  <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                    <path d="M6 10.5 L1.5 6 a3 3 0 0 1 4.5-4 a3 3 0 0 1 4.5 4 z" fill="currentColor" />
                  </svg>
                  98% match
                </span>
              </div>
              <div className="border-t border-bg/10 bg-ink/85 px-2.5 py-1.5 backdrop-blur">
                <div className="truncate font-display text-[12px] font-bold text-bg">alex × maya</div>
                <div className="truncate text-[9px] text-bg/55">first date · jun 12</div>
              </div>
            </div>
          </div>

          <div className="absolute right-[5%] top-[40%] w-[170px] rotate-[6deg]">
            <span className="absolute -top-2.5 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-hot px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-bg shadow-[0_8px_24px_-6px_var(--hot)]">
              she said yes
              <span className="size-1 rounded-full bg-bg" />
            </span>
            <div className="overflow-hidden rounded-md border border-bg/15 bg-ink shadow-[0_24px_50px_-18px_rgba(61,107,255,0.5),0_0_0_1px_rgba(255,255,255,0.05)]">
              <div className="relative aspect-[5/4] bg-[url('/couple-2.jpg')] bg-cover bg-center">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/85 to-transparent" />
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-sm bg-ink/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-hot backdrop-blur">
                  <span className="pulse-dot inline-block size-1 rounded-full bg-hot" />
                  call · 03:41
                </span>
                <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-hot backdrop-blur">
                  <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                    <path d="M6 10.5 L1.5 6 a3 3 0 0 1 4.5-4 a3 3 0 0 1 4.5 4 z" fill="currentColor" />
                  </svg>
                  96% match
                </span>
              </div>
              <div className="border-t border-bg/10 bg-ink/85 px-2.5 py-1.5 backdrop-blur">
                <div className="truncate font-display text-[12px] font-bold text-bg">sam × jules</div>
                <div className="truncate text-[9px] text-bg/55">irl in 6 days</div>
              </div>
            </div>
          </div>
        </div>

        <section className="relative z-30 mx-auto mt-6 flex w-full max-w-4xl shrink-0 flex-col items-center gap-4 px-6 text-center sm:mt-8">
          <h1 className="font-display font-extrabold text-[clamp(2.75rem,9vw,7rem)] leading-[1] tracking-[-0.04em] drop-shadow-[0_8px_28px_rgba(61,107,255,0.35)]">
            <span className="block whitespace-nowrap">one ring.</span>
            <span className="mt-2 block whitespace-nowrap">
              one{" "}
              <span className="relative inline-block">
                <span
                  aria-hidden
                  className="absolute -inset-y-1 -inset-x-3 -rotate-3 rounded-md bg-hot shadow-[0_18px_40px_-10px_rgba(61,107,255,0.65)]"
                />
                <span className="relative text-ink">date.</span>
              </span>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-bg/80 sm:mt-8 sm:text-base">
            <span className="block">drop ur #. we ring once, vibe-check by voice,</span>
            <span className="block">lock the date before u hang up.</span>
          </p>

          <PhoneForm />
          <p className="text-[11px] tracking-wide text-bg/60">
            free first ring · no spam · u r one ring from a mad date
          </p>
        </section>

      </section>
    </main>
  );
}
