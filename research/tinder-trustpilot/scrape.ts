// Trustpilot scraper for https://www.trustpilot.com/review/tinder.com
//
// Trustpilot is behind an AWS WAF JS challenge, so a plain fetch returns a
// ~1KB interstitial. We drive a real Chromium via Playwright instead and
// pull the rich `__NEXT_DATA__` JSON from each page — this contains far more
// fields than the rendered HTML (consumer profile, experience date, reply,
// verification labels, language, etc.).
//
// Setup (from repo root):
//   npm i -D playwright tsx
//   npx playwright install chromium
//
// Run:
//   npx tsx research/tinder-trustpilot/scrape.ts
//
// IMPORTANT — Trustpilot caps unauthenticated pagination at 10 pages (200
// reviews) per filter combination. Past page 10 it 403s and redirects to
// /users/connect (login). To get the full review set we therefore SLICE the
// requests by (stars × language): each slice is its own 200-review window,
// and we dedupe globally by review id.
//
// Optional env vars:
//   DOMAIN=tinder.com          target business unit (default: tinder.com)
//   OUT_DIR=./out              output directory (default: ./out next to this file)
//   HEADFUL=1                  show the browser window
//   MAX_PAGES_PER_SLICE=10     hard cap per slice (Trustpilot enforces 10)
//   STARS=1,2,3,4,5            comma list of star ratings to slice on
//   LANGUAGES=auto             "auto" = derive from page-1 language breakdown,
//                              or "all" for one big slice, or "en,de,fr"

import { chromium, type Browser, type Page } from "playwright";
import { mkdir, writeFile, appendFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOMAIN = process.env.DOMAIN ?? "tinder.com";
const OUT_DIR = process.env.OUT_DIR ?? join(HERE, "out");
const HEADFUL = process.env.HEADFUL === "1";
const MAX_PAGES_PER_SLICE = Number(process.env.MAX_PAGES_PER_SLICE ?? 10);
const STARS = (process.env.STARS ?? "1,2,3,4,5")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LANGUAGES_ENV = process.env.LANGUAGES ?? "auto";
const DATE_SLICES = ["last30days", "last3months", "last6months", "last12months"];
// "auto" → resume from the most recent *.jsonl in OUT_DIR for this DOMAIN.
// "off"  → start fresh.
// path   → resume from this specific file.
const RESUME = process.env.RESUME ?? "auto";

type Review = {
  id: string;
  rating: number;
  title: string;
  text: string;
  language: string | null;
  source: string | null;
  likes: number;
  filtered: boolean;
  isPending: boolean;
  hasUnhandledReports: boolean;
  publishedDate: string;
  experiencedDate: string | null;
  updatedDate: string | null;
  submittedDate: string | null;
  consumer: {
    id: string;
    displayName: string;
    imageUrl: string | null;
    countryCode: string | null;
    numberOfReviews: number | null;
    hasImage: boolean;
    isVerified: boolean;
  };
  consumersReviewCountOnSameDomain: number | null;
  consumersReviewCountOnSameLocation: number | null;
  reply: { message: string; publishedDate: string } | null;
  productReviews: unknown;
  location: unknown;
  labels: unknown;
  report: unknown;
  url: string;
};

type BusinessUnit = {
  id: string;
  displayName: string;
  identifyingName: string;
  trustScore: number;
  stars: number;
  numberOfReviews: number;
  numberOfFilteredReviews: number | null;
  websiteUrl: string;
  websiteTitle: string;
  profileImageUrl: string | null;
  isClaimed: boolean;
  isClosed: boolean;
  isCollectingReviews: boolean;
  hasCollectedIncentivisedReviews: boolean;
  contactInfo: unknown;
  categories: unknown;
  breadcrumb: unknown;
  verification: unknown;
  consumerAlerts: unknown;
  replyBehavior: unknown;
  languageBreakdown: unknown;
};

async function fetchPage(page: Page, url: string): Promise<any> {
  // goto, then wait for the WAF challenge to resolve and the Next.js data
  // blob to land. Trustpilot ships __NEXT_DATA__ in the SSR response, so once
  // the challenge clears the script tag is in the DOM.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("script#__NEXT_DATA__", {
    state: "attached",
    timeout: 60_000,
  });
  const json = await page.$eval(
    "script#__NEXT_DATA__",
    (el) => (el as HTMLScriptElement).textContent ?? "",
  );
  return JSON.parse(json);
}

