import type { ExtractedProfile } from "./matching";

export function genderCompatible(a: ExtractedProfile, b: ExtractedProfile): boolean {
  // MVP: hetero only. Loosen when we add an `orientation` field.
  if (!a.gender || !b.gender) return true;
  return a.gender !== b.gender;
}

export function lookingForCompatible(a: ExtractedProfile, b: ExtractedProfile): boolean {
  const x = (a.looking_for ?? "unsure").toLowerCase();
  const y = (b.looking_for ?? "unsure").toLowerCase();
  if (x === "unsure" || y === "unsure") return true;
  if (x === "open" || y === "open") return true;
  return x === y;
}

export function ageInRange(
  a: ExtractedProfile,
  b: ExtractedProfile,
  maxDiff = 8,
): boolean {
  if (a.age == null || b.age == null) return true;
  return Math.abs(a.age - b.age) <= maxDiff;
}

export function isViableCandidate(
  user: ExtractedProfile,
  candidate: ExtractedProfile,
): boolean {
  return (
    genderCompatible(user, candidate) &&
    lookingForCompatible(user, candidate) &&
    ageInRange(user, candidate, 8)
  );
}

// All score components return a value in [0, 1].

function lower(arr: string[] | undefined): string[] {
  return (arr ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
}

export function hobbyOverlap(a: ExtractedProfile, b: ExtractedProfile): number {
  const aSet = new Set(lower(a.hobbies));
  const bSet = new Set(lower(b.hobbies));
  if (aSet.size === 0 || bSet.size === 0) return 0;
  const intersection = [...aSet].filter((h) => bSet.has(h)).length;
  const union = new Set([...aSet, ...bSet]).size;
  return intersection / union;
}

// shared_hobbies are abstract wishes ("someone outdoorsy"); b.hobbies are
// concrete ("hiking, climbing"). Fuzzy keyword overlap, not exact match.
export function sharedHobbiesMatch(
  a: ExtractedProfile,
  b: ExtractedProfile,
): number {
  const wants = lower(a.shared_hobbies);
  if (wants.length === 0) return 0.5;

  const bText = [
    ...lower(b.hobbies),
    (b.ideal_first_date ?? "").toLowerCase(),
    (b.type ?? "").toLowerCase(),
  ].join(" ");

  let matches = 0;
  for (const want of wants) {
    const words = want.split(/[\s,]+/).filter((w) => w.length >= 4);
    if (words.some((w) => bText.includes(w))) matches++;
  }
  return matches / wants.length;
}

// Returns 1 = no dealbreaker hit, 0 = clear violation. Each pair = (the
// pattern a user's stated dealbreaker matches, the pattern in candidate text
// that confirms the dealbreaker is hit). Conservative on purpose — false
// negatives are OK; false positives reject good matches.
export function dealbreakerClear(
  a: ExtractedProfile,
  b: ExtractedProfile,
): number {
  if (!a.dealbreaker) return 1;
  const dealbreaker = a.dealbreaker.toLowerCase();

  const bText = [
    ...lower(b.hobbies),
    (b.ideal_first_date ?? "").toLowerCase(),
    (b.type ?? "").toLowerCase(),
    (b.dealbreaker ?? "").toLowerCase(),
  ].join(" | ");

  const triggers: Array<[RegExp, RegExp]> = [
    [/\bsmoker?s?\b|smoking/, /\bsmoke|cigarette|nicotine/],
    [/hates?\s+dogs?|anti-?dog/, /\bhates?\s+dog|no\s+dog/],
    [/lazy|no\s+ambition/, /\blazy\b|no\s+ambition/],
    [/(don'?t|doesn'?t)\s+read/, /(don'?t|doesn'?t)\s+read|never\s+read/],
    [/(on\s+their\s+phone|always\s+on\s+phone)/, /\bphone\s+all\s+day/],
    [/ghoster?s?/, /ghost(s|er|ing)/],
    [/no\s+therapy|anti-?therapy/, /anti-?therapy|hates?\s+therapy/],
    [/\bracist\b|\bmean\s+to\b|no\s+empathy|lacks?\s+empathy/, /\bracist\b|\bmean\s+to\b|no\s+empathy|lacks?\s+empathy/],
  ];

  for (const [aPattern, bPattern] of triggers) {
    if (aPattern.test(dealbreaker) && bPattern.test(bText)) return 0;
  }

  return 1;
}

export function ageProximity(a: ExtractedProfile, b: ExtractedProfile): number {
  if (a.age == null || b.age == null) return 0.5;
  const diff = Math.abs(a.age - b.age);
  if (diff <= 2) return 1;
  if (diff <= 4) return 0.85;
  if (diff <= 6) return 0.6;
  if (diff <= 8) return 0.3;
  return 0;
}

export function cityProximity(a: ExtractedProfile, b: ExtractedProfile): number {
  if (!a.city || !b.city) return 0.5;
  const x = a.city.toLowerCase();
  const y = b.city.toLowerCase();
  if (x === y) return 1;
  if (x.includes("chicago") && y.includes("chicago")) return 0.7;
  return 0;
}

export function oneWayScore(a: ExtractedProfile, b: ExtractedProfile): number {
  return (
    hobbyOverlap(a, b) * 0.25 +
    sharedHobbiesMatch(a, b) * 0.3 +
    dealbreakerClear(a, b) * 0.2 +
    ageProximity(a, b) * 0.1 +
    cityProximity(a, b) * 0.15
  );
}

// Geometric mean (not arithmetic) so a lopsided match — A loves B, B is meh
// on A — gets punished instead of averaging out.
export function bilateralScore(
  a: ExtractedProfile,
  b: ExtractedProfile,
): number {
  const ab = oneWayScore(a, b);
  const ba = oneWayScore(b, a);
  return Math.sqrt(ab * ba);
}
