import { createClient } from "@supabase/supabase-js";

interface GeminiLogEntry {
  endpoint: string;
  model: string;
  success: boolean;
  error_code?: string;
  input_tokens?: number;
  output_tokens?: number;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function logGeminiCall(entry: GeminiLogEntry) {
  try {
    await getServiceClient().from("gemini_usage_log").insert(entry);
  } catch {
    // non-critical — never let logging break the request
  }
}