function extractReviews(nextData: any): Review[] {
  const reviews = nextData?.props?.pageProps?.reviews ?? [];
  return reviews.map((r: any): Review => ({
    id: r.id,
    rating: r.rating,
    title: r.title ?? "",
    text: r.text ?? "",
    language: r.language ?? null,
    source: r.source ?? null,
    likes: r.likes ?? 0,
    filtered: !!r.filtered,
    isPending: !!r.isPending,
    hasUnhandledReports: !!r.hasUnhandledReports,
    publishedDate: r.dates?.publishedDate ?? "",
    experiencedDate: r.dates?.experiencedDate ?? null,
    updatedDate: r.dates?.updatedDate ?? null,
    submittedDate: r.dates?.submittedDate ?? null,
    consumer: {
      id: r.consumer?.id ?? "",
      displayName: r.consumer?.displayName ?? "",
      imageUrl: r.consumer?.imageUrl ?? null,
      countryCode: r.consumer?.countryCode ?? null,
      numberOfReviews: r.consumer?.numberOfReviews ?? null,
      hasImage: !!r.consumer?.hasImage,
      isVerified: !!r.consumer?.isVerified,
    },
    consumersReviewCountOnSameDomain: r.consumersReviewCountOnSameDomain ?? null,
    consumersReviewCountOnSameLocation: r.consumersReviewCountOnSameLocation ?? null,
    reply: r.reply
      ? { message: r.reply.message ?? "", publishedDate: r.reply.publishedDate ?? "" }
      : null,
    productReviews: r.productReviews ?? null,
    location: r.location ?? null,
    labels: r.labels ?? null,
    report: r.report ?? null,
    url: `https://www.trustpilot.com/reviews/${r.id}`,
  }));
}

function extractBusinessUnit(nextData: any): BusinessUnit | null {
  const bu = nextData?.props?.pageProps?.businessUnit;
  if (!bu) return null;
  const filters = nextData?.props?.pageProps?.filters;
  return {
    id: bu.id,
    displayName: bu.displayName ?? "",
    identifyingName: bu.identifyingName ?? "",
    trustScore: bu.trustScore ?? 0,
    stars: bu.stars ?? 0,
    numberOfReviews:
      typeof bu.numberOfReviews === "number"
        ? bu.numberOfReviews
        : bu.numberOfReviews?.total ?? 0,
    numberOfFilteredReviews: filters?.totalNumberOfFilteredReviews ?? null,
    websiteUrl: bu.websiteUrl ?? "",
    websiteTitle: bu.websiteTitle ?? "",
    profileImageUrl: bu.profileImageUrl ?? null,
    isClaimed: !!bu.isClaimed,
    isClosed: !!bu.isClosed,
    isCollectingReviews: !!bu.isCollectingReviews,
    hasCollectedIncentivisedReviews: !!bu.hasCollectedIncentivisedReviews,
    contactInfo: bu.contactInfo ?? null,
    categories: bu.categories ?? null,
    breadcrumb: bu.breadcrumb ?? null,
    verification: bu.verification ?? null,
    consumerAlerts: bu.consumerAlerts ?? null,
    replyBehavior: bu.activity?.replyBehavior ?? null,
    languageBreakdown: filters?.reviewStatistics?.reviewLanguages ?? null,
  };
}

type Slice = { stars?: string; languages?: string; date?: string; sort?: string };

function buildUrl(domain: string, page: number, slice: Slice): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (slice.languages) params.set("languages", slice.languages);
  if (slice.stars) params.set("stars", slice.stars);
  if (slice.date) params.set("date", slice.date);
  if (slice.sort) params.set("sort", slice.sort);
  const qs = params.toString();
  return `https://www.trustpilot.com/review/${domain}${qs ? "?" + qs : ""}`;
}

