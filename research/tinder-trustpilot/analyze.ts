// Analyze the scraped Tinder reviews to surface common pain points and
// validate ring's thesis (no swipes, voice AI, 1-ring-1-date, 0% spam).
//
// Run: npx tsx research/tinder-trustpilot/analyze.ts
//
// Outputs:
//   - console report: theme counts, rating distribution, sample quotes
//   - out/analysis.json: machine-readable for follow-up work

import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "out");

type Review = {
  id: string;
  rating: number;
  title: string;
  text: string;
  language: string | null;
  publishedDate: string;
  experiencedDate: string | null;
  source: string | null;
  likes: number;
  consumer: { displayName: string; countryCode: string | null };
  reply: { message: string; publishedDate: string } | null;
};

// Theme = pain point or product signal we care about. Keywords are case-
// insensitive substring matches across title+text. Multi-word phrases first
// for precision; single words last as fallback. EN-focused (en is 60% of
// reviews); non-EN reviews counted only if their keyword fires.
const THEMES: Array<{ name: string; keywords: string[]; ringHook: string }> = [
  {
    name: "Fake profiles / bots / scammers",
    keywords: ["fake profile", "fake account", "fake people", "bots", "bot ", "scam", "scammer", "catfish", "fraud"],
    ringHook: "voice-AI interview screens out bots — no one fakes a 5-min phone call",
  },
  {
    name: "No matches / shadow ban / 0 likes",
    keywords: ["no match", "no matches", "zero match", "no likes", "0 likes", "shadow ban", "shadowban", "shadow-ban", "no one likes", "nobody likes"],
    ringHook: "no swipe-roulette — match quality comes from interview, not photos",
  },
  {
    name: "Pay-to-win / forced subscription",
    keywords: ["paywall", "pay to", "force you to pay", "have to pay", "must pay", "useless without", "useless if you don't pay", "money grab", "money-grab", "ripoff", "rip off", "rip-off", "scam money", "waste of money", "waste money"],
    ringHook: "no premium gating — every interview gets the same shot at being matched",
  },
  {
    name: "Subscription / billing / cancel issues",
    keywords: ["subscription", "auto renew", "auto-renew", "auto renewal", "charge", "charged me", "refund", "cancel", "billing", "credit card"],
    ringHook: "lead-based, not subscription — no auto-renew trap",
  },
  {
    name: "Banned for no reason / unjust ban",
    keywords: ["banned", "ban me", "got banned", "account ban", "permanently ban", "no reason", "without reason", "no warning", "no explanation"],
    ringHook: "human review on ban appeals; one phone identity = harder to mass-ban innocent users",
  },
  {
    name: "Boost / Super Like rip-offs",
    keywords: ["boost", "super like", "superlike", "gold", "platinum", "premium", "tinder plus"],
    ringHook: "no power-ups for sale — quality interview replaces 'pay for visibility'",
  },
  {
    name: "Algorithm / ELO / unfair distribution",
    keywords: ["algorithm", "elo", "rating system", "unfair", "manipulat", "deceptive"],
    ringHook: "transparent matching: match because answers fit, not because the algorithm hid you",
  },
  {
    name: "Bad / hostile customer service",
    keywords: ["customer service", "support", "no response", "no reply", "no help", "no human", "robot reply", "auto reply", "auto-reply"],
    ringHook: "small ops team + lead-level data = real humans can actually help",
  },
  {
    name: "Swipe fatigue / superficial / shallow",
    keywords: ["swipe fatigue", "tired of swiping", "superficial", "shallow", "looks only", "looks-based", "appearance only", "judged on looks", "just photos"],
    ringHook: "no swipes, period — voice interview surfaces personality before photo",
  },
  {
    name: "Privacy / data leaks / location",
    keywords: ["privacy", "location", "stalker", "stalk", "data leak", "personal info", "doxx", "dox "],
    ringHook: "minimal data: phone + voice answers, no continuous location tracking",
  },
  {
    name: "Ghost / no replies / dead app",
    keywords: ["ghost", "no reply after", "no response after", "dead app", "no one talks", "no one responds", "no conversations"],
    ringHook: "1 ring · 1 date — only matches that explicitly opted in, fewer ghosts",
  },
  {
    name: "Sex workers / OnlyFans spam",
    keywords: ["only fans", "onlyfans", "of girls", "snapchat girls", "instagram promo", "promotion", "sex worker", "escort"],
    ringHook: "voice interview filters out OF/IG promo accounts before they reach matches",
  },
  {
    name: "Gender imbalance / unrealistic",
    keywords: ["men outnumber", "ratio", "no women", "no men", "as a man", "as a woman", "guys swipe", "girls swipe", "every guy"],
    ringHook: "interview-based onboarding lets ring engineer healthier ratios per cohort",
  },
];

async function loadAllReviews(): Promise<Review[]> {
  const files = (await readdir(OUT_DIR)).filter(
    (f) => f.startsWith("tinder.com-") && f.endsWith(".jsonl"),
  );
  const all: Review[] = [];
  for (const f of files) {
    const buf = await readFile(join(OUT_DIR, f), "utf8");
    for (const line of buf.split("\n")) {
      if (!line) continue;
      try {
        all.push(JSON.parse(line));
      } catch {}
    }
  }
  // Dedupe (the file should already be unique, but be safe across files).
  const byId = new Map<string, Review>();
  for (const r of all) byId.set(r.id, r);
  return [...byId.values()];
}

