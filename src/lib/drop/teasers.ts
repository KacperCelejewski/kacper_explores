import { GoogleGenerativeAI, GoogleGenerativeAIAbortError } from "@google/generative-ai";
import { logGeminiCall } from "@/lib/geminiLog";
import type { CityTeaser, WeekKey } from "./types";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = "drop-teaser";
const MAX_TEASER_LENGTH = 320;
const REQUEST_TIMEOUT_MS = 15_000;

export function buildTeaserPrompt(cityName: string, countryCode: string): string {
  return `Jesteś Włóczykijem, znajomym, który opowiada przy kawie o weekendzie w mieście ${cityName} (kraj: ${countryCode}).

Napisz zajawkę na weekend po polsku: 2–3 zdania, konkretnie. Podaj miejsce lub dzielnicę i jedno jedzenie z ceną w walucie lokalnej. Mów swobodnie, bez korporacyjnego tonu, bez przesady i bez wymuszonego humoru. Zero wykrzykników i zero emoji.

Dodatkowo podaj local_budget: przybliżony koszt jedzenia, transportu i atrakcji na cały weekend w walucie lokalnej, w formie np. "ok. 120 EUR".

Odpowiedz wyłącznie w formacie JSON:
{ "teaser": string, "local_budget": string }`;
}

export function parseTeaser(
  raw: string,
): { teaser: string; local_budget: string } | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const { teaser, local_budget } = data as Record<string, unknown>;
  if (typeof teaser !== "string" || typeof local_budget !== "string") return null;

  const t = teaser.trim();
  const b = local_budget.trim();
  if (!t || t.length > MAX_TEASER_LENGTH || !b) return null;

  return { teaser: t, local_budget: b };
}

export async function generateTeaser(
  cityName: string,
  countryCode: string,
  week: WeekKey,
  cityCode: string,
): Promise<CityTeaser | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      {
        model: MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ thinkingConfig: { thinkingBudget: 0 } } as any),
        },
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );

    const result = await model.generateContent(buildTeaserPrompt(cityName, countryCode));
    const usage = result.response.usageMetadata;
    const parsed = parseTeaser(result.response.text());

    await logGeminiCall({
      endpoint: ENDPOINT,
      model: MODEL,
      success: parsed !== null,
      ...(parsed ? {} : { error_code: "invalid_output" }),
      input_tokens: usage?.promptTokenCount,
      output_tokens: usage?.candidatesTokenCount,
    });

    if (!parsed) return null;
    return { week, city_code: cityCode, ...parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logGeminiCall({
      endpoint: ENDPOINT,
      model: MODEL,
      success: false,
      error_code:
        err instanceof GoogleGenerativeAIAbortError
          ? "timeout"
          : msg.includes("429")
            ? "quota"
            : "error",
    });
    return null;
  }
}
