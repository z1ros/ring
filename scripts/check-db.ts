import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const leadCount = await prisma.lead.count();
  const callCount = await prisma.call.count();

  console.log(`\n📊 totals: ${leadCount} leads, ${callCount} calls\n`);

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { call: true },
  });

  if (leads.length === 0) {
    console.log("no leads yet — DB is empty.\n");
    return;
  }

  for (const lead of leads) {
    console.log("─".repeat(60));
    console.log(`Lead: ${lead.id}`);
    console.log(`  phone:      ${lead.phone}`);
    console.log(`  email:      ${lead.email ?? "(none)"}`);
    console.log(`  status:     ${lead.status}`);
    console.log(`  vapiCallId: ${lead.vapiCallId ?? "(none)"}`);
    console.log(`  createdAt:  ${lead.createdAt.toISOString()}`);

    if (lead.call) {
      console.log(`  Call:`);
      console.log(`    duration:     ${lead.call.durationSec ?? "?"}s`);
      console.log(`    endedReason:  ${lead.call.endedReason ?? "(none)"}`);
      console.log(`    recordingUrl: ${lead.call.recordingUrl ? "✅ saved" : "❌ none"}`);
      console.log(`    transcript:   ${lead.call.transcript ? `✅ ${lead.call.transcript.length} chars` : "❌ none"}`);
      console.log(`    extracted:    ${lead.call.extracted ? "✅ saved" : "❌ none"}`);
      if (lead.call.extracted) {
        const json = JSON.stringify(lead.call.extracted, null, 2)
          .split("\n")
          .map((l) => `                  ${l}`)
          .join("\n");
        console.log(`    fields:\n${json}`);
      }
    } else {
      console.log(`  Call:         ❌ none yet (webhook hasn't fired)`);
    }
  }
  console.log("─".repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
