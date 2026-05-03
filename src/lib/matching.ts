import { openai } from "./openai";
import { embedProfiles, cosineSimilarity } from "./embeddings";
import { isViableCandidate, bilateralScore } from "./scoring";

export type ExtractedProfile = {
  gender?: string;
  name?: string;
  age?: number;
  city?: string;
  looking_for?: string;
  hobbies?: string[];
  shared_hobbies?: string[];
  type?: string;
  ideal_first_date?: string;
  dealbreaker?: string;
};

export type CandidateInput = {
  id: string;
  extracted: ExtractedProfile;
};

export type MatchResult = {
  match_lead_id: string;
  reasoning: string;
  cafe_name: string;
  cafe_address: string;
  cafe_neighborhood: string;
  suggested_when: string;
  meeting_pitch: string;
  pipeline?: {
    candidates_total: number;
    after_filter: number;
    bilateral_top: number;
    finalists_to_llm: number;
    timings_ms: {
      filter: number;
      score: number;
      embed: number;
      llm: number;
      total: number;
    };
    finalists: Array<{
      id: string;
      name?: string;
      bilateral: number;
      cosine: number;
      combined: number;
    }>;
  };
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    match_lead_id: {
      type: "string",
      description:
        "the EXACT id of ur pick. default to finalist with rank 1 (the math winner). only pick rank 2 or 3 if u see a real problem with rank 1 that the score missed (e.g. obvious dealbreaker hit, life-stage mismatch).",
    },
    reasoning: {
      type: "string",
      description:
        "2-3 sentences. if u confirmed rank 1, cite the specific overlap. if u overrode, say WHY rank 1 was wrong + WHY ur pick is better.",
    },
    cafe_name: {
      type: "string",
      description:
        "JUST the cafe's name (e.g. 'Intelligentsia Coffee' or 'Sawada Coffee'). do NOT include the address, neighborhood, city, or any commas.",
    },
    cafe_address: {
      type: "string",
      description:
        "the FULL street address of that exact cafe location: '53 E Randolph St, Chicago, IL 60601'. must be a real address you're confident about.",
    },
    cafe_neighborhood: {
      type: "string",
      description: "chicago neighborhood, e.g. 'West Loop'",
    },
    suggested_when: {
      type: "string",
      description:
        "confirmed day + time within the next 7 days, format 'Saturday at 7pm'. weekday eves 6-8pm or weekend afternoons 2-5pm.",
    },
    meeting_pitch: {
      type: "string",
      description:
        "one short sentence framing the date as locked-in. confident, no questions.",
    },
  },
  required: [
    "match_lead_id",
    "reasoning",
    "cafe_name",
    "cafe_address",
    "cafe_neighborhood",
    "suggested_when",
    "meeting_pitch",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `u get a USER and 3 FINALISTS pre-ranked by our compat math (rank 1 = best score, rank 3 = worst).

ur job: vibe-check the ranking, pick one of the 3, then lock the meeting.

how to pick:
- DEFAULT to rank 1 — the math is usually right
- only override to rank 2 or 3 if u see a CLEAR problem with rank 1 (e.g. dealbreaker the math missed, weird life-stage mismatch). small score gaps + a strong vibe reason = ok to override. big score gaps = trust math.

cafe: ONE specific real chicago cafe between their neighborhoods. include FULL street address (number + street + city + state + zip). don't invent addresses.

date: confirmed day+time within 7 days. format 'Saturday at 7pm'. weekday eves 6-8pm or weekend afternoons 2-5pm.

pitch: one short confident sentence, no questions.

reasoning: explain the pick (esp. if u overrode rank 1).`;

const FILTER_TOP_K = 10;
const FINALISTS_TO_LLM = 3;
const BILATERAL_WEIGHT = 0.7;
const COSINE_WEIGHT = 0.3;

export async function findBestMatch({
  user,
  candidates,
}: {
  user: CandidateInput;
  candidates: CandidateInput[];
}): Promise<MatchResult> {
  if (candidates.length === 0) {
    throw new Error("no candidates to match against");
  }

  const totalStart = Date.now();
  const timings = { filter: 0, score: 0, embed: 0, llm: 0, total: 0 };

  // Stage 1: hard filter (gender, age, looking_for compat)
  const t0 = Date.now();
  const viable = candidates.filter((c) =>
    isViableCandidate(user.extracted, c.extracted),
  );
  timings.filter = Date.now() - t0;

  if (viable.length === 0) {
    throw new Error(
      `no viable candidates after gender/age/looking_for filter (had ${candidates.length} total)`,
    );
  }

  // Stage 2: bilateral score, keep top K
  const t1 = Date.now();
  const scored = viable.map((c) => ({
    candidate: c,
    bilateral: bilateralScore(user.extracted, c.extracted),
  }));
  scored.sort((a, b) => b.bilateral - a.bilateral);
  const topBilateral = scored.slice(0, FILTER_TOP_K);
  timings.score = Date.now() - t1;

  // Stage 3: embeddings re-rank (single batched OpenAI call)
  const t2 = Date.now();
  const [userEmb, ...candEmbs] = await embedProfiles([
    user.extracted,
    ...topBilateral.map((s) => s.candidate.extracted),
  ]);
  const reranked = topBilateral.map((s, i) => {
    const cosine = cosineSimilarity(userEmb, candEmbs[i]);
    const combined = s.bilateral * BILATERAL_WEIGHT + cosine * COSINE_WEIGHT;
    return { ...s, cosine, combined };
  });
  reranked.sort((a, b) => b.combined - a.combined);
  const finalists = reranked.slice(0, FINALISTS_TO_LLM);
  timings.embed = Date.now() - t2;

  // Stage 4: LLM vibe-checks top 3 + writes copy
  const t3 = Date.now();
  const llmInput = {
    user: { id: user.id, ...user.extracted },
    finalists: finalists.map((f, i) => ({
      id: f.candidate.id,
      rank: i + 1,
      score: round(f.combined),
      ...f.candidate.extracted,
    })),
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-5-nano",
    reasoning_effort: "minimal",
    verbosity: "low",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(llmInput) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "match_meeting",
        strict: true,
        schema: SCHEMA,
      },
    },
  });
  timings.llm = Date.now() - t3;

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("openai returned empty content");

  const parsed = JSON.parse(content) as MatchResult;

  // Strict JSON schema doesn't constrain to a finite enum here, so guard
  // against the model hallucinating an id that isn't one of the finalists.
  if (!finalists.some((f) => f.candidate.id === parsed.match_lead_id)) {
    parsed.match_lead_id = finalists[0].candidate.id;
  }

  timings.total = Date.now() - totalStart;

  parsed.pipeline = {
    candidates_total: candidates.length,
    after_filter: viable.length,
    bilateral_top: topBilateral.length,
    finalists_to_llm: finalists.length,
    timings_ms: timings,
    finalists: finalists.map((f) => ({
      id: f.candidate.id,
      name: f.candidate.extracted.name,
      bilateral: round(f.bilateral),
      cosine: round(f.cosine),
      combined: round(f.combined),
    })),
  };

  return parsed;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
