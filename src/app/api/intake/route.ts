import { prisma } from "@/lib/prisma";
import { normalizeUSPhone } from "@/lib/phone";
import { placeOutboundCall } from "@/lib/vapi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { phone?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body.phone !== "string") {
    return Response.json({ error: "phone required" }, { status: 400 });
  }
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email.trim())) {
    return Response.json({ error: "valid email required" }, { status: 400 });
  }

  let phone: string;
  try {
    phone = normalizeUSPhone(body.phone);
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
  const email = body.email.trim().toLowerCase();

  // beta: always insert — duplicate phone/email is intentional for experimentation
  const lead = await prisma.lead.create({
    data: { phone, email, status: "QUEUED" },
  });

  try {
    const call = await placeOutboundCall({ phone, leadId: lead.id });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "CALLING", vapiCallId: call.id },
    });
    return Response.json({ leadId: lead.id, status: "calling" });
  } catch (err) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "FAILED" },
    });
    console.error("[intake] vapi call failed:", err);
    return Response.json(
      { error: (err as Error).message },
      { status: 502 },
    );
  }
}