function isAuthWall(data: any): boolean {
  // Trustpilot redirects unauthenticated requests for page>10 to /users/connect.
  return data?.page === "/users/connect" || data?.props?.pageProps?.redirectUrl;
}

function describeSlice(s: Slice): string {
  const parts: string[] = [];
  if (s.stars) parts.push(`stars=${s.stars}`);
  if (s.languages) parts.push(`lang=${s.languages}`);
  if (s.date) parts.push(`date=${s.date}`);
  if (s.sort) parts.push(`sort=${s.sort}`);
  return parts.join(" ") || "(default)";
}

async function fetchWithRetry(page: Page, url: string): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await fetchPage(page, url);
    } catch (err) {
      attempt++;
      if (attempt >= 3) throw err;
      const wait = 2000 * attempt;
      console.warn(`[scrape] retry ${attempt} after ${wait}ms — ${(err as Error).message}`);
      await page.waitForTimeout(wait);
    }
  }
}

async function findLatestJsonl(): Promise<string | null> {
  if (!existsSync(OUT_DIR)) return null;
  const files = (await readdir(OUT_DIR))
    .filter((f) => f.startsWith(`${DOMAIN}-`) && f.endsWith(".jsonl"))
    .sort();
  return files.length ? join(OUT_DIR, files[files.length - 1]) : null;
}

async function loadExistingIds(path: string): Promise<Set<string>> {
  const set = new Set<string>();
  const buf = await readFile(path, "utf8");
  for (const line of buf.split("\n")) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      if (r?.id) set.add(r.id);
    } catch {}
  }
  return set;
}

