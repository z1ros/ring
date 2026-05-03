import { openai } from "./openai";
import type { ExtractedProfile } from "./matching";

const EMBEDDING_MODEL = "text-embedding-3-small";

export function profileToText(p: ExtractedProfile): string {
  return [
    p.type && `attracted to: ${p.type}`,
    p.hobbies && p.hobbies.length > 0 && `hobbies: ${p.hobbies.join(", ")}`,
    p.shared_hobbies && p.shared_hobbies.length > 0 && `wants partner who: ${p.shared_hobbies.join(", ")}`,
    p.ideal_first_date && `ideal first date: ${p.ideal_first_date}`,
    p.looking_for && `looking for: ${p.looking_for}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

// Batched: one HTTP round-trip per call regardless of profile count. The
// OpenAI embeddings endpoint accepts an array `input` and returns embeddings
// in the same order.
export async function embedProfiles(
  ps: ExtractedProfile[],
): Promise<number[][]> {
  if (ps.length === 0) return [];
  const inputs = ps.map((p) => profileToText(p) || "no profile data");
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });
  return res.data.map((d) => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
