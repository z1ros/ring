import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { findBestMatch } from "@/lib/matching";
import type { ExtractedProfile, CandidateInput } from "@/lib/matching";
import { sendEmail, buildMatchEmail } from "@/lib/email";

const CANDIDATE_LIMIT = 200;

export async function POST(request: Request) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return Response.json(
      { error: "ADMIN_EMAIL env var not set" },
      { status: 500 },
    );
  }

  let body: { leadId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body.leadId !== "string") {
    return Response.json({ error: "leadId required" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: body.leadId },
    select: { id: true, call: { select: { extracted: true } } },
  });
  if (!lead?.call?.extracted) {
    return Response.json(
      { error: "lead not found or no extracted profile" },
      { status: 404 },
    );
  }

  const candidateRows = await prisma.lead.findMany({
    where: {
      id: { not: lead.id },
      status: "COMPLETED",
      call: { extracted: { not: Prisma.JsonNull } },
    },
    select: { id: true, call: { select: { extracted: true } } },
    take: CANDIDATE_LIMIT,
    orderBy: { createdAt: "desc" },
  });

  const candidates: CandidateInput[] = candidateRows
    .filter((c) => c.call?.extracted)
    .map((c) => ({
      id: c.id,
      extracted: c.call!.extracted as ExtractedProfile,
    }));

  if (candidates.length === 0) {
    return Response.json(
      { error: "no other completed leads to match against" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await findBestMatch({
      user: { id: lead.id, extracted: lead.call.extracted as ExtractedProfile },
      candidates,
    });
  } catch (err) {
    console.error("[admin/match] llm error:", err);
    return Response.json(
      { error: `matching failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const matchExtracted = candidates.find((c) => c.id === result.match_lead_id)!.extracted;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${result.cafe_name}, ${result.cafe_address}`,
  )}`;

  const { subject, html } = buildMatchEmail({
    match: matchExtracted,
    cafe: result.cafe_name,
    cafeAddress: result.cafe_address,
    suggestedWhen: result.suggested_when,
    pitch: result.meeting_pitch,
    mapsUrl,
  });

  let emailId: string | null = null;
  try {
    const sent = await sendEmail({ to: adminEmail, subject, html });
    emailId = sent.id;
  } catch (err) {
    // don't fail the request when email breaks — caller still wants the match payload
    console.error("[admin/match] email error:", err);
  }

  return Response.json({
    ok: true,
    match: {
      id: result.match_lead_id,
      ...matchExtracted,
    },
    cafe: result.cafe_name,
    cafeAddress: result.cafe_address,
    cafeNeighborhood: result.cafe_neighborhood,
    suggestedWhen: result.suggested_when,
    pitch: result.meeting_pitch,
    reasoning: result.reasoning,
    mapsUrl,
    emailSentTo: adminEmail,
    emailId,
  });
}
