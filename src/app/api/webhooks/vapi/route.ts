import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type VapiMessage = {
  type: string;
  call?: { id?: string; metadata?: { leadId?: string } };
  endedReason?: string;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  durationSeconds?: number;
  startedAt?: string;
  endedAt?: string;
  analysis?: {
    structuredData?: Record<string, unknown>;
    summary?: string;
  };
};

type VapiBody = { message?: VapiMessage };

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Opt-in HMAC verification. If VAPI_WEBHOOK_SECRET is set we enforce it;
  // if not, we accept the request and log a warning. This way MVP testing
  // works without needing to configure a secret on both sides, but production
  // deployments can opt into signature verification by setting the env var
  // (and the matching secret in the Vapi assistant config).
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("x-vapi-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (
      sigBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return Response.json({ error: "bad signature" }, { status: 401 });
    }
  } else {
    console.warn(
      "[vapi webhook] VAPI_WEBHOOK_SECRET not set — accepting unsigned request (MVP mode)",
    );
  }

  let body: VapiBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const msg = body.message;
  if (!msg) return Response.json({ ok: true });

  if (msg.type !== "end-of-call-report") {
    return Response.json({ ok: true, ignored: msg.type });
  }

  const vapiCallId = msg.call?.id;
  const leadId = msg.call?.metadata?.leadId;

  if (!vapiCallId && !leadId) {
    return Response.json({ error: "no call id" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: leadId ? { id: leadId } : { vapiCallId },
  });

  if (!lead) {
    return Response.json({ error: "lead not found" }, { status: 404 });
  }

  const callData = {
    startedAt: msg.startedAt ? new Date(msg.startedAt) : null,
    endedAt: msg.endedAt ? new Date(msg.endedAt) : null,
    durationSec: msg.durationSeconds != null ? Math.round(msg.durationSeconds) : null,
    recordingUrl: msg.recordingUrl ?? msg.stereoRecordingUrl ?? null,
    transcript: msg.transcript ?? null,
    extracted: (msg.analysis?.structuredData ?? null) as Prisma.InputJsonValue,
    endedReason: msg.endedReason ?? null,
  };

  await prisma.$transaction([
    prisma.call.upsert({
      where: { leadId: lead.id },
      create: { leadId: lead.id, ...callData },
      update: callData,
    }),
    prisma.lead.update({
      where: { id: lead.id },
      data: { status: "COMPLETED" },
    }),
  ]);

  return Response.json({ ok: true });
}
