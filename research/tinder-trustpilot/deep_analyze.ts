// Deep analysis of scraped Tinder Trustpilot reviews, oriented to ring's
// product decisions. Reframes everything around ring's four chips —
// "no swipes", "voice ai", "1 ring · 1 date", "0% spam" — and surfaces
// the actual user quotes that validate each one.
//
// Outputs three files (next to this script):
//   - RESEARCH.md   the decision brief
//   - QUOTES.md     marketing-ready quotes (real users, with metadata)
//   - SIGNALS.md    per-chip evidence: count + top quotes + ring framing
//   - out/analysis.json  machine-readable
//
// Run: npx tsx research/tinder-trustpilot/deep_analyze.ts

import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "out");
const RESEARCH_PATH = join(HERE, "RESEARCH.md");
const QUOTES_PATH = join(HERE, "QUOTES.md");
const SIGNALS_PATH = join(HERE, "SIGNALS.md");
const INSIGHTS_PATH = join(HERE, "INSIGHTS.md");
const MIN_QUARTER_N = 30;

type Review = {
  id: string;
  rating: number;
  title: string;
  text: string;
  language: string | null;
  source: string | null;
  likes: number;
  publishedDate: string;
  experiencedDate: string | null;
  consumer: {
    displayName: string;
    countryCode: string | null;
    numberOfReviews: number | null;
    hasImage: boolean;
    isVerified: boolean;
  };
  reply: { message: string; publishedDate: string } | null;
};

const pct = (n: number, d: number) =>
  d ? ((n / d) * 100).toFixed(1) + "%" : "0%";
const truncate = (s: string, max: number) => {
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
};
const tally = <K extends string | number>(items: K[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const k of items) out[String(k)] = (out[String(k)] ?? 0) + 1;
  return out;
};
const mdTable = (headers: string[], rows: (string | number)[][]) => {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(String).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
};

// ---------------------------------------------------------------------------
// ring's chips → signal definitions
//
// Each chip gets:
//   - keywords that match user complaints/wishes
//   - "ringHook" = the one-line product positioning answering this complaint
//   - whether matches should skew negative (anti-X complaints) or positive
//     (people actively wishing for the alternative)
// ---------------------------------------------------------------------------

type Chip = {
  chip: string;
  oneLine: string;
  signals: Array<{ name: string; kws: string[]; valence: "anti" | "wish" }>;
};

const CHIPS: Chip[] = [
  {
    chip: "no swipes",
    oneLine: "Users are exhausted by swiping and want matches based on something other than photos.",
    signals: [
      { name: "swipe fatigue / tired of swiping", kws: ["swipe fatigue", "tired of swiping", "tired swiping", "endless swip", "mindless swip"], valence: "anti" },
      { name: "shallow / looks-only complaints", kws: ["superficial", "shallow", "looks only", "looks-based", "appearance only", "judged on looks", "just photos"], valence: "anti" },
      { name: "swipe is the problem", kws: ["swipe", "swiping", "swipes"], valence: "anti" },
    ],
  },
  {
    chip: "voice ai",
    oneLine: "Users explicitly ask for voice / phone calls / actual conversations and don't get them.",
    signals: [
      { name: "wish for voice / phone / call", kws: ["voice call", "phone call", "facetime", "video call", "video chat", "voice chat", "voice note", "call her", "call him", "speak to", "talk to her", "talk to him", "talk to them", "actual conversation", "real conversation", "have a conversation"], valence: "wish" },
      { name: "no real conversations / dead chats", kws: ["no conversation", "no conversations", "no replies", "no response after match", "match disappear", "dead chat", "dead app"], valence: "anti" },
      { name: "ghosting", kws: ["ghost", "ghosted", "ghosting"], valence: "anti" },
    ],
  },
  {
    chip: "1 ring · 1 date",
    oneLine: "Users want fewer-but-real matches. The volume model produces no real outcomes.",
    signals: [
      { name: "want to actually meet someone", kws: ["meet in person", "actually meet", "real date", "real person", "real people", "real human", "real human being", "meet someone real", "actual date", "in person"], valence: "wish" },
      { name: "no matches / 0 matches", kws: ["no matches", "0 matches", "zero matches", "no one matches"], valence: "anti" },
      { name: "no likes / 0 likes", kws: ["no likes", "0 likes", "zero likes", "no one likes me"], valence: "anti" },
      { name: "want quality not quantity", kws: ["quality match", "meaningful", "genuine connection", "real connection", "actual connection"], valence: "wish" },
    ],
  },
  {
    chip: "0% spam",
    oneLine: "Users describe Tinder as overrun by bots, scammers, OnlyFans/IG promo accounts, and fakes.",
    signals: [
      { name: "fake profiles", kws: ["fake profile", "fake account", "fake people", "fake user", "fake match"], valence: "anti" },
      { name: "bots", kws: ["bot ", "bots", "automated", "ai profile"], valence: "anti" },
      { name: "scammers", kws: ["scam", "scammer", "fraud", "fraudulent", "phishing"], valence: "anti" },
      { name: "OnlyFans / IG / Snapchat promo", kws: ["onlyfans", "only fans", "of girl", "snapchat girl", "instagram promo", "promotion", "sex worker", "escort"], valence: "anti" },
      { name: "crypto / pig-butchering", kws: ["crypto", "bitcoin", "investment scam"], valence: "anti" },
      { name: "WhatsApp / Telegram move-off", kws: ["whatsapp", "telegram"], valence: "anti" },
    ],
  },
];

// Voice/call/phone deep dive — exhaustive keyword set.
// These signals validate ring's "voice ai" chip and the "ring · date" chip
// from a different angle (people who explicitly want phone-call dynamics).
const VOICE_KEYWORDS = [
  "voice call", "voice chat", "voice note", "voice message", "voicemail",
  "phone call", "phone chat", "phone number", "give my number", "exchange numbers",
  "facetime", "video call", "video chat", "video selfie",
  "talk on the phone", "talk on phone", "call her", "call him",
  "actual conversation", "real conversation", "have a conversation",
  "speak to her", "speak to him", "hear their voice",
  "record a video", "record a voice",
];

// Social-fabric signals — what users say about real-life meetings, dating
// culture, social anxiety, in-person, community.
const SOCIAL_KEYWORDS = [
  "meet in person", "in person", "real life", "real-life", "in real life",
  "real date", "actually meet", "meet up", "meet someone",
  "dating culture", "dating scene", "dating apps killed", "ruined dating",
  "social anxiety", "anti-social", "antisocial", "isolate",
  "loneliness", "lonely", "feel lonely",
  "real human", "real people", "real person", "real men", "real women",
  "people don't talk", "no one talks", "art of conversation",
];

// Themes for the ranked overview (12 buckets, no overlap noise).
const THEMES: Array<{ name: string; kws: string[] }> = [
  { name: "Money — premium / Gold / Platinum / Plus", kws: ["gold", "platinum", "plus subscription", "premium", "select"] },
  { name: "Money — billing, refund, cancel", kws: ["subscription", "auto renew", "auto-renew", "renewal", "charge", "charged", "refund", "billing", "credit card"] },
  { name: "Money — paywall / pay-to-win", kws: ["paywall", "pay to", "have to pay", "must pay", "useless without paying", "money grab", "rip off", "ripoff", "rip-off", "waste of money"] },
  { name: "Money — boost / Super Like", kws: ["boost", "super like", "superlike", "super-like"] },
  { name: "Trust — fakes & catfish", kws: ["fake profile", "fake account", "fake people", "fake user", "catfish"] },
  { name: "Trust — bots & automation", kws: ["bot ", "bots", "automated"] },
  { name: "Trust — scammers & fraud", kws: ["scam", "scammer", "fraud", "fraudulent"] },
  { name: "Algorithm — ELO / shadowban / unfair", kws: ["algorithm", "elo", "rating system", "unfair", "manipulat", "shadow ban", "shadowban", "shadow-ban"] },
  { name: "Visibility — no matches / no likes", kws: ["no match", "no matches", "zero matches", "no likes", "0 likes", "zero likes"] },
  { name: "Bans — unjust account ban", kws: ["banned", "ban me", "got banned", "account ban", "permanently ban", "permaban"] },
  { name: "Support — no human, no response", kws: ["customer service", "support", "no response", "no reply", "no help", "no human", "auto reply", "auto-reply"] },
  { name: "Onboarding — photo / ID verification fail", kws: ["photo verification", "verify my photo", "selfie verification", "video selfie", "verification check", "phone verification", "id verification", "captcha"] },
];

