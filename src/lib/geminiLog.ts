import { createServiceClient } from "@/lib/supabase/service";

interface GeminiLogEntry {
  endpoint: string;
  model: string;
  success: boolean;
  error_code?: string;
  input_tokens?: number;
  output_tokens?: number;
}

export async function logGeminiCall(entry: GeminiLogEntry) {
  try {
    await createServiceClient().from("gemini_usage_log").insert(entry);
  } catch (err) {
    console.error("[geminiLog] failed to log call:", err);
  }
}
