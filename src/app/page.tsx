"use client";

import { motion } from "motion/react";
import { Logo } from "@/components/Logo";
import { PhoneForm } from "@/components/PhoneForm";

const chips = ["no swipes", "1 ring · 1 date", "0% spam"];

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  return (
    <main className="relative w-full">
      <section className="relative isolate flex h-[100svh] min-h-[680px] w-full flex-col justify-center overflow-hidden text-bg">
        <div aria-hidden className="absolute inset-0 -z-40 bg-ink" />
        <motion.div
          aria-hidden
          className="absolute inset-0 z-[-35] bg-[url('/hero-bg.jpg')] bg-cover bg-center mix-blend-screen"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 0.25, scale: 1 }}
          transition={{ duration: 1.6, ease: easeOut }}
        />
        <motion.div
          className="absolute -top-[20%] -left-[15%] -z-30 h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(91,58,142,1)_0%,rgba(91,58,142,0.85)_30%,rgba(91,58,142,0)_75%)] blur-xl animate-drift"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: easeOut }}
        />
        <motion.div
          className="absolute -top-[15%] -right-[20%] -z-30 h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(61,107,255,0.95)_0%,rgba(61,107,255,0.7)_30%,rgba(61,107,255,0)_75%)] blur-xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.1, ease: easeOut }}
        />
        <motion.div
          className="absolute -bottom-[25%] left-[5%] -z-30 h-[65vh] w-[65vh] rounded-full bg-[radial-gradient(circle,rgba(108,240,255,0.6)_0%,rgba(108,240,255,0.35)_30%,rgba(108,240,255,0)_75%)] blur-xl animate-drift"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.2, ease: easeOut }}
        />
        <motion.div
          className="absolute -bottom-[10%] -right-[10%] -z-30 h-[45vh] w-[45vh] rounded-full bg-[radial-gradient(circle,rgba(184,164,222,0.75)_0%,rgba(184,164,222,0.5)_30%,rgba(184,164,222,0)_75%)] blur-xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.3, ease: easeOut }}
        />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(8,6,15,0.8)_100%)]" />
        <div className="grain absolute inset-0 -z-10" />
        <div className="grain-light absolute inset-0 -z-10" />
        <div className="scanlines absolute inset-0 -z-10" />

        <motion.div
          className="relative z-30 flex shrink-0 justify-center"
          initial={{ opacity: 0, y: -16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: easeOut }}
        >
          <Logo />
        </motion.div>

        <motion.div
          className="relative z-30 mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2 px-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
          }}
        >
          {chips.map((c) => (
            <motion.span
              key={c}
              variants={{
                hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: easeOut } },
              }}
              className="rounded-full border border-bg/30 bg-ink/30 text-bg/90 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(0,0,0,0.45)] px-4 py-1.5 text-xs sm:text-sm tracking-tight"
            >
              {c}
            </motion.span>
          ))}
        </motion.div>

        <div aria-hidden className="pointer-events-none absolute inset-0 z-20 hidden lg:block">
          <motion.div
            className="absolute left-[5%] top-[44%] w-[170px]"
            initial={{ opacity: 0, x: -120, rotate: -18 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ duration: 1.1, delay: 0.55, ease: easeOut }}
          >
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
          </motion.div>

          <motion.div
            className="absolute right-[5%] top-[40%] w-[170px]"
            initial={{ opacity: 0, x: 120, rotate: 18 }}
            animate={{ opacity: 1, x: 0, rotate: 6 }}
            transition={{ duration: 1.1, delay: 0.65, ease: easeOut }}
          >
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
          </motion.div>
        </div>

        <section className="relative z-30 mx-auto mt-6 flex w-full max-w-4xl shrink-0 flex-col items-center gap-4 px-6 text-center sm:mt-8">
          <h1 className="font-display font-extrabold text-[clamp(2.75rem,9vw,7rem)] leading-[1] tracking-[-0.04em] drop-shadow-[0_8px_28px_rgba(61,107,255,0.35)]">
            <motion.span
              className="block whitespace-nowrap"
              initial={{ opacity: 0, y: 24, filter: "blur(14px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: 0.45, ease: easeOut }}
            >
              one ring.
            </motion.span>
            <motion.span
              className="mt-2 block whitespace-nowrap"
              initial={{ opacity: 0, y: 24, filter: "blur(14px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: 0.7, ease: easeOut }}
            >
              one{" "}
              <span className="relative inline-block">
                <motion.span
                  aria-hidden
                  className="absolute -inset-y-1 -inset-x-3 -rotate-3 origin-left rounded-md bg-hot shadow-[0_18px_40px_-10px_rgba(61,107,255,0.65)]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.85, delay: 1.05, ease: easeOut }}
                />
                <span className="relative text-ink">date.</span>
              </span>
            </motion.span>
          </h1>
          <motion.p
            className="mt-6 max-w-xl text-sm leading-relaxed text-bg/80 sm:mt-8 sm:text-base"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.2, ease: easeOut }}
          >
            <span className="block">drop ur #. we ring once, vibe-check by voice,</span>
            <span className="block">lock the date before u hang up.</span>
          </motion.p>

          <motion.div
            className="flex w-full justify-center"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 1.4, ease: easeOut }}
          >
            <PhoneForm />
          </motion.div>
          <motion.p
            className="text-[11px] tracking-wide text-bg/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.6, ease: easeOut }}
          >
            free first ring · no spam · u r one ring from a mad date
          </motion.p>
        </section>

        <motion.footer
          className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-6 pb-4 text-[10px] uppercase tracking-[0.2em] text-bg/40"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.8, ease: easeOut }}
        >
          <span>© 2026 ring inc</span>
        </motion.footer>
      </section>
    </main>
  );
}
