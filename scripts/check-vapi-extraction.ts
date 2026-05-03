// Pull recent calls from Vapi's API and report which ones have structured
// data extracted. This tells us — without making a new call — whether the
// linked Structured Outputs config is actually running on completed calls.

const VAPI_BASE = "https://api.vapi.ai";

type VapiCall = {
  id: string;
  createdAt?: string;
  startedAt?: string;
  endedAt?: string;
  status?: string;
  endedReason?: string;
  customer?: { number?: string };
  transcript?: string;
  analysis?: {
    structuredData?: Record<string, unknown> | null;
    summary?: string;
  };
};

async function main() {
  const apiKey = process.env.VAPI_PRIVATE_KEY;
  if (!apiKey) throw new Error("VAPI_PRIVATE_KEY not set");

  // last 10 calls
  const res = await fetch(`${VAPI_BASE}/call?limit=10`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error(`vapi /call ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const calls = (await res.json()) as VapiCall[];

  let withExtraction = 0;
  let withoutExtraction = 0;

  console.log(`\n📞 last ${calls.length} calls on vapi:\n`);
  console.log("─".repeat(82));

  for (const c of calls) {
    const when = c.endedAt ?? c.startedAt ?? c.createdAt ?? "?";
    const phone = c.customer?.number ?? "?";
    const status = c.status ?? "?";
    const ended = c.endedReason ?? "—";
    const hasTranscript = !!c.transcript;
    const sd = c.analysis?.structuredData;
    const sdKeys = sd ? Object.keys(sd).length : 0;

    if (sdKeys > 0) withExtraction++;
    else withoutExtraction++;

    console.log(`${when}  ${phone}  status=${status}  ended=${ended}`);
    console.log(`  transcript: ${hasTranscript ? `✅ ${c.transcript?.length ?? 0} chars` : "❌"}`);
    console.log(`  structuredData: ${sdKeys > 0 ? `✅ ${sdKeys} fields` : "❌ null/empty"}`);

    if (sdKeys > 0 && sd) {
      const preview = JSON.stringify(sd, null, 2)
        .split("\n")
        .slice(0, 12)
        .join("\n");
      console.log(`  ─── extracted ───`);
      console.log(preview.split("\n").map((l) => `    ${l}`).join("\n"));
    }
    console.log("─".repeat(82));
  }

  console.log(`\n📊 summary:`);
  console.log(`   ✅ ${withExtraction}/${calls.length} calls have structuredData populated`);
  console.log(`   ❌ ${withoutExtraction}/${calls.length} calls have null/empty structuredData\n`);

  if (withExtraction === 0) {
    console.log("🚨 NO recent call has extraction. likely cause:");
    console.log("   - structured outputs not actually linked to the assistant (Linked Assistants = empty)");
    console.log("   - linked AFTER these calls happened (vapi only extracts at end of call)");
    console.log("   - field types are wrong (e.g. Object instead of String/Array)");
    console.log("   FIX: confirm Linked Assistants on each output, then make a fresh call.\n");
  } else if (withExtraction === calls.length) {
    console.log("🎉 extraction is working on every recent call. ur config is correct.\n");
  } else {
    console.log("🟡 some calls extracted, some didn't.");
    console.log("   most likely: the ones without were before u linked the outputs.\n");
    console.log("   FIX: make a fresh call now. it should extract.\n");
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
