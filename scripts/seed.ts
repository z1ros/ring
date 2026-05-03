import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ─── name lists ─────────────────────────────────────────────────────────────
const womenNames = [
  "maya", "sofia", "ava", "emma", "lila", "ana", "zoe", "mia", "ruby", "jade",
  "iris", "leah", "june", "ada", "nora", "vera", "hana", "elle", "wren", "luna",
];
const menNames = [
  "jake", "leo", "max", "noah", "ben", "alex", "luca", "ezra", "milo", "theo",
  "finn", "owen", "kai", "ari", "jude", "ash", "sam", "kit", "ian", "nico",
];

// ─── chicago neighborhoods ──────────────────────────────────────────────────
const neighborhoods = [
  "Lincoln Park", "Wicker Park", "West Loop", "Lake View", "Logan Square",
  "Pilsen", "Hyde Park", "Bucktown", "Gold Coast", "River North",
  "Uptown", "Old Town", "Streeterville", "Andersonville", "Ravenswood",
  "Bridgeport", "South Loop", "Albany Park", "West Town", "Lincoln Square",
];

const lookingForOptions = ["serious", "casual", "open", "unsure"] as const;

const hobbiesList: string[][] = [
  ["climbing", "cooking", "vinyl"],
  ["yoga", "matcha runs", "thrifting"],
  ["running", "marathons", "smoothie bowls"],
  ["bookstores", "writing", "wine"],
  ["board games", "trivia", "indie films"],
  ["pottery", "drawing", "art shows"],
  ["pickleball", "spin class", "brunch"],
  ["bouldering", "concerts", "vintage shopping"],
  ["dive bars", "shows", "vinyl"],
  ["hiking", "camping", "national parks"],
  ["dance classes", "salsa", "latin music"],
  ["third-wave coffee", "manual brewing", "cafes"],
  ["museums", "documentaries", "podcasts"],
  ["jiu-jitsu", "lifting", "macros"],
  ["dogs", "long walks", "dog parks"],
  ["cooking shows", "trying new restaurants", "natural wine"],
  ["roller skating", "vintage shops", "diners"],
  ["chess", "history podcasts", "old films"],
  ["tennis", "rooftop drinks", "summer fridays"],
  ["pilates", "matcha", "memoirs"],
];

const sharedHobbiesIdeas: string[][] = [
  ["someone who loves food adventures"],
  ["a workout buddy"],
  ["concert + show partner"],
  ["someone outdoorsy"],
  ["into reading + slow mornings"],
  ["loves dogs"],
  ["into trying new restaurants"],
  ["traveler / weekend trip person"],
  ["someone into wine + dinner spots"],
  ["fellow foodie + cook at home"],
  ["likes live music"],
  ["into art + museums"],
];

const datesList = [
  "walk through millennium park then tacos in pilsen",
  "natural wine bar in west loop, no fixed plans after",
  "coffee in wicker park then bookstores till close",
  "dive bar in logan square + late-night pizza",
  "lake michigan walk at golden hour",
  "trying a new restaurant + sharing everything",
  "bookstore date then a low-key dinner",
  "art institute then dinner in west loop",
  "pickleball + frosé after",
  "second city show then drinks in old town",
  "coffee that turns into a 5-hour walk",
  "rooftop drinks in river north",
  "thrifting in andersonville then brunch",
  "board game cafe + actually finish a game",
  "matcha run + walk along the lake",
  "alinea if u're feeling fancy, dive bar if not",
  "navy pier on a weekday so it's not packed",
  "biking the lakefront trail end to end",
  "first show at the metro then food after",
  "garfield park conservatory on a sunday",
];

const dealbreakers = [
  "anyone who hates dogs",
  "people who don't have hobbies outside their job",
  "smokers",
  "rude to service workers",
  "vibes-only guys with no follow-through",
  "people who don't read",
  "constantly on their phone",
  "lazy daters who only do 'drinks'",
  "ghosters",
  "doesn't like to travel",
  "doesn't have opinions",
  "still hung up on an ex",
  "no ambition",
  "racist / mean / lacks empathy",
  "anti-therapy energy",
  "doesn't tip",
];

const womenTypes = [
  "funny + thoughtful, doesn't take himself too serious",
  "a guy who actually plans things",
  "smart, kind, and a little weird",
  "secure + curious",
  "tall is a bonus but mostly just wholesome energy",
  "guys with hobbies — like real ones",
  "warm, expressive, communicates",
  "creative type who's also got his life together",
  "calm energy, soft voice, good listener",
  "outdoorsy with a soft side",
];

const menTypes = [
  "funny, sharp, doesn't take herself too serious",
  "warm, smart, knows what she wants",
  "creative type, into music or art",
  "confident + emotionally available",
  "athletic + adventurous",
  "calm, grounded, low-drama",
  "loves food + tries everything",
  "witty, good at banter",
  "kind, expressive, makes me laugh",
  "indie girl energy, loves shows",
];