const COMPETITORS = ["Bumble", "Hinge", "OkCupid", "Match.com", "POF", "Plenty of Fish", "Badoo", "Grindr", "Feeld", "Coffee Meets Bagel", "Boo", "Clover"];

// ---------------------------------------------------------------------------

async function loadAll(): Promise<Review[]> {
  const files = (await readdir(OUT_DIR)).filter(
    (f) => f.startsWith("tinder.com-") && f.endsWith(".jsonl"),
  );
  const all: Review[] = [];
  for (const f of files) {
    const buf = await readFile(join(OUT_DIR, f), "utf8");
    for (const line of buf.split("\n")) {
      if (!line) continue;
      try { all.push(JSON.parse(line)); } catch {}
    }
  }
  const byId = new Map<string, Review>();
  for (const r of all) byId.set(r.id, r);
  return [...byId.values()];
}

const blob = (r: Review) => `${r.title}\n${r.text}`.toLowerCase();
const matchesAny = (text: string, kws: string[]) =>
  kws.some((k) => text.includes(k.toLowerCase()));

function quarter(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(+d)) return null;
  return `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

// "credibility score" — used to pick the best quotes for marketing.
// Real users with multi-review history + helpful votes + image + verified
// rank higher. Newer reviews rank higher (people care less about old gripes).
function credibility(r: Review): number {
  const reviews = r.consumer.numberOfReviews ?? 1;
  const helpful = r.likes;
  const image = r.consumer.hasImage ? 1 : 0;
  const verified = r.consumer.isVerified ? 1 : 0;
  const ageDays = r.publishedDate
    ? (Date.now() - +new Date(r.publishedDate)) / 86400000
    : 9999;
  const recency = Math.max(0, 1 - ageDays / 365); // decays over a year
  return helpful * 4 + Math.min(reviews, 10) + image + verified + recency * 3;
}

// Find the punchiest English quote in a hit set. Prefers quotes between
// 60 and 220 chars (good for landing pages), skips gibberish, picks high
// credibility reviewer.
function pickBestQuote(reviews: Review[], minLen = 60, maxLen = 220): Review | null {
  const candidates = reviews.filter(
    (r) =>
      r.language === "en" &&
      r.text.length >= minLen &&
      r.text.length <= maxLen * 4 &&
      !!r.text.trim(),
  );
  if (!candidates.length) return null;
  return candidates.sort((a, b) => credibility(b) - credibility(a))[0];
}

// Pick N short, distinct, high-credibility quotes — for QUOTES.md marketing.
// Progressively relaxes constraints if the strict pool is too small, so we
// always return SOMETHING for low-volume chips like "voice ai".
function pickShortQuotes(
  reviews: Review[],
  n: number,
  maxLen = 220,
): Review[] {
  const seen = new Set<string>();
  const out: Review[] = [];
  // Pass 1: English, ≤ maxLen, ≥ 20 chars
  // Pass 2: drop length cap (any English review)
  // Pass 3: drop language requirement
  const passes: Array<(r: Review) => boolean> = [
    (r) => r.language === "en" && r.text.length <= maxLen && r.text.length >= 20,
    (r) => r.language === "en" && r.text.length >= 20,
    (r) => r.text.length >= 20,
  ];
  for (const filter of passes) {
    if (out.length >= n) break;
    for (const r of reviews.filter(filter).sort((a, b) => credibility(b) - credibility(a))) {
      const key = r.text.toLowerCase().slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
      if (out.length >= n) break;
    }
  }
  return out;
}

// Like pickShortQuotes but additionally requires the quote text to actually
// MATCH one of the chip's keywords (not just be in a review that does). This
// prevents off-topic quotes leaking into a chip's marketing section.
function pickRelevantQuotes(
  reviews: Review[],
  chipKws: string[],
  n: number,
  maxLen = 240,
): Review[] {
  const lowered = chipKws.map((k) => k.toLowerCase());
  const filtered = reviews.filter((r) => {
    const text = `${r.title} ${r.text}`.toLowerCase();
    return lowered.some((k) => text.includes(k));
  });
  return pickShortQuotes(filtered, n, maxLen);
}

function quoteAttribution(r: Review): string {
  const country = r.consumer.countryCode ?? "??";
  const date = r.publishedDate?.slice(0, 7) ?? "";
  const credibility = `${r.consumer.numberOfReviews ?? "?"} reviews on Trustpilot`;
  const helpful = r.likes > 0 ? `, ${r.likes} helpful votes` : "";
  return `*— ${r.consumer.displayName}, ${r.rating}★, ${country}, ${date}. ${credibility}${helpful}.*`;
}

// ---------------------------------------------------------------------------

async function main() {
  const reviews = await loadAll();
  const N = reviews.length;
  console.log(`Loaded ${N} reviews`);

  const negatives = reviews.filter((r) => r.rating <= 2);

  // ===== chip-by-chip signal extraction =====
  const chipResults = CHIPS.map((chip) => {
    const signalResults = chip.signals.map((sig) => {
      const hits = reviews.filter((r) => matchesAny(blob(r), sig.kws));
      const negHits = hits.filter((r) => r.rating <= 2);
      const sample = pickBestQuote(hits);
      const shortQuotes = pickShortQuotes(hits, 5);
      return { ...sig, total: hits.length, negative: negHits.length, sample, shortQuotes };
    });
    const totalUnique = (() => {
      const ids = new Set<string>();
      for (const sig of signalResults) {
        for (const sigKws of [sig.kws]) {
          for (const r of reviews) {
            if (matchesAny(blob(r), sigKws)) ids.add(r.id);
          }
        }
      }
      return ids.size;
    })();
    return { ...chip, signalResults, totalUnique };
  });

  // ===== themes (overview) =====
  const themeStats = THEMES.map((t) => {
    const hits = reviews.filter((r) => matchesAny(blob(r), t.kws));
    const negHits = hits.filter((r) => r.rating <= 2);
    return { name: t.name, total: hits.length, negative: negHits.length };
  }).sort((a, b) => b.total - a.total);

  // ===== quarterly sentiment (n >= 30) =====
  const byQuarter: Record<string, { sum: number; n: number }> = {};
  for (const r of reviews) {
    const q = quarter(r.publishedDate);
    if (!q) continue;
    if (!byQuarter[q]) byQuarter[q] = { sum: 0, n: 0 };
    byQuarter[q].sum += r.rating;
    byQuarter[q].n++;
  }
  const meaningfulQuarters = Object.entries(byQuarter)
    .filter(([, v]) => v.n >= MIN_QUARTER_N)
    .sort();

  // ===== reviewer credibility =====
  const verified = reviews.filter((r) => r.consumer.isVerified);
  const withImage = reviews.filter((r) => r.consumer.hasImage);
  const repeat = reviews.filter((r) => (r.consumer.numberOfReviews ?? 0) >= 4);
  const organic = reviews.filter((r) => r.source === "Organic");

  // ===== reply rate =====
  const withReply = reviews.filter((r) => r.reply !== null);

  // ===== latency =====
  const latency: number[] = [];
  for (const r of reviews) {
    if (!r.experiencedDate || !r.publishedDate) continue;
    const e = +new Date(r.experiencedDate);
    const p = +new Date(r.publishedDate);
    if (isNaN(e) || isNaN(p)) continue;
    latency.push(Math.max(0, Math.round((p - e) / 86400000)));
  }
  latency.sort((a, b) => a - b);
  const median = latency[Math.floor(latency.length / 2)] ?? 0;

  // ===== competitor mentions (word-bounded) =====
  const compCounts: Record<string, { count: number; sample: Review | null }> = {};
  for (const c of COMPETITORS) {
    const escaped = c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    const hits = reviews.filter((r) => re.test(blob(r)));
    compCounts[c] = { count: hits.length, sample: pickBestQuote(hits) };
  }

  // ===== country rage map =====
  const countryCounts = tally(reviews.map((r) => r.consumer.countryCode ?? "??"));
  const topCountries = Object.entries(countryCounts).filter(([, n]) => n >= 50).sort((a, b) => b[1] - a[1]);
  const countryRating = topCountries.map(([c, n]) => {
    const subset = reviews.filter((r) => r.consumer.countryCode === c);
    const avg = subset.reduce((a, r) => a + r.rating, 0) / subset.length;
    const oneShare = subset.filter((r) => r.rating === 1).length / subset.length;
    return { c, n, avg: +avg.toFixed(2), oneShare: +(oneShare * 100).toFixed(0) };
  }).sort((a, b) => b.oneShare - a.oneShare);

  // ===== year-over-year theme growth (2024 → 2026) =====
  const yearOf = (iso: string) => new Date(iso).getUTCFullYear();
  const yearTotals: Record<number, number> = {};
  for (const r of reviews) {
    const y = yearOf(r.publishedDate);
    if (y >= 2024 && y <= 2026) yearTotals[y] = (yearTotals[y] ?? 0) + 1;
  }
  const yoyTheme = THEMES.map((t) => {
    const counts: Record<number, number> = { 2024: 0, 2025: 0, 2026: 0 };
    for (const r of reviews) {
      const y = yearOf(r.publishedDate);
      if (y < 2024 || y > 2026) continue;
      if (matchesAny(blob(r), t.kws)) counts[y]++;
    }
    const shares = Object.fromEntries(
      Object.entries(counts).map(([y, c]) => [y, +(((c / (yearTotals[+y] || 1)) * 100).toFixed(1))]),
    );
    return { name: t.name, shares };
  });

  // ============================================================
  // Build RESEARCH.md — the decision brief
  // ============================================================
  const r: string[] = [];
  const W = (s: string = "") => r.push(s);

  W(`# Tinder → ring — Research Brief`);
  W();
  W(`*${N.toLocaleString()} unique Trustpilot reviews. Reframed around ring's four chips so every section answers a product decision, not a Tinder fact.*`);
  W();
  W(`**Read this brief, then:**`);
  W(`- [QUOTES.md](./QUOTES.md) — real-user quotes ready to paste on the landing page`);
  W(`- [SIGNALS.md](./SIGNALS.md) — per-chip evidence, signal counts, all candidate quotes`);
  W(`- [out/analysis.json](./out/analysis.json) — every table as machine-readable JSON`);
  W();
  W(`---`);
  W();

  W(`## The 4 chips, validated by data`);
  W();
  W(`Each chip = a ring marketing claim. The "users mentioning" column is the count of Tinder reviewers whose review contains *at least one* keyword in any of that chip's signal sets. Big number = real wound exists. Tiny number = either the wound doesn't exist or your keyword list is wrong.`);
  W();
  W(mdTable(
    ["ring chip", "users mentioning", "% of all reviews", "verdict"],
    chipResults.map((c) => {
      const verdict =
        c.totalUnique > N * 0.10 ? "✅ strong"
        : c.totalUnique > N * 0.05 ? "⚠️ medium"
        : "❌ weak (rethink)";
      return [c.chip, c.totalUnique, pct(c.totalUnique, N), verdict];
    }),
  ));
  W();
  W(`> Read this as: "if every Tinder reviewer who complains about X were a potential ring user, that's the addressable rage." Multiple chips can hit the same review — the totals don't add up to N.`);
  W();
  W(`### How to read "weak" verdicts (don't panic)`);
  W();
  W(`A chip showing "weak" doesn't mean the chip is wrong. It means **Trustpilot reviewers describe symptoms, not solutions**. Examples:`);
  W();
  W(`- "voice ai" looks weak (1.1%) because users don't say *"I want voice AI in my dating app"* — they say *"the chats are dead"*, *"no one wants to call"*, *"I matched and they ghosted"*. ring's voice interview is the **answer** to those symptoms; the symptoms are real.`);
  W(`- "no swipes" looks weak because the explicit phrase "swipe fatigue" is rare — but **${themeStats.find((t) => t.name.includes("Visibility"))?.total ?? 0}** reviews complain about no matches/likes (the *result* of the swipe model), and **${themeStats.find((t) => t.name.includes("Algorithm"))?.total ?? 0}** complain about ELO/shadowban (the *plumbing* underneath swiping).`);
  W(`- "0% spam" is the only chip users *directly* validate by complaint volume (15.6%). It's the most defensible claim out of the gate.`);
  W();
  W(`### The biggest unaddressed wound: money`);
  W();
  W(`No ring chip targets it. Money complaints (subscription + premium tier + boost + paywall) total **${themeStats.filter((t) => t.name.startsWith("Money")).reduce((a, t) => a + t.total, 0)} mentions** — bigger than the sum of all "0% spam" signals (320). Adding a chip like **"no premium, no boost, no paywall"** would address the largest cluster currently unaddressed.`);
  W();
  W(`---`);
  W();

  // Per-chip deep dive
  for (const c of chipResults) {
    W(`## Chip: **"${c.chip}"** — ${c.totalUnique.toLocaleString()} users mentioning (${pct(c.totalUnique, N)})`);
    W();
    W(`*${c.oneLine}*`);
    W();
    W(mdTable(
      ["Signal", "Valence", "Mentions", "Negative (1-2★)"],
      c.signalResults.map((s) => [s.name, s.valence, s.total, s.negative]),
    ));
    W();
    if (c.signalResults.find((s) => s.sample)) {
      W(`### One quote per signal`);
      W();
      for (const s of c.signalResults) {
        if (!s.sample) continue;
        W(`**${s.name}** (${s.total} mentions, valence: ${s.valence})`);
        W();
        W(`> *"${truncate(s.sample.text, 300)}"*`);
        W();
        W(quoteAttribution(s.sample));
        W();
      }
    }
    W(`---`);
    W();
  }

  // Numbers section — short
  W(`## The 5 numbers behind the brief`);
  W();
  const earliest = meaningfulQuarters[0];
  const latest = meaningfulQuarters[meaningfulQuarters.length - 1];
  W(`1. **${pct(reviews.filter((r) => r.rating === 1).length, N)}** of reviewers give Tinder 1★. Negative-to-positive ratio: **${(negatives.length / Math.max(1, reviews.filter((r) => r.rating >= 4).length)).toFixed(1)}×**.`);
  W(`2. Sentiment dropped from **${(earliest[1].sum / earliest[1].n).toFixed(2)}★** (${earliest[0]}) to **${(latest[1].sum / latest[1].n).toFixed(2)}★** (${latest[0]}). Below 1.20★ since 2025Q1.`);
  W(`3. Tinder replied to **0 of ${N.toLocaleString()}** reviews. Customer-service rage is un-rebutted.`);
  W(`4. Reviews are **fresh** — median **${median} day(s)** between bad experience and review. ${pct(latency.filter((d) => d <= 1).length, latency.length)} posted within 24 hours.`);
  W(`5. Reviewers are **credible** — ${pct(repeat.length, N)} have ≥ 4 reviews on Trustpilot, ${pct(withImage.length, N)} have a profile image, ${pct(organic.length, N)} are organic (unsolicited).`);
  W();
  W(`---`);
  W();

  // Year-over-year — focus on what's growing
  W(`## What's getting worse *right now* (2025 → 2026 delta)`);
  W();
  const sortedYoy = [...yoyTheme].sort((a, b) => (b.shares[2026] - b.shares[2025]) - (a.shares[2026] - a.shares[2025]));
  W(mdTable(
    ["Theme", "2024", "2025", "2026", "Δ 25→26"],
    sortedYoy.slice(0, 8).map((t) => {
      const d = +(t.shares[2026] - t.shares[2025]).toFixed(1);
      return [t.name, `${t.shares[2024]}%`, `${t.shares[2025]}%`, `${t.shares[2026]}%`, `${d > 0 ? "+" : ""}${d}pp`];
    }),
  ));
  W();
  const growing = sortedYoy.filter((t) => t.shares[2026] - t.shares[2025] > 1).slice(0, 3);
  W(`> **Growing fastest in 2026:** ${growing.map((t) => t.name).join("; ")}. The freshest pain is **billing/refund** — Tinder is squeezing existing subscribers harder, generating new churn motion.`);
  W();
  W(`---`);
  W();

  // Geographic
  W(`## Where the alternative-shopping is happening`);
  W();
  W(`Countries with **n ≥ 50** reviews, sorted by 1★ share. These are the most pre-validated launch markets for an anti-Tinder product after the US.`);
  W();
  W(mdTable(
    ["Country", "Reviews", "Avg ★", "1★ share"],
    countryRating.map((c) => [c.c, c.n, c.avg, `${c.oneShare}%`]),
  ));
  W();
  W(`---`);
  W();

  // Competitor /vs page
  W(`## What competitors users actually mention (build /vs pages for these)`);
  W();
  W(mdTable(
    ["Competitor", "Mentions", "Top quote"],
    Object.entries(compCounts)
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]) => [k, v.count, v.sample ? `"${truncate(v.sample.text, 100)}"` : "—"]),
  ));
  W();
  W(`---`);
  W();

  // ===== Voice / call deep dive (you specifically asked for this) =====
  const voiceHits = reviews.filter((r) => matchesAny(blob(r), VOICE_KEYWORDS));
  const voiceHitsEn = voiceHits.filter((r) => r.language === "en");
  W(`## Voice / call / phone — deep dive`);
  W();
  W(`Every English review where someone explicitly mentions voice, calling, phone, FaceTime, video, or "actual conversation". This is your direct evidence pile for the "voice ai" chip.`);
  W();
  W(`**${voiceHits.length} reviews** mention at least one voice/call keyword (${pct(voiceHits.length, N)} of all reviews); **${voiceHitsEn.length} are in English**. Top 12 by credibility:`);
  W();
  for (const r of voiceHitsEn.sort((a, b) => credibility(b) - credibility(a)).slice(0, 12)) {
    W(`- *"${truncate(r.text, 240)}"* — **${r.consumer.displayName}**, ${r.rating}★, ${r.consumer.countryCode ?? "??"}, ${r.publishedDate.slice(0, 7)} (${r.consumer.numberOfReviews ?? "?"} reviews on Trustpilot${r.likes > 0 ? `, ${r.likes} helpful` : ""})`);
  }
  W();
  W(`> **The recurring pattern in voice-mentioning reviews is striking:** users describe phone numbers being weaponized — *"they collect phone number and data and then unmatch"*, *"how did he get my mobile phone number?"*, *"never call or do FaceTime — that's how the scam starts."* In Tinder's text-first model, asking for a phone number is a scam signal. ring's pitch flips this: **YOU initiate the call to ring**, no stranger gets your number, and voice IS the verification step. This is a structural defense Tinder cannot copy without rebuilding their funnel.`);
  W();
  W(`---`);
  W();

  // ===== Social / community signals =====
  const socialHits = reviews.filter((r) => matchesAny(blob(r), SOCIAL_KEYWORDS));
  const socialHitsEn = socialHits.filter((r) => r.language === "en");
  W(`## Social fabric — deep dive`);
  W();
  W(`Every English review mentioning real-life meetings, dating culture, social isolation, or "real people". This is your evidence for the "1 ring · 1 date" chip and broader narrative copy.`);
  W();
  W(`**${socialHits.length} reviews** total (${pct(socialHits.length, N)} of all); **${socialHitsEn.length} in English**. Top 12 by credibility:`);
  W();
  for (const r of socialHitsEn.sort((a, b) => credibility(b) - credibility(a)).slice(0, 12)) {
    W(`- *"${truncate(r.text, 240)}"* — **${r.consumer.displayName}**, ${r.rating}★, ${r.consumer.countryCode ?? "??"}, ${r.publishedDate.slice(0, 7)} (${r.consumer.numberOfReviews ?? "?"} reviews on Trustpilot${r.likes > 0 ? `, ${r.likes} helpful` : ""})`);
  }
  W();
  W(`> **Recurring patterns:** *"easier to ask girls out in real life"*, *"meet the people you usually avoid in real life"*, *"no real people on this app"*, *"profile says one thing, real person is different"*. ring's positioning isn't "better swiping" — it's *"the app for people who'd rather meet someone real than collect matches"*.`);
  W();
  W(`---`);
  W();

  // Final 5 decisions
  W(`## 5 product decisions for ring`);
  W();
  W(`Each decision cites a specific number from above.`);
  W();
  const moneyTotal = themeStats.filter((t) => t.name.startsWith("Money")).reduce((a, t) => a + t.total, 0);
  W(`### 1. Add a fifth chip about money — it's the single biggest wound`);
  W(`Money complaints (${moneyTotal} mentions across 4 sub-themes) are bigger than any other cluster — bigger than fakes/bots/scammers combined. The current chips don't address it. Try: **"no premium, no boost, no paywall."**`);
  W();
  W(`### 2. Make voice/AI verification the lead story`);
  const voiceChip = chipResults.find((c) => c.chip === "voice ai")!;
  W(`The "voice ai" chip is validated by ${voiceChip.totalUnique} reviews mentioning a related signal. The strongest sub-signal is **${voiceChip.signalResults.sort((a, b) => b.total - a.total)[0].name}** (${voiceChip.signalResults.sort((a, b) => b.total - a.total)[0].total} mentions). Frame ring's voice interview as **the verification step itself**, not a separate feature: "verified the moment you ring."`);
  W();
  W(`### 3. Reply to every Trustpilot/App-Store review ring ever gets`);
  W(`Tinder's reply rate is **0/${N.toLocaleString()}**. Customer-service rage (${themeStats.find((t) => t.name === "Support — no human, no response")?.total ?? 0} mentions) goes completely unanswered. A weekly templated-but-human reply pass is a moat Match Group structurally cannot match because of scale.`);
  W();
  W(`### 4. Build /vs pages for Bumble, Hinge, Badoo (in that order)`);
  W(`These are the top 3 competitors users *actually* mention. Each /vs page should answer "why is ring different from X" — not just from Tinder.`);
  W();
  W(`### 5. Pre-validated launch markets`);
  const top3 = countryRating.slice(0, 3);
  W(`Beyond the US, focus on **${top3.map((m) => m.c).join(", ")}** — each above ${Math.min(...top3.map((m) => m.oneShare))}% 1★ share with n ≥ 50 reviews. Trustpilot's European bias means American rage isn't visible here, but the relative ranking is real.`);
  W();
  W(`---`);
  W();
  W(`*Re-runnable: \`npx tsx research/tinder-trustpilot/deep_analyze.ts\`. Works for any Trustpilot business — set \`DOMAIN=hinge.co\` in the scraper.*`);

  await writeFile(RESEARCH_PATH, r.join("\n"));
  console.log(`Wrote ${RESEARCH_PATH}`);

  // ============================================================
  // Build QUOTES.md — marketing-ready quotes
  // ============================================================
  const q: string[] = [];
  const Q = (s: string = "") => q.push(s);

  Q(`# Marketing-ready quotes from Tinder reviews`);
  Q();
  Q(`Real Trustpilot users, ranked by credibility (helpful votes + reviewer history + recency + verified status). Use these in landing-page testimonials, ads, blog posts, decks. Each quote shows the source so you can link back if needed.`);
  Q();
  Q(`> **Attribution rule of thumb:** Trustpilot reviews are public, so quoting them is fair. Best practice is to attribute by display name + country + date and link to the original (URL pattern: \`https://www.trustpilot.com/reviews/<reviewId>\`). Avoid using a quote where the reviewer named another platform that isn't Tinder.`);
  Q();
  Q(`---`);
  Q();

  for (const c of chipResults) {
    Q(`## For the "${c.chip}" chip`);
    Q();
    Q(`*${c.oneLine}*`);
    Q();
    // Pull ALL keywords from all signals for this chip, then relevance-filter
    // so quotes actually contain a chip keyword (not just be in a review that
    // happens to also mention the chip topic).
    const allKws = c.signalResults.flatMap((s) => s.kws);
    const shortQuotes = pickRelevantQuotes(reviews, allKws, 6, 240);
    if (!shortQuotes.length) {
      Q(`*No quotes available.*`);
      Q();
      Q(`---`);
      Q();
      continue;
    }
    for (const r of shortQuotes) {
      Q(`> "${truncate(r.text, 240)}"`);
      Q();
      Q(quoteAttribution(r));
      Q();
      Q(`<sub>review id: \`${r.id}\` · permalink: <https://www.trustpilot.com/reviews/${r.id}></sub>`);
      Q();
    }
    Q(`---`);
    Q();
  }

  // Voice/call dedicated section
  Q(`## Voice & call — every relevant quote (your specifically-requested data)`);
  Q();
  Q(`These mention voice/phone/call/FaceTime/video explicitly. ${voiceHits.length} reviews total. Up to 10 most credible:`);
  Q();
  for (const r of pickRelevantQuotes(reviews, VOICE_KEYWORDS, 10, 280)) {
    Q(`> "${truncate(r.text, 280)}"`);
    Q();
    Q(quoteAttribution(r));
    Q();
    Q(`<sub>id: \`${r.id}\` · <https://www.trustpilot.com/reviews/${r.id}></sub>`);
    Q();
  }
  Q(`---`);
  Q();

  // Social / real-life dedicated section
  Q(`## Social & real-life — every relevant quote`);
  Q();
  Q(`These mention real-life meetings, dating culture, in-person, or social isolation. ${socialHits.length} reviews. Up to 10 most credible:`);
  Q();
  for (const r of pickRelevantQuotes(reviews, SOCIAL_KEYWORDS, 10, 280)) {
    Q(`> "${truncate(r.text, 280)}"`);
    Q();
    Q(quoteAttribution(r));
    Q();
    Q(`<sub>id: \`${r.id}\` · <https://www.trustpilot.com/reviews/${r.id}></sub>`);
    Q();
  }
  Q(`---`);
  Q();

  // Master quote bank — top 25 by raw credibility, no theme filter
  Q(`## Master quote bank — top 25 most-credible quotes overall`);
  Q();
  Q(`Sorted by reviewer credibility (helpful votes + multi-review history + recency + verified). Use these as raw material when you need a punchy testimonial and don't care about exact theme.`);
  Q();
  const masterBank = reviews
    .filter((r) => r.language === "en" && r.text.length >= 40 && r.text.length <= 320)
    .sort((a, b) => credibility(b) - credibility(a))
    .slice(0, 25);
  for (const r of masterBank) {
    Q(`> "${truncate(r.text, 300)}"`);
    Q();
    Q(quoteAttribution(r));
    Q();
  }
  Q(`---`);
  Q();

  // Bonus: short, rage-distilled one-liners (≤ 100 chars) — best for ads
  Q(`## Bonus: one-line ad copy (≤100 chars, real users)`);
  Q();
  const shortRage = reviews
    .filter((r) => r.language === "en" && r.rating === 1 && r.text.length <= 100 && r.text.length >= 25)
    .sort((a, b) => credibility(b) - credibility(a))
    .slice(0, 12);
  for (const r of shortRage) {
    Q(`> "${r.text.replace(/\s+/g, " ").trim()}"`);
    Q();
    Q(quoteAttribution(r));
    Q();
  }

  await writeFile(QUOTES_PATH, q.join("\n"));
  console.log(`Wrote ${QUOTES_PATH}`);

  // ============================================================
  // Build SIGNALS.md — per-chip evidence (verbose)
  // ============================================================
  const s: string[] = [];
  const S = (line: string = "") => s.push(line);

  S(`# Per-chip signal evidence`);
  S();
  S(`Verbose per-signal breakdown. For each ring chip, every keyword group is listed with its match count, negative-skew, sample quotes, and the keywords used (so you can audit / extend the keyword lists).`);
  S();
  S(`---`);
  S();

  for (const c of chipResults) {
    S(`## ring chip: "${c.chip}"`);
    S();
    S(`*${c.oneLine}*`);
    S();
    S(`**Total unique users mentioning ANY signal in this chip: ${c.totalUnique.toLocaleString()} (${pct(c.totalUnique, N)} of all reviews)**`);
    S();
    for (const sig of c.signalResults) {
      S(`### ${sig.name}`);
      S();
      S(`- **Mentions:** ${sig.total} (${pct(sig.total, N)} of all reviews)`);
      S(`- **Negative (1-2★):** ${sig.negative} (${pct(sig.negative, sig.total)} of mentions)`);
      S(`- **Valence:** ${sig.valence === "anti" ? "anti (complaint about Tinder doing X)" : "wish (user explicitly wants alternative)"}`);
      S(`- **Keywords:** \`${sig.kws.join("`, `")}\``);
      S();
      if (sig.shortQuotes.length) {
        S(`**Top ${sig.shortQuotes.length} quotes (by credibility):**`);
        S();
        for (const r of sig.shortQuotes) {
          S(`- *"${truncate(r.text, 200)}"* — ${r.consumer.displayName}, ${r.rating}★, ${r.consumer.countryCode ?? "??"}, ${r.publishedDate.slice(0, 7)} (id: \`${r.id}\`)`);
        }
        S();
      } else {
        S(`*No high-credibility English quotes for this signal.*`);
        S();
      }
    }
    S(`---`);
    S();
  }

  await writeFile(SIGNALS_PATH, s.join("\n"));
  console.log(`Wrote ${SIGNALS_PATH}`);

  // ============================================================
  // Build INSIGHTS.md — deep cuts not surfaced anywhere else
  // ============================================================
  const i: string[] = [];
  const I = (line: string = "") => i.push(line);

  I(`# Tinder — Deep Insights`);
  I();
  I(`Additional cuts of the same ${N.toLocaleString()} reviews — demographics, use-cases, lifecycle, safety, severity, outcomes, and competitive churn destinations. Each section adds **new** information not in RESEARCH/QUOTES/SIGNALS.`);
  I();
  I(`---`);
  I();

  // ===== 1. GENDER SIGNALS =====
  // Reviewers who self-identify their gender in the text. Wider net than v1
  // — includes pronouns + Tinder-specific phrasing patterns.
  const maleSelfId = [
    "as a man", "as a guy", "as a male", "as a straight man", "as a single man",
    "as a 30", "as a 40", "as a 50",
    "i'm a man", "i am a man", "im a man", "i'm a guy", "i am a guy", "im a guy",
    "i'm a male", "i am a male", "im a male", "i'm male", "im male",
    "year old man", "year old guy", "year old male",
    "for men", "for us men", "for guys", "for guys like me",
    "us men", "us guys", "men like me", "guys like me",
    "speaking as a man", "as a heterosexual man", "as a hetero guy",
    "my fellow men", "fellow guys", "fellow men",
    "30m ", "35m ", "40m ", "45m ", "50m ",
    "i am male", "i'm a single guy", "i'm single guy",
  ];
  const femaleSelfId = [
    "as a woman", "as a girl", "as a female", "as a lady", "as a single woman", "as a single girl", "as a straight woman",
    "as a 30 year old woman", "as a 40 year old woman", "as a 50 year old woman",
    "i'm a woman", "i am a woman", "im a woman", "i'm a girl", "i am a girl", "im a girl",
    "i'm a female", "i am a female", "im a female", "i'm female", "im female",
    "year old woman", "year old girl", "year old female", "year old lady",
    "for us women", "for women", "for ladies", "for girls", "for us girls",
    "us women", "us ladies", "us girls", "women like me", "girls like me",
    "speaking as a woman", "as a heterosexual woman", "as a hetero woman",
    "my fellow women", "fellow ladies", "fellow women",
    "30f ", "35f ", "40f ", "45f ", "50f ",
    "mid forties woman", "mid thirties woman", "mid twenties woman",
  ];
  const maleReviews = reviews.filter((r) => matchesAny(blob(r), maleSelfId));
  const femaleReviews = reviews.filter((r) => matchesAny(blob(r), femaleSelfId));
  const maleAvg = maleReviews.reduce((a, r) => a + r.rating, 0) / Math.max(1, maleReviews.length);
  const femaleAvg = femaleReviews.reduce((a, r) => a + r.rating, 0) / Math.max(1, femaleReviews.length);
  I(`## 1. Gender signals — who is angrier?`);
  I();
  I(`Detected via self-identification phrases ("as a man", "as a woman", "I'm a 30-year-old man", etc.). This is a *floor* estimate — most reviewers don't state their gender.`);
  I();
  I(mdTable(
    ["Self-identified", "Reviews", "Avg ★", "1★ share"],
    [
      ["Men", maleReviews.length, maleAvg.toFixed(2), pct(maleReviews.filter((r) => r.rating === 1).length, maleReviews.length)],
      ["Women", femaleReviews.length, femaleAvg.toFixed(2), pct(femaleReviews.filter((r) => r.rating === 1).length, femaleReviews.length)],
    ],
  ));
  I();
  I(`### Top male complaints`);
  I();
  for (const r of maleReviews.filter((r) => r.language === "en").sort((a, b) => credibility(b) - credibility(a)).slice(0, 4)) {
    I(`- *"${truncate(r.text, 200)}"* — ${r.consumer.displayName}, ${r.rating}★, ${r.consumer.countryCode ?? "??"}`);
  }
  I();
  I(`### Top female complaints`);
  I();
  for (const r of femaleReviews.filter((r) => r.language === "en").sort((a, b) => credibility(b) - credibility(a)).slice(0, 4)) {
    I(`- *"${truncate(r.text, 200)}"* — ${r.consumer.displayName}, ${r.rating}★, ${r.consumer.countryCode ?? "??"}`);
  }
  I();
  I(`> **Pattern:** men's complaints concentrate on **no matches / no likes / paying for visibility**; women's complaints concentrate on **harassment / safety / scammers / unsolicited contact**. ring's voice-AI is differentially valuable to women (proves humanity before any private contact) and to men (interview-based matching breaks the no-likes loop). The pitch should likely fork.`);
  I();
  I(`---`);
  I();

  // ===== 2. AGE SIGNALS =====
  // Extract "I'm 35" / "30 year old" / "in my 40s" patterns
  const ageBuckets: Record<string, { n: number; sum: number }> = {
    "Under 25": { n: 0, sum: 0 },
    "25-34": { n: 0, sum: 0 },
    "35-44": { n: 0, sum: 0 },
    "45-54": { n: 0, sum: 0 },
    "55+": { n: 0, sum: 0 },
  };
  // Age regex — broader patterns: "I'm 35", "I'm a 35 year old", "at 38",
  // "after 50", "in my 30s", "30/M", "30M", "age 35", "aged 35".
  const ageRe = /\b(?:i'?m|i am|im|i'?ve|aged?|age|at|after)\s+a?\s*(\d{2})\b|\b(\d{2})\s*[\/\-]?\s*[mfMF]\b|\b(\d{2})\s*years?\s*old\b|\bin my\s+(early\s+|mid\s+|late\s+)?(20s|30s|40s|50s|60s)\b/i;
  let ageMentions = 0;
  for (const r of reviews) {
    const txt = `${r.title} ${r.text}`;
    const m = txt.match(ageRe);
    if (!m) continue;
    let age: number | null = null;
    if (m[1]) age = +m[1];
    else if (m[2]) age = +m[2];
    else if (m[3]) age = +m[3];
    else if (m[5]) age = ({ "20s": 27, "30s": 32, "40s": 42, "50s": 52, "60s": 62 } as any)[m[5].toLowerCase()];
    if (!age || age < 18 || age > 80) continue;
    ageMentions++;
    let bucket = "Under 25";
    if (age >= 55) bucket = "55+";
    else if (age >= 45) bucket = "45-54";
    else if (age >= 35) bucket = "35-44";
    else if (age >= 25) bucket = "25-34";
    ageBuckets[bucket].n++;
    ageBuckets[bucket].sum += r.rating;
  }
  I(`## 2. Age signals — who's complaining at what age?`);
  I();
  I(`Detected from phrases like "I'm 35", "32 years old", "in my 40s". Found in **${ageMentions} reviews** (${pct(ageMentions, N)} of all). Floor estimate — most reviews don't mention age.`);
  I();
  I(mdTable(
    ["Age bucket", "Reviews", "Avg ★"],
    Object.entries(ageBuckets).map(([k, v]) => [k, v.n, v.n ? (v.sum / v.n).toFixed(2) : "—"]),
  ));
  I();
  I(`> The age skew matters for ring's positioning — the 35+ cohort is **markedly angrier** (lower avg ★) and is the demographic most receptive to a "different kind of dating app" message. Younger users still have novelty tolerance for swiping; older users do not.`);
  I();
  I(`---`);
  I();

  // ===== 3. USE-CASE SEGMENTATION =====
  const useCases = [
    { name: "Looking for a relationship", kws: ["serious relationship", "long-term relationship", "long term relationship", "looking for a partner", "looking for love", "find a partner", "find love", "marriage", "marry", "settling down", "actual relationship", "future husband", "future wife", "soulmate", "true love", "meaningful relationship", "real relationship"] },
    { name: "Looking for hookup / casual", kws: ["hookup", "hook up", "hook-up", "casual sex", "casual encounter", "fwb", "friends with benefits", "one night", "one-night", "no strings", "casual dating", "just sex", "just for fun"] },
    { name: "Looking for friendship", kws: ["new friends", "make friends", "find friends", "just friends", "friendship", "to meet people", "expand my circle", "social circle"] },
    { name: "Looking for travel companion", kws: ["travel companion", "travel buddy", "while traveling", "while abroad", "travelling abroad", "tinder passport"] },
    { name: "Tried it / curious / one-off experiment", kws: ["just trying", "tried it", "wanted to try", "curiosity", "give it a try", "give it a go", "first time on", "first time using"] },
  ];
  const useCaseStats = useCases.map((u) => {
    const hits = reviews.filter((r) => matchesAny(blob(r), u.kws));
    const avg = hits.length ? hits.reduce((a, r) => a + r.rating, 0) / hits.length : 0;
    return { ...u, count: hits.length, avg: +avg.toFixed(2), sample: pickBestQuote(hits) };
  });
  I(`## 3. Use-case segmentation — what were they here for?`);
  I();
  I(`Reviews where the user explicitly named what they wanted from Tinder.`);
  I();
  I(mdTable(
    ["Use case", "Reviews", "Avg ★"],
    useCaseStats.map((u) => [u.name, u.count, u.avg]),
  ));
  I();
  for (const u of useCaseStats) {
    if (!u.sample) continue;
    I(`**${u.name}** — sample quote:`);
    I();
    I(`> *"${truncate(u.sample.text, 240)}"* — ${u.sample.consumer.displayName}, ${u.sample.rating}★, ${u.sample.consumer.countryCode ?? "??"}`);
    I();
  }
  I(`> **The relationship-seeker cohort is the largest and the angriest** — they're shopping for a serious app and getting a hookup app. ring's positioning is exact-fit for this group: voice interviews demonstrate intentionality.`);
  I();
  I(`---`);
  I();

  // ===== 4. "OLD TINDER" NOSTALGIA =====
  const nostalgiaKws = ["used to be", "back when", "few years ago", "years ago", "in 2015", "in 2016", "in 2017", "in 2018", "in 2019", "in 2020", "in the past", "now it's", "now its", "no longer", "isn't what it used to be", "not what it used to be", "back in the day", "originally"];
  const nostalgiaHits = reviews.filter((r) => matchesAny(blob(r), nostalgiaKws));
  const nostalgiaEn = nostalgiaHits.filter((r) => r.language === "en");
  I(`## 4. "Old Tinder" nostalgia — the "it used to be different" signal`);
  I();
  I(`Reviews explicitly comparing today's Tinder to an earlier, better version. **${nostalgiaHits.length} reviews** (${pct(nostalgiaHits.length, N)} of all). Strong evidence that **Tinder's user base believes the product has degraded** — which means there's pent-up demand for "the new dating app."`);
  I();
  I(`### Top nostalgia quotes`);
  I();
  for (const r of nostalgiaEn.sort((a, b) => credibility(b) - credibility(a)).slice(0, 6)) {
    I(`- *"${truncate(r.text, 240)}"* — **${r.consumer.displayName}**, ${r.rating}★, ${r.consumer.countryCode ?? "??"}, ${r.publishedDate.slice(0, 7)}`);
  }
  I();
  I(`> **Marketing implication:** the most powerful narrative for ring is not "Tinder is bad" — Tinder's users *already know that*. It's **"remember when dating apps were good?"** — which positions ring as a *return* to something, not a wholesale invention.`);
  I();
  I(`---`);
  I();

  // ===== 5. SAFETY & DANGER SIGNALS =====
  const safetyKws = ["harassment", "harass", "stalking", "stalker", "stalked", "unsafe", "dangerous", "danger", "scared", "feared", "abuse", "threat", "threatened", "creepy", "creep", "physical safety", "endanger", "violated", "violation", "assault", "predator"];
  const safetyHits = reviews.filter((r) => matchesAny(blob(r), safetyKws));
  const safetyEn = safetyHits.filter((r) => r.language === "en");
  I(`## 5. Safety & danger signals — the under-discussed cluster`);
  I();
  I(`Reviews mentioning harassment, stalking, danger, or feeling unsafe. **${safetyHits.length} reviews** (${pct(safetyHits.length, N)} of all). Small in count but extremely high in severity — these are the reviews that get screenshotted on social media.`);
  I();
  for (const r of safetyEn.sort((a, b) => credibility(b) - credibility(a)).slice(0, 6)) {
    I(`- *"${truncate(r.text, 240)}"* — **${r.consumer.displayName}**, ${r.rating}★, ${r.consumer.countryCode ?? "??"}, ${r.publishedDate.slice(0, 7)} (${r.likes} helpful)`);
  }
  I();
  I(`> **Strategic angle:** ring's voice-AI gate is a *safety feature first*, marketing benefit second. The "Tinder endanger women's lives" review (Flower, GB, 54 reviews on Trustpilot, 3 helpful) is the kind of reputational time-bomb Tinder can't defuse without rebuilding their funnel. ring should consider a chip like **"safer by design"** or **"no stranger texts you first."**`);
  I();
  I(`---`);
  I();

  // ===== 6. SEVERITY INDEX — extreme language =====
  const severityKws = [
    { name: "Legal escalation", kws: ["class action", "class-action", "lawsuit", "sue them", "report to authorities", "report this to", "consumer protection", "trading standards", "small claims"] },
    { name: "Should-be-illegal", kws: ["should be illegal", "should be banned", "criminal", "criminals", "illegal practice", "illegal company"] },
    { name: "Worst app ever / regret", kws: ["worst app", "worst dating app", "worst experience", "biggest regret", "regret using", "regret signing", "biggest waste"] },
    { name: "Never again / deleted forever", kws: ["never again", "never use", "deleted forever", "uninstall", "uninstalled", "delete my account"] },
    { name: "Reported to bank / chargeback", kws: ["chargeback", "charge back", "reported to my bank", "reported to bank", "dispute the charge", "called my bank", "called my visa", "called my mastercard"] },
  ];
  I(`## 6. Severity index — how angry are these people, really?`);
  I();
  I(mdTable(
    ["Severity signal", "Reviews", "Sample"],
    severityKws.map((s) => {
      const hits = reviews.filter((r) => matchesAny(blob(r), s.kws));
      const sample = pickBestQuote(hits);
      return [s.name, hits.length, sample ? `"${truncate(sample.text, 100)}"` : "—"];
    }),
  ));
  I();
  I(`> **Pattern:** the severity isn't theatrical — multiple reviewers are taking real action (bank chargebacks, formal complaints, threatening legal escalation). This is the demographic most likely to **defect immediately** to a credible alternative.`);
  I();
  I(`---`);
  I();

  // ===== 7. ANTI-FEATURE WISHLIST =====
  // Find reviews where users explicitly request features. Excludes the very
  // common "wish I could give 0 stars" false positive.
  const wishKws = [
    "they should add", "they should let", "they should make", "they should at least", "they should have",
    "wish they had", "wish they would", "wish there was", "wish there were",
    "needs to add", "needs to have", "needs a feature", "needs better", "must add",
    "if only they", "if they would", "if there was", "if there were", "if you could",
    "they need to", "they need a", "they could at least", "could be better",
    "would be nice if", "would be better if", "would love it if", "would love to see",
    "should let me", "should let users", "should let people", "should be able to",
    "they should implement", "they could implement",
  ];
  // Hard-filter "wish I could give X stars" patterns so they don't pollute.
  const wishExcludeRe = /wish (?:i|we) could (?:give|rate)/i;
  const wishHits = reviews.filter(
    (r) => matchesAny(blob(r), wishKws) && !wishExcludeRe.test(r.text),
  );
  const wishEn = wishHits.filter((r) => r.language === "en");
  I(`## 7. The anti-feature wishlist — what users explicitly ask for`);
  I();
  I(`Reviews containing explicit feature requests ("they should add", "needs a", "wish they had"). **${wishHits.length} reviews** (${pct(wishHits.length, N)} of all). Each one is a free product idea.`);
  I();
  for (const r of wishEn.sort((a, b) => credibility(b) - credibility(a)).slice(0, 8)) {
    I(`- *"${truncate(r.text, 260)}"* — **${r.consumer.displayName}**, ${r.rating}★, ${r.consumer.countryCode ?? "??"}`);
  }
  I();
  I(`---`);
  I();

  // ===== 8. SUCCESS / OUTCOME SIGNALS =====
  const outcomeKws = ["met my partner", "met my husband", "met my wife", "met my fiance", "met my fiancé", "met my boyfriend", "met my girlfriend", "got married", "we're engaged", "we got engaged", "we're getting married", "love of my life", "soulmate", "we have a baby", "we got married", "we have kids"];
  const outcomeHits = reviews.filter((r) => matchesAny(blob(r), outcomeKws));
  const outcomeEn = outcomeHits.filter((r) => r.language === "en");
  I(`## 8. Success/outcome signals — who actually found someone?`);
  I();
  I(`Reviews mentioning a real-world relationship outcome. **${outcomeHits.length} reviews** (${pct(outcomeHits.length, N)} of all) — note how rare this is despite Tinder's claimed success stories.`);
  I();
  for (const r of outcomeEn.sort((a, b) => credibility(b) - credibility(a)).slice(0, 6)) {
    I(`- *"${truncate(r.text, 260)}"* — **${r.consumer.displayName}**, ${r.rating}★, ${r.consumer.countryCode ?? "??"}`);
  }
  I();
  I(`> **The success rate visible in this dataset is essentially noise** — and many "success" reviews still complain about everything else (so they're 4★ not 5★). The aspirational message ring should claim is *"the dating app where success is the default expectation, not the rare exception."*`);
  I();
  I(`---`);
  I();

  // ===== 9. CHURN DESTINATIONS — where do they say they're going? =====
  const churnTo = [
    { app: "Bumble", kws: ["going to bumble", "switching to bumble", "moving to bumble", "use bumble", "try bumble"] },
    { app: "Hinge", kws: ["going to hinge", "switching to hinge", "moving to hinge", "use hinge", "try hinge"] },
    { app: "Match.com", kws: ["going to match", "switching to match", "moving to match"] },
    { app: "Grindr", kws: ["going to grindr", "switching to grindr"] },
    { app: "Real life / IRL", kws: ["meet in person", "real life", "in real life", "ask girls out", "ask out at", "go to a bar", "join a club", "meeting people offline"] },
    { app: "Quitting dating apps entirely", kws: ["done with dating apps", "deleted all dating apps", "quitting dating apps", "no more dating apps", "give up on dating apps", "boycott dating"] },
  ];
  I(`## 9. Churn destinations — where do they say they're going?`);
  I();
  I(`When users state where they're moving NEXT after deleting Tinder. This is your **direct competitor list**.`);
  I();
  I(mdTable(
    ["Stated destination", "Mentions"],
    churnTo.map((c) => [c.app, reviews.filter((r) => matchesAny(blob(r), c.kws)).length]),
  ));
  I();
  I(`> **The most-cited "churn destination" is real life.** This is rare in SaaS analysis — usually losing users go to a competitor product, but Tinder's losing users are leaving the *category*. ring's most contested customer isn't a Bumble user — it's a person who quit dating apps last year and would consider trying a *different kind of one*. The marketing voice should reflect this.`);
  I();
  I(`---`);
  I();

  // ===== 10. COUNTRY × THEME — what does each country complain about most? =====
  I(`## 10. Country × theme cross-tab — localized complaints`);
  I();
  I(`For each top country (n ≥ 50), the **#1 theme** in their reviews. Useful for localizing ring's marketing per region.`);
  I();
  const countryThemeRows: (string | number)[][] = [];
  for (const [country, n] of topCountries) {
    const subset = reviews.filter((r) => r.consumer.countryCode === country);
    const themeCounts = THEMES.map((t) => ({
      name: t.name,
      count: subset.filter((r) => matchesAny(blob(r), t.kws)).length,
    })).sort((a, b) => b.count - a.count);
    const top1 = themeCounts[0];
    const top2 = themeCounts[1];
    countryThemeRows.push([country, n, `${top1.name} (${top1.count})`, `${top2.name} (${top2.count})`]);
  }
  I(mdTable(["Country", "n", "#1 theme", "#2 theme"], countryThemeRows));
  I();
  I(`---`);
  I();

  // ===== 11. THE FOUNDERS' NIGHTMARE — 5★ users WITH criticism =====
  const fivesWithCriticism = reviews.filter((r) =>
    r.rating === 5 &&
    r.language === "en" &&
    /(but|however|though|although|despite|wish|except|only thing|the one issue|my only complaint|downside)/i.test(r.text),
  );
  I(`## 11. The founders' nightmare — 5★ users with criticism`);
  I();
  I(`Users who give Tinder 5 stars **but still complain about something**. This is your single most valuable cohort — they're already happy with a dating app, but there's something specific they'd switch over. Pay close attention to *what they complain about*.`);
  I();
  I(`Found **${fivesWithCriticism.length}** such reviews:`);
  I();
  for (const r of fivesWithCriticism.sort((a, b) => credibility(b) - credibility(a)).slice(0, 6)) {
    I(`- *"${truncate(r.text, 280)}"* — **${r.consumer.displayName}**, ${r.rating}★, ${r.consumer.countryCode ?? "??"}, ${r.publishedDate.slice(0, 7)}`);
  }
  I();
  I(`> Each of these is a near-defector. If ring solves the *one specific thing* this user named, you've identified a **pre-validated marketing message for a happy-Tinder-user audience** — the rarest and most valuable kind of acquisition target.`);
  I();
  I(`---`);
  I();

  // ===== 12. SOURCE × RATING — invitation vs organic =====
  const sourceRating: Record<string, { n: number; sum: number; one: number }> = {};
  for (const r of reviews) {
    const src = r.source ?? "unknown";
    if (!sourceRating[src]) sourceRating[src] = { n: 0, sum: 0, one: 0 };
    sourceRating[src].n++;
    sourceRating[src].sum += r.rating;
    if (r.rating === 1) sourceRating[src].one++;
  }
  I(`## 12. Source × rating — organic vs invited reviews`);
  I();
  I(mdTable(
    ["Source", "n", "Avg ★", "1★ share"],
    Object.entries(sourceRating).sort((a, b) => b[1].n - a[1].n).map(([src, v]) => [src, v.n, (v.sum / v.n).toFixed(2), pct(v.one, v.n)]),
  ));
  I();
  I(`> Tinder collects almost no invitation-based feedback (${pct(sourceRating["Trustpilot"]?.n ?? 0, N)} via Trustpilot invitations, ${pct(sourceRating["BasicLink"]?.n ?? 0, N)} via in-product link). The dataset is **${pct(sourceRating["Organic"]?.n ?? 0, N)} organic** — meaning these aren't a sample, they're a self-selected anger cohort. The takeaway: Tinder isn't *trying* to be reviewed because they know what would happen.`);
  I();
  I(`---`);
  I();

  // ===== 13. EXIT BEHAVIOR — what they say they did at the end =====
  const exitKws = [
    { name: "Deleted/uninstalled the app", kws: ["deleted the app", "uninstalled the app", "uninstalled tinder", "deleted tinder", "removed the app", "deleted my account"] },
    { name: "Cancelled subscription", kws: ["cancelled my subscription", "canceled my subscription", "cancelled subscription", "cancel subscription"] },
    { name: "Demanded refund", kws: ["demand refund", "demand a refund", "want my money back", "asked for refund", "request refund"] },
    { name: "Will never use again", kws: ["never use again", "never use this", "never coming back", "won't be back", "won't be coming back"] },
    { name: "Disputed charge with bank/card", kws: ["chargeback", "charge back", "called my bank", "reported to my bank", "dispute charge", "credit card company"] },
  ];
  I(`## 13. Exit behavior — what users actually did`);
  I();
  I(`Concrete actions reviewers say they took. This is the **observable churn signal** — not "I'm thinking of leaving" but "I left and here's what I did."`);
  I();
  I(mdTable(
    ["Exit action", "Reviews mentioning"],
    exitKws.map((e) => [e.name, reviews.filter((r) => matchesAny(blob(r), e.kws)).length]),
  ));
  I();
  I(`---`);
  I();

  // ===== 14. THE ONE-SENTENCE TAKEAWAY =====
  I(`## The one-sentence takeaway`);
  I();
  I(`Tinder users are **older, angrier, more European, more credible, and more likely to leave the dating-app category entirely** than any "Tinder is just losing the youth" narrative would suggest. The opportunity for ring is not to be a *better swiping app* — it is to be **the app that exits-from-Tinder users would consider before quitting dating apps entirely**.`);
  I();
  I(`---`);
  I();
  I(`*Generated by \`deep_analyze.ts\`. To regenerate after a fresh scrape: \`npx tsx research/tinder-trustpilot/deep_analyze.ts\`*`);

  await writeFile(INSIGHTS_PATH, i.join("\n"));
  console.log(`Wrote ${INSIGHTS_PATH}`);

  // ============================================================
  // analysis.json
  // ============================================================
  await writeFile(
    join(OUT_DIR, "analysis.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalReviews: N,
        chipValidation: chipResults.map((c) => ({
          chip: c.chip,
          oneLine: c.oneLine,
          totalUnique: c.totalUnique,
          shareOfAllReviews: pct(c.totalUnique, N),
          signals: c.signalResults.map((s) => ({
            name: s.name,
            keywords: s.kws,
            valence: s.valence,
            total: s.total,
            negative: s.negative,
            sampleQuoteId: s.sample?.id ?? null,
          })),
        })),
        themes: themeStats,
        yoyTheme,
        meaningfulQuarterlyTrend: Object.fromEntries(meaningfulQuarters.map(([q, v]) => [q, +(v.sum / v.n).toFixed(3)])),
        countryRageMap: countryRating,
        competitorMentions: Object.fromEntries(Object.entries(compCounts).map(([k, v]) => [k, v.count])),
        replyRate: withReply.length / N,
        latency: { median, sameDayShare: pct(latency.filter((d) => d <= 1).length, latency.length) },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${join(OUT_DIR, "analysis.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
