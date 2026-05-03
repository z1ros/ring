import OpenAI from "openai";

declare global {
  var __openai: OpenAI | undefined;
}

export const openai =
  globalThis.__openai ??
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") globalThis.__openai = openai;
