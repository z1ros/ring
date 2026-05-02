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

  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("x-vapi-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return Response.json({ error: "bad signature" }, { status: 401 });
    }
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
    console.warn("[vapi webhook] payload had neither call.id nor metadata.leadId");
    return Response.json({ error: "no call id" }, { status: 400 });
  }

  const lead = leadId
    ? await prisma.lead.findUnique({ where: { id: leadId } })
    : await prisma.lead.findUnique({ where: { vapiCallId: vapiCallId! } });

  if (!lead) {
    console.warn("[vapi webhook] no matching lead", { vapiCallId, leadId });
    return Response.json({ error: "lead not found" }, { status: 404 });
  }

  const callData = {
    startedAt: msg.startedAt ? new Date(msg.startedAt) : null,
    endedAt: msg.endedAt ? new Date(msg.endedAt) : null,
    durationSec: msg.durationSeconds ? Math.round(msg.durationSeconds) : null,
    recordingUrl: msg.recordingUrl ?? msg.stereoRecordingUrl ?? null,
    transcript: msg.transcript ?? null,
    extracted: (msg.analysis?.structuredData ?? null) as Prisma.InputJsonValue,
    endedReason: msg.endedReason ?? null,
  };

  await prisma.call.upsert({
    where: { leadId: lead.id },
    create: { leadId: lead.id, ...callData },
    update: callData,
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "COMPLETED" },
  });

  return Response.json({ ok: true });
}
