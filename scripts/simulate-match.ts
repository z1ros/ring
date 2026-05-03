// End-to-end simulation: picks a seeded woman, runs the matchmaker via
// gpt-5-nano, sends the real email to pushokv165@gmail.com so you can see
// exactly what the production flow produces.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { findBestMatch, type ExtractedProfile, type CandidateInput } from "../src/lib/matching";
import { sendEmail, buildMatchEmail } from "../src/lib/email";

// Resend test mode only allows emailing the address you signed up with.
// `tovarnyurii@gmail.com` is the Resend signup email here.
const RECIPIENT_EMAIL = "tovarnyurii@gmail.com";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log(`\n🎬 simulating /admin match flow → ${RECIPIENT_EMAIL}\n`);

  const allLeads = await prisma.lead.findMany({
    where: { status: "COMPLETED", call: { isNot: null } },
    include: { call: true },
    orderBy: { createdAt: "desc" },
  });

  const withProfiles = allLeads
    .filter((l) => l.call?.extracted)
    .map((l) => ({ id: l.id, extracted: l.call!.extracted as ExtractedProfile }));

  // pick the first woman as the "user perspective"
  const user = withProfiles.find((l) => l.extracted.gender === "woman");
  if (!user) {
    console.log("❌ no women with extracted profiles found. run seed first.");
    return;
  }

  const candidates: CandidateInput[] = withProfiles.filter((l) => l.id !== user.id);
  if (candidates.length === 0) {
    console.log("❌ no candidates.");
    return;
  }

  console.log("👤 user perspective:");
  console.log(`   ${user.extracted.name}, ${user.extracted.age} (${user.extracted.gender})`);
  console.log(`   ${user.extracted.city}`);
  console.log(`   looking_for: ${user.extracted.looking_for}`);
  console.log(`   hobbies: ${(user.extracted.hobbies ?? []).join(", ")}\n`);

  console.log(`🤖 running 4-stage pipeline against ${candidates.length} candidates...`);
  const t0 = Date.now();
  const result = await findBestMatch({ user, candidates });
  console.log(`✅ matched in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  if (result.pipeline) {
    const p = result.pipeline;
    console.log("🔬 pipeline:");
    console.log(`   stage 1 filter:   ${p.candidates_total} → ${p.after_filter} viable (${p.timings_ms.filter}ms)`);
    console.log(`   stage 2 bilateral: → top ${p.bilateral_top} by score (${p.timings_ms.score}ms)`);
    console.log(`   stage 3 embed:    → top ${p.finalists_to_llm} by bilateral·0.7 + cosine·0.3 (${p.timings_ms.embed}ms)`);
    console.log(`   stage 4 llm pick: gpt-5-nano (${p.timings_ms.llm}ms)`);
    console.log(`   ─ finalists ─`);
    for (const f of p.finalists) {
      const arrow = f.id === result.match_lead_id ? "  → " : "    ";
      console.log(`${arrow}${f.name}: bilateral=${f.bilateral} cosine=${f.cosine} combined=${f.combined}`);
    }
    console.log("");
  }

  const match = candidates.find((c) => c.id === result.match_lead_id);
  if (!match) {
    console.log("❌ matched id not in candidates");
    return;
  }

  console.log("💕 match:");
  console.log(`   ${match.extracted.name}, ${match.extracted.age} (${match.extracted.gender})`);
  console.log(`   ${match.extracted.city}`);
  console.log(`   hobbies: ${(match.extracted.hobbies ?? []).join(", ")}\n`);
  console.log(`📝 reasoning: ${result.reasoning}\n`);
  console.log(`☕ cafe: ${result.cafe_name}`);
  console.log(`   📍 ${result.cafe_address}`);
  console.log(`   🏘️  ${result.cafe_neighborhood}`);
  console.log(`   📅 ${result.suggested_when}`);
  console.log(`💬 pitch: ${result.meeting_pitch}\n`);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${result.cafe_name}, ${result.cafe_address}`,
  )}`;

  console.log(`📧 building email + sending to ${RECIPIENT_EMAIL}...`);
  const { subject, html } = buildMatchEmail({
    match: match.extracted,
    cafe: result.cafe_name,
    cafeAddress: result.cafe_address,
    suggestedWhen: result.suggested_when,
    pitch: result.meeting_pitch,
    mapsUrl,
  });

  const sent = await sendEmail({ to: RECIPIENT_EMAIL, subject, html });

  console.log(`\n✅ email sent. resend id: ${sent.id}`);
  console.log(`   from:    ${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}`);
  console.log(`   to:      ${RECIPIENT_EMAIL}`);
  console.log(`   subject: ${subject}`);
  console.log(`\n📬 check ur inbox — should arrive within ~30 seconds.`);
  console.log(`   if not in inbox, check spam (resend's onboarding@resend.dev sometimes lands there).\n`);
}

main()
  .catch((e) => { console.error("\n❌ ERROR:", e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
