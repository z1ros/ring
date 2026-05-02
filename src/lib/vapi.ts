const VAPI_BASE = "https://api.vapi.ai";

type PlaceCallInput = {
  phone: string;
  leadId: string;
};

type VapiCall = {
  id: string;
  status: string;
  [k: string]: unknown;
};

export async function placeOutboundCall({
  phone,
  leadId,
}: PlaceCallInput): Promise<VapiCall> {
  const apiKey = process.env.VAPI_PRIVATE_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey) throw new Error("VAPI_PRIVATE_KEY is not set");
  if (!assistantId) throw new Error("VAPI_ASSISTANT_ID is not set");
  if (!phoneNumberId) throw new Error("VAPI_PHONE_NUMBER_ID is not set");

  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      assistantId,
      phoneNumberId,
      customer: { number: phone },
      metadata: { leadId },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`vapi /call ${res.status}: ${text}`);
  }

  return res.json();
}
