export { updateSession as proxy } from "@/lib/supabase/proxy";

// Only run auth-cookie refresh on admin surfaces. Public pages (landing,
// intake API, vapi webhook) don't need a session, so skipping them avoids
// a Supabase round-trip on every public request.
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