// ─── helpers ────────────────────────────────────────────────────────────────
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildTranscript(p: {
  name: string; age: number; city: string;
  lookingFor: string; hobbies: string[]; sharedHobbies: string[];
  type: string; date: string; dealbreaker: string;
}): string {
  return [
    `AI: Hey! It's Ring's matchmaker — got like 2 mins for a quick intake? Btw everything you say stays between us, just used to find your match — nothing's shared.`,
    `User: Yeah sure, go for it.`,
    `AI: Sweet. First up — name + age?`,
    `User: ${p.name}, ${p.age}.`,
    `AI: Nice to meet you ${p.name}. Where r u based, city's fine.`,
    `User: ${p.city}.`,
    `AI: Cool. What r u looking for rn — real thing, casual, open, or just figuring it out?`,
    `User: ${p.lookingFor === "serious" ? "Real thing" : p.lookingFor === "casual" ? "Casual, honestly" : p.lookingFor === "open" ? "Open to whatever" : "Figuring it out"}.`,
    `AI: Got it. What r u into outside work — like, what's ur thing?`,
    `User: ${p.hobbies.join(", ")}.`,
    `AI: Love that. Is there a hobby u'd want ur match to share with u?`,
    `User: ${p.sharedHobbies.join(", ")}.`,
    `AI: Nice. What's ur type — what draws u to someone?`,
    `User: ${p.type}.`,
    `AI: Fair. Perfect first date in one sentence?`,
    `User: ${p.date}.`,
    `AI: That's a vibe. Last one — one hard pass for u in a person?`,
    `User: ${p.dealbreaker}.`,
    `AI: Got it ${p.name} — we'll text u the recap + ur match this week. Talk soon, bye!`,
  ].join("\n");
}

// ─── main ───────────────────────────────────────────────────────────────────
async function main() {
  // wipe previous seed data (cascade-deletes Calls via onDelete: Cascade)
  const deleted = await prisma.lead.deleteMany({
    where: { email: { endsWith: ".seed@ring.app" } },
  });
  console.log(`🧹 cleared ${deleted.count} previous seed leads.`);

  type Profile = {
    gender: "woman" | "man";
    name: string;
    age: number;
    city: string;
    lookingFor: typeof lookingForOptions[number];
    hobbies: string[];
    sharedHobbies: string[];
    type: string;
    date: string;
    dealbreaker: string;
    phone: string;
  };

  const profiles: Profile[] = [];

  for (let i = 0; i < 20; i++) {
    profiles.push({
      gender: "woman",
      name: womenNames[i],
      age: randInt(22, 36),
      city: `${pick(neighborhoods)}, Chicago`,
      lookingFor: pick(lookingForOptions),
      hobbies: pick(hobbiesList),
      sharedHobbies: pick(sharedHobbiesIdeas),
      type: pick(womenTypes),
      date: pick(datesList),
      dealbreaker: pick(dealbreakers),
      phone: `+1312555${(1000 + i).toString().padStart(4, "0")}`,
    });
  }

  for (let i = 0; i < 20; i++) {
    profiles.push({
      gender: "man",
      name: menNames[i],
      age: randInt(23, 38),
      city: `${pick(neighborhoods)}, Chicago`,
      lookingFor: pick(lookingForOptions),
      hobbies: pick(hobbiesList),
      sharedHobbies: pick(sharedHobbiesIdeas),
      type: pick(menTypes),
      date: pick(datesList),
      dealbreaker: pick(dealbreakers),
      phone: `+1312555${(2000 + i).toString().padStart(4, "0")}`,
    });
  }

  let inserted = 0;
  for (const p of profiles) {
    const lead = await prisma.lead.create({
      data: {
        phone: p.phone,
        email: `${p.name}.seed@ring.app`,
        status: "COMPLETED",
        vapiCallId: `seed-${randomUUID()}`,
      },
    });

    const startedAt = new Date(Date.now() - randInt(1, 7) * 24 * 60 * 60 * 1000);
    const durationSec = randInt(95, 145);
    const endedAt = new Date(startedAt.getTime() + durationSec * 1000);

    await prisma.call.create({
      data: {
        leadId: lead.id,
        startedAt,
        endedAt,
        durationSec,
        recordingUrl: `https://storage.vapi.ai/seed-${lead.id}.mp3`,
        transcript: buildTranscript(p),
        extracted: {
          gender: p.gender,
          name: p.name,
          age: p.age,
          city: p.city,
          looking_for: p.lookingFor,
          hobbies: p.hobbies,
          shared_hobbies: p.sharedHobbies,
          type: p.type,
          ideal_first_date: p.date,
          dealbreaker: p.dealbreaker,
        },
        endedReason: "customer-ended-call",
      },
    });
    inserted++;
  }

  console.log(`✅ seeded ${inserted} leads + calls in chicago.`);
  console.log(`   👩 women: ${profiles.filter((p) => p.gender === "woman").length}`);
  console.log(`   👨 men:   ${profiles.filter((p) => p.gender === "man").length}`);
  console.log(`   📍 neighborhoods used: ${new Set(profiles.map((p) => p.city)).size}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
