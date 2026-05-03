// Smoke-test the matching engine end-to-end against the seeded data,
// without involving the API route or sending email.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { findBestMatch } from "../src/lib/matching";
import type { ExtractedProfile, CandidateInput } from "../src/lib/matching";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // pick the most recent woman from the seeds
  const allLeads = await prisma.lead.findMany({
    where: { status: "COMPLETED", call: { isNot: null } },
    include: { call: true },
    orderBy: { createdAt: "desc" },
  });

  const withProfiles = allLeads
    .filter((l) => l.call?.extracted)
    .map((l) => ({ id: l.id, extracted: l.call!.extracted as ExtractedProfile }));

  const woman = withProfiles.find((l) => l.extracted.gender === "woman");
  if (!woman) {
    console.log("no women found in DB — run seed first.");
    return;
  }

  const candidates: CandidateInput[] = withProfiles.filter((l) => l.id !== woman.id);

  console.log(`\n🎯 testing match for: ${woman.extracted.name}, ${woman.extracted.age}, ${woman.extracted.city}`);
  console.log(`   looking for: ${woman.extracted.looking_for}`);
  console.log(`   ${candidates.length} candidates\n`);

  const t0 = Date.now();
  const result = await findBestMatch({ user: woman, candidates });
  const ms = Date.now() - t0;

  const matched = candidates.find((c) => c.id === result.match_lead_id)?.extracted;

  console.log(`✅ match in ${ms}ms (gpt-5-nano)\n`);
  console.log(`   → ${matched?.name}, ${matched?.age} (${matched?.gender}) in ${matched?.city}`);
  console.log(`   reasoning: ${result.reasoning}`);
  console.log(`\n   ☕ cafe: ${result.cafe_name} in ${result.cafe_neighborhood}`);
  console.log(`   pitch: ${result.meeting_pitch}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
