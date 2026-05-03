// Debug a stuck call: pull the call from Vapi's API directly, see if they
// have the end-of-call data, and if so manually fire our webhook to recover
// it into Supabase.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const VAPI_BASE = "https://api.vapi.ai";

async function main() {
  // Find the most recent CALLING lead (the one that didn't get a webhook).
  const stuck = await prisma.lead.findFirst({
    where: { status: "CALLING", vapiCallId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (!stuck?.vapiCallId) {
    console.log("no stuck CALLING leads with a vapiCallId — nothing to recover.");
    return;
  }

  console.log(`\n🔍 stuck lead: ${stuck.id}`);
  console.log(`   phone:      ${stuck.phone}`);
  console.log(`   status:     ${stuck.status}`);
  console.log(`   vapiCallId: ${stuck.vapiCallId}`);
  console.log(`   createdAt:  ${stuck.createdAt.toISOString()}\n`);

  // Pull the call from Vapi.
  console.log("📡 fetching call from vapi...");
  const res = await fetch(`${VAPI_BASE}/call/${stuck.vapiCallId}`, {
    headers: { Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}` },
  });

  if (!res.ok) {
    const t = await res.text();
    console.error(`❌ vapi /call ${res.status}: ${t}`);
    return;
  }

  const call = (await res.json()) as Record<string, unknown> & {
    status?: string;
    endedAt?: string;
    startedAt?: string;
    endedReason?: string;
    transcript?: string;
    recordingUrl?: string;
    stereoRecordingUrl?: string;
    summary?: string;
    analysis?: { structuredData?: Record<string, unknown>; summary?: string };
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
      structuredOutputs?: Record<string, { name: string; result: unknown }>;
    };
    messages?: unknown[];
  };

  console.log("✅ vapi call data:");
  console.log(`   status:        ${call.status ?? "(none)"}`);
  console.log(`   endedAt:       ${call.endedAt ?? "(none)"}`);
  console.log(`   endedReason:   ${call.endedReason ?? "(none)"}`);
  console.log(`   transcript:    ${call.transcript ? `${call.transcript.length} chars` : "(none)"}`);
  console.log(`   recordingUrl:  ${call.recordingUrl ? "✅" : "❌"}`);
  console.log(`   analysis:      ${call.analysis ? "✅" : "❌"}`);
  // Flatten Vapi's per-output map: { uuid: {name, result} } → { name, age, ... }
  const flat: Record<string, unknown> = {};
  if (call.artifact?.structuredOutputs) {
    for (const e of Object.values(call.artifact.structuredOutputs)) {
      if (e?.name) flat[e.name] = e.result;
    }
  }
  const extractedShape = Object.keys(flat).length > 0
    ? flat
    : call.analysis?.structuredData ?? null;
  if (extractedShape && Object.keys(extractedShape).length > 0) {
    console.log(`   structured:    ✅ ${Object.keys(extractedShape).length} fields`);
    console.log(`   ${JSON.stringify(extractedShape, null, 2).split("\n").map((l) => `   ${l}`).join("\n")}`);
  } else {
    console.log(`   structured:    ❌`);
  }
  console.log("");

  // If the call hasn't ended on Vapi's side, nothing to recover yet.
  if (call.status !== "ended" || !call.endedAt) {
    console.log("⏳ call hasn't ended on vapi's side yet — try again in 30s.");
    return;
  }

  // Build the same payload Vapi WOULD send to us, and POST it to our webhook
  // ourselves. This proves whether our webhook code works (and recovers the
  // data into Supabase if it does).
  const fakePayload = {
    message: {
      type: "end-of-call-report" as const,
      call: {
        id: stuck.vapiCallId,
        metadata: { leadId: stuck.id },
      },
      endedReason: call.endedReason,
      transcript: call.transcript ?? call.artifact?.transcript ?? null,
      summary: call.analysis?.summary ?? call.summary,
      recordingUrl: call.recordingUrl ?? call.artifact?.recordingUrl,
      stereoRecordingUrl: call.stereoRecordingUrl,
      durationSeconds:
        call.startedAt && call.endedAt
          ? Math.round(
              (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000,
            )
          : undefined,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      analysis: call.analysis ?? null,
      artifact: { structuredOutputs: call.artifact?.structuredOutputs },
    },
  };

  const webhookUrl = "https://ring-date.vercel.app/api/webhooks/vapi";
  console.log(`📤 manually POSTing recovered payload → ${webhookUrl}`);

  const wRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fakePayload),
  });

  const wText = await wRes.text();
  console.log(`   HTTP ${wRes.status}: ${wText}\n`);

  if (wRes.ok) {
    // Re-check db to confirm
    const after = await prisma.lead.findUnique({
      where: { id: stuck.id },
      include: { call: true },
    });
    console.log("📊 lead status after recovery:");
    console.log(`   status:    ${after?.status}`);
    console.log(`   has Call:  ${after?.call ? "✅" : "❌"}`);
    if (after?.call) {
      console.log(`   transcript:  ${after.call.transcript ? `${after.call.transcript.length} chars` : "(none)"}`);
      console.log(`   extracted:   ${after.call.extracted ? "✅" : "❌"}`);
    }
  }
}

main()
  .catch((e) => { console.error("\n❌ ERROR:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