function pad(s: string, w: number) {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

function truncate(s: string, max: number): string {
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function pct(n: number, d: number) {
  return d ? ((n / d) * 100).toFixed(1) + "%" : "0%";
}

async function main() {
  const reviews = await loadAllReviews();
  console.log(`Loaded ${reviews.length} unique reviews\n`);

  // 1. Rating distribution
  const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) byRating[r.rating] = (byRating[r.rating] ?? 0) + 1;
  console.log("=== Rating distribution ===");
  for (const star of [5, 4, 3, 2, 1]) {
    const n = byRating[star] ?? 0;
    console.log(`  ${star}★  ${pad(String(n), 5)} ${pct(n, reviews.length)}`);
  }
  const negative = reviews.filter((r) => r.rating <= 2);
  const positive = reviews.filter((r) => r.rating >= 4);
  console.log(`  → ${negative.length} negative (1-2★), ${positive.length} positive (4-5★)\n`);

  // 2. Language distribution
  const byLang: Record<string, number> = {};
  for (const r of reviews) {
    const k = r.language ?? "unknown";
    byLang[k] = (byLang[k] ?? 0) + 1;
  }
  console.log("=== Language distribution (top 10) ===");
  Object.entries(byLang)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([k, v]) => console.log(`  ${pad(k, 6)} ${pad(String(v), 5)} ${pct(v, reviews.length)}`));
  console.log();

  // 3. Country distribution
  const byCountry: Record<string, number> = {};
  for (const r of reviews) {
    const k = r.consumer.countryCode ?? "??";
    byCountry[k] = (byCountry[k] ?? 0) + 1;
  }
  console.log("=== Reviewer country (top 10) ===");
  Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([k, v]) => console.log(`  ${pad(k, 4)} ${pad(String(v), 5)} ${pct(v, reviews.length)}`));
  console.log();

  // 4. Theme tally — count any review whose title+text matches any keyword.
  // Per-theme: total hits, hits among 1-2★ reviews, hits among 4-5★, top quote.
  console.log("=== Pain-point themes (from title + text, case-insensitive) ===\n");
  const themeStats = THEMES.map((theme) => {
    const hits: Review[] = [];
    for (const r of reviews) {
      const blob = `${r.title}\n${r.text}`.toLowerCase();
      if (theme.keywords.some((k) => blob.includes(k.toLowerCase()))) {
        hits.push(r);
      }
    }
    const negHits = hits.filter((r) => r.rating <= 2).length;
    const posHits = hits.filter((r) => r.rating >= 4).length;
    // Pick a representative quote: longest 1-2★ review hit, in English.
    const sample = hits
      .filter((r) => r.rating <= 2 && r.language === "en")
      .sort((a, b) => b.text.length - a.text.length)[0];
    return { theme, hits, negHits, posHits, sample };
  }).sort((a, b) => b.hits.length - a.hits.length);

  for (const s of themeStats) {
    const total = s.hits.length;
    const negShare = pct(s.negHits, negative.length);
    console.log(
      `▸ ${s.theme.name}\n` +
        `   ${pad(String(total), 4)} reviews mention this  |  ${s.negHits} are 1-2★ (${negShare} of all negative)  |  ${s.posHits} are 4-5★`,
    );
    if (s.sample) {
      console.log(
        `   quote (${s.sample.rating}★, ${s.sample.consumer.countryCode ?? "??"}): "${truncate(s.sample.text, 220)}"`,
      );
    }
    console.log(`   ring angle → ${s.theme.ringHook}\n`);
  }

  // 5. Most-helpful (likes-weighted) negative reviews — these are the loudest
  // signals because other Trustpilot users found them useful.
  console.log("=== Most-upvoted negative reviews (signal of resonance) ===\n");
  const topNeg = negative
    .filter((r) => r.language === "en")
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 8);
  for (const r of topNeg) {
    console.log(
      `  [${r.rating}★ · ${r.likes} likes · ${r.consumer.countryCode ?? "??"}] ${r.title}\n` +
        `     ${truncate(r.text, 240)}\n`,
    );
  }

  // 6. Sentiment over time (per-quarter rating average) — is Tinder sentiment
  // getting worse? Useful for ring's "now is the moment" pitch.
  const byQuarter: Record<string, { sum: number; n: number }> = {};
  for (const r of reviews) {
    if (!r.publishedDate) continue;
    const d = new Date(r.publishedDate);
    if (isNaN(+d)) continue;
    const q = `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    if (!byQuarter[q]) byQuarter[q] = { sum: 0, n: 0 };
    byQuarter[q].sum += r.rating;
    byQuarter[q].n++;
  }
  console.log("=== Avg rating by quarter ===");
  Object.entries(byQuarter)
    .sort()
    .slice(-12)
    .forEach(([q, v]) =>
      console.log(`  ${q}  avg ${(v.sum / v.n).toFixed(2)}★  n=${v.n}`),
    );
  console.log();

  // 7. Persist machine-readable
  await writeFile(
    join(OUT_DIR, "analysis.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalReviews: reviews.length,
        ratingDistribution: byRating,
        languageDistribution: byLang,
        countryDistribution: byCountry,
        themes: themeStats.map((s) => ({
          name: s.theme.name,
          ringHook: s.theme.ringHook,
          totalHits: s.hits.length,
          negativeHits: s.negHits,
          positiveHits: s.posHits,
          sampleQuote: s.sample
            ? {
                id: s.sample.id,
                rating: s.sample.rating,
                country: s.sample.consumer.countryCode,
                title: s.sample.title,
                text: s.sample.text,
              }
            : null,
        })),
        topNegativeReviews: topNeg.map((r) => ({
          id: r.id,
          rating: r.rating,
          likes: r.likes,
          country: r.consumer.countryCode,
          title: r.title,
          text: r.text,
        })),
        avgRatingByQuarter: Object.fromEntries(
          Object.entries(byQuarter).map(([q, v]) => [q, +(v.sum / v.n).toFixed(2)]),
        ),
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
