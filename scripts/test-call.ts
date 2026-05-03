// Trigger a real outbound call from Vapi to a phone number, end-to-end.
// Use this to test the assistant + structured outputs without going through
// the website form.
//
// Usage:
//   npx tsx --env-file=.env scripts/test-call.ts +15551234567

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("usage: npx tsx --env-file=.env scripts/test-call.ts +15551234567");
    process.exit(1);
  }

  if (!/^\+1\d{10}$/.test(phone)) {
    console.error("phone must be E.164 US format like +15551234567");
    process.exit(1);
  }

  // create a lead so we can correlate the webhook later
  const lead = await prisma.lead.create({
    data: {
      phone,
      email: `test-${Date.now()}@ring.app`,
      status: "QUEUED",
    },
  });
  console.log(`📝 created lead: ${lead.id}\n`);

  // place the call via Vapi
  console.log("📞 placing call...");
  const res = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
    },
    body: JSON.stringify({
      assistantId: process.env.VAPI_ASSISTANT_ID,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: phone },
      metadata: { leadId: lead.id },
    }),
  });

  if (!res.ok) {
    console.error(`❌ vapi /call ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const call = (await res.json()) as { id: string; status: string };

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "CALLING", vapiCallId: call.id },
  });

  console.log(`✅ call queued.`);
  console.log(`   vapiCallId: ${call.id}`);
  console.log(`   status:     ${call.status}`);
  console.log(`\n📱 ur phone (${phone}) should ring within ~10 seconds.`);
  console.log(`   answer + go through the convo + hang up.\n`);
  console.log(`then check extraction with:`);
  console.log(`   npx tsx --env-file=.env scripts/check-vapi-extraction.ts\n`);
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