async function scrapeSlice(
  page: Page,
  slice: Slice,
  seen: Set<string>,
  reviewsPath: string,
): Promise<{ added: number; firstPageData: any | null; pagesFetched: number }> {
  let added = 0;
  let firstPageData: any = null;
  let pagesFetched = 0;
  let totalPagesInSlice = 1;

  for (let p = 1; p <= Math.min(MAX_PAGES_PER_SLICE, totalPagesInSlice); p++) {
    const url = buildUrl(DOMAIN, p, slice);
    const data = await fetchWithRetry(page, url);
    pagesFetched++;

    if (isAuthWall(data)) {
      console.warn(`[scrape]   slice ${describeSlice(slice)} hit auth wall at page ${p}`);
      break;
    }

    if (p === 1) {
      firstPageData = data;
      totalPagesInSlice =
        data?.props?.pageProps?.filters?.pagination?.totalPages ?? 1;
    }

    const reviews = extractReviews(data);
    if (reviews.length === 0) break;

    let sliceAdded = 0;
    for (const r of reviews) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      await appendFile(reviewsPath, JSON.stringify(r) + "\n");
      sliceAdded++;
    }
    added += sliceAdded;
    console.log(
      `[scrape]   ${describeSlice(slice)} p${p}/${totalPagesInSlice}  +${sliceAdded} new (slice ${added}, total ${seen.size})`,
    );

    if (p >= totalPagesInSlice) break;
    await page.waitForTimeout(800 + Math.random() * 700);
  }

  return { added, firstPageData, pagesFetched };
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  // Resume: append to the most recent JSONL and seed the dedupe set with its IDs.
  // This protects whatever we've already scraped — re-runs only ADD new reviews.
  let reviewsPath: string;
  let resumed = 0;
  const seen = new Set<string>();
  if (RESUME === "off") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    reviewsPath = join(OUT_DIR, `${DOMAIN}-${stamp}.jsonl`);
  } else {
    const existing =
      RESUME === "auto" ? await findLatestJsonl() : (RESUME as string);
    if (existing && existsSync(existing)) {
      reviewsPath = existing;
      const ids = await loadExistingIds(existing);
      ids.forEach((id) => seen.add(id));
      resumed = seen.size;
      console.log(`[scrape] resume: ${resumed} existing reviews loaded from ${reviewsPath}`);
    } else {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      reviewsPath = join(OUT_DIR, `${DOMAIN}-${stamp}.jsonl`);
    }
  }
  const summaryPath = reviewsPath.replace(/\.jsonl$/, ".summary.json");

  console.log(`[scrape] target: ${DOMAIN}`);
  console.log(`[scrape] writing reviews -> ${reviewsPath}`);

  const browser: Browser = await chromium.launch({ headless: !HEADFUL });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    locale: "en-US",
    viewport: { width: 1366, height: 900 },
  });
  const page = await ctx.newPage();

  let businessUnit: BusinessUnit | null = null;
  const sliceStats: Array<{ slice: Slice; added: number; pagesFetched: number }> = [];

  try {
    // Probe page 1 with no filters to grab business metadata + language list.
    const probe = await fetchWithRetry(page, buildUrl(DOMAIN, 1, { languages: "all" }));
    businessUnit = extractBusinessUnit(probe);
    console.log(
      `[scrape] business: ${businessUnit?.displayName} — ${businessUnit?.numberOfReviews} total reviews`,
    );

    // Decide which language slices to iterate.
    let languages: string[];
    if (LANGUAGES_ENV === "auto") {
      const breakdown =
        probe?.props?.pageProps?.filters?.reviewStatistics?.reviewLanguages ?? [];
      languages = breakdown
        .map((l: any) => l.isoCode)
        .filter((c: string) => c && c !== "all");
      console.log(`[scrape] languages (auto): ${languages.join(",")}`);
    } else {
      languages = LANGUAGES_ENV.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Build slices. (stars × language) keeps every slice well under the 200 cap.
    const slices: Slice[] = [];
    for (const stars of STARS) {
      for (const lang of languages) {
        slices.push({ stars, languages: lang });
      }
    }
    console.log(`[scrape] slicing into ${slices.length} (stars × language) windows`);

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      console.log(`[scrape] slice ${i + 1}/${slices.length}: ${describeSlice(slice)}`);
      const result = await scrapeSlice(page, slice, seen, reviewsPath);
      sliceStats.push({ slice, added: result.added, pagesFetched: result.pagesFetched });

      // Escalation: if this slice maxed the 10-page cap, the bucket has older
      // reviews we couldn't reach. Try other sort orders and date sub-windows
      // so each sub-slice falls under the cap with a *different* 200 reviews.
      // (Empirically: sort=oldest/usefulness are silently ignored; only
      // sort=recency [default] and sort=relevance produce different windows.
      // last30days/3mo/6mo are subsets of the recency top-200, so we only
      // pair date filters with sort=relevance to maximize new uniques.)
      if (result.pagesFetched >= MAX_PAGES_PER_SLICE) {
        console.log(`[scrape]   ${describeSlice(slice)} maxed cap → escalating`);
        const subSlices: Slice[] = [
          { ...slice, sort: "relevance" },
          ...DATE_SLICES.map((date) => ({ ...slice, sort: "relevance", date })),
        ];
        for (const sub of subSlices) {
          const subRes = await scrapeSlice(page, sub, seen, reviewsPath);
          sliceStats.push({ slice: sub, added: subRes.added, pagesFetched: subRes.pagesFetched });
        }
      }
    }
  } finally {
    await browser.close();
  }

  const total = seen.size;
  const newThisRun = total - resumed;
  const claimed = businessUnit?.numberOfReviews ?? 0;
  const coverage = claimed ? ((total / claimed) * 100).toFixed(1) + "%" : "n/a";
  const stillCapped = sliceStats.filter(
    (s) => s.pagesFetched >= MAX_PAGES_PER_SLICE,
  );

  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        domain: DOMAIN,
        scrapedAt: new Date().toISOString(),
        businessUnit,
        uniqueReviewsScraped: total,
        resumedFromPriorRuns: resumed,
        newThisRun,
        claimedTotal: claimed,
        coverage,
        stillCappedSlices: stillCapped.map((s) => s.slice),
        slices: sliceStats,
        reviewsFile: reviewsPath,
      },
      null,
      2,
    ),
  );
  console.log(
    `[scrape] done. ${total} unique (${newThisRun} new this run) / ${claimed} claimed (${coverage}). ` +
      `${stillCapped.length} slices still capped. summary -> ${summaryPath}`,
  );
}

main().catch((err) => {
  console.error("[scrape] fatal:", err);
  process.exit(1);
});
