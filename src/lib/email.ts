// Resend REST API: https://resend.com/docs/api-reference/emails/send-email
import type { ExtractedProfile } from "./matching";

const RESEND_API = "https://api.resend.com";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: SendEmailInput): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const res = await fetch(`${RESEND_API}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`resend ${res.status}: ${text}`);
  }

  return res.json() as Promise<{ id: string }>;
}

export function buildMatchEmail({
  match,
  cafe,
  cafeAddress,
  suggestedWhen,
  pitch,
  mapsUrl,
}: {
  match: ExtractedProfile;
  cafe: string;
  cafeAddress: string;
  suggestedWhen: string;
  pitch: string;
  mapsUrl: string;
}): { subject: string; html: string } {
  const matchName = match.name ?? "your match";
  const matchAge = match.age ?? "";
  // Strip ", Chicago" from city display — the cafe is in Chicago, so showing
  // "Lincoln Park, Chicago" alongside a Chicago cafe is redundant noise.
  const matchCity = (match.city ?? "").replace(", Chicago", "");
  const matchHobbies = (match.hobbies ?? []).slice(0, 4).join(" · ");

  const subject = `${matchName}. ${suggestedWhen.toLowerCase()}.`;

  // Strip address fragments the LLM may leak into cafe_name despite the schema
  // description (e.g. "Intelligentsia Coffee, 53 E Randolph St"). Keep the
  // part before the first comma.
  const cleanCafe = cafe.split(",")[0].trim();

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif;color:#fafafa;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:64px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

        <!-- wordmark -->
        <tr><td style="padding:0 0 56px 0;">
          <div style="font-weight:800;font-size:18px;letter-spacing:-0.3px;color:#fafafa;">ring</div>
        </td></tr>

        <!-- hero -->
        <tr><td style="padding:0 0 56px 0;">
          <h1 style="margin:0;font-weight:800;font-size:64px;line-height:0.95;letter-spacing:-3px;color:#fafafa;">
            ${matchName}.
          </h1>
          <h1 style="margin:8px 0 0 0;font-weight:800;font-size:64px;line-height:0.95;letter-spacing:-3px;color:#ff2e93;">
            ${suggestedWhen.toLowerCase()}.
          </h1>
        </td></tr>

        <!-- info rows -->
        <tr><td style="padding:0 0 12px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:18px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#666;letter-spacing:0.04em;width:80px;vertical-align:top;">where</td>
              <td style="padding:18px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;color:#fafafa;line-height:1.5;">
                <div style="font-weight:600;">${cleanCafe}</div>
                <div style="margin-top:2px;color:#999;font-size:13px;">${cafeAddress}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#666;letter-spacing:0.04em;vertical-align:top;">who</td>
              <td style="padding:18px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;color:#fafafa;line-height:1.5;">
                <div style="font-weight:600;">${matchName}${matchAge ? `, ${matchAge}` : ""}${matchCity ? ` · ${matchCity}` : ""}</div>
                ${matchHobbies ? `<div style="margin-top:2px;color:#999;font-size:13px;">${matchHobbies}</div>` : ""}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- maps cta -->
        <tr><td style="padding:32px 0 0 0;">
          <a href="${mapsUrl}" style="display:inline-block;padding:14px 24px;background:#fafafa;color:#0a0a0a;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;letter-spacing:-0.1px;">
            open in maps  →
          </a>
        </td></tr>

        <!-- pitch -->
        <tr><td style="padding:48px 0 0 0;">
          <p style="margin:0;font-size:14px;line-height:1.55;color:#999;">${pitch}</p>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:80px 0 0 0;">
          <div style="font-size:11px;color:#444;line-height:1.6;">we'll text u 24h before. don't be late.</div>
          <div style="margin-top:8px;font-size:11px;color:#333;">ring · one ring · one date · no swipes</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}
