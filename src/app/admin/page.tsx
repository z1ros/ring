import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { ExtractedProfile } from "@/lib/matching";
import { AdminClient, type AdminLead } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [latestCall, totalCompleted] = await Promise.all([
    prisma.call.findFirst({
      where: { lead: { status: "COMPLETED" }, extracted: { not: Prisma.JsonNull } },
      include: { lead: true },
      orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.lead.count({
      where: { status: "COMPLETED", call: { isNot: null } },
    }),
  ]);

  let latestLead: AdminLead | null = null;
  if (latestCall?.extracted) {
    const ex = latestCall.extracted as ExtractedProfile;
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
