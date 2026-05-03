import { prisma } from "@/lib/prisma";
import type { ExtractedProfile } from "@/lib/matching";
import { AdminClient, type AdminLead } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Pull the most recent completed call regardless of whether structured
  // extraction populated `extracted` — we still want to show it on the admin
  // page (just with empty profile fields) so the user knows the call landed.
  const [latestCall, totalCompleted] = await Promise.all([
    prisma.call.findFirst({
      where: { lead: { status: "COMPLETED" } },
      include: { lead: true },
      orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.lead.count({
      where: { status: "COMPLETED", call: { isNot: null } },
    }),
  ]);

  let latestLead: AdminLead | null = null;
  if (latestCall) {
    // extracted may be null if structured outputs weren't linked at call time
    const ex = (latestCall.extracted as ExtractedProfile | null) ?? {};
    const callEndedAt = latestCall.endedAt ?? latestCall.createdAt;
    latestLead = {
      id: latestCall.lead.id,
      phone: latestCall.lead.phone,
      email: latestCall.lead.email,
      callEndedAt: callEndedAt.toISOString(),
      name: ex.name ?? null,
      age: ex.age ?? null,
      city: ex.city ?? null,
      gender: ex.gender ?? null,
      looking_for: ex.looking_for ?? null,
      hobbies: ex.hobbies ?? null,
      shared_hobbies: ex.shared_hobbies ?? null,
      type: ex.type ?? null,
      ideal_first_date: ex.ideal_first_date ?? null,
      dealbreaker: ex.dealbreaker ?? null,
    };
  }

  return <AdminClient latest={latestLead} totalCompleted={totalCompleted} />;
}
