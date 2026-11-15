import { NextResponse } from "next/server";

export const GENERIC_SERVER_ERROR = "Coś poszło nie tak. Spróbuj jeszcze raz — zwykle działa za drugim.";

/** Szczegóły błędu dostawcy lub bazy trafiają do logów, nigdy do odpowiedzi dla klienta. */
export function serverError(tag: string, err: unknown, status = 500) {
  console.error(`[${tag}]`, err instanceof Error ? err.message : String(err));
  return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status });
}

type BodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

const tooLarge = () => NextResponse.json({ error: "Żądanie jest za duże." }, { status: 413 });
const invalid = () => NextResponse.json({ error: "Nieprawidłowy format." }, { status: 400 });

/**
 * Czyta body JSON z twardym limitem bajtów. Route Handlers nie mają limitu z `serverActions.bodySizeLimit`,
 * więc liczymy bajty strumienia (nagłówek Content-Length można zafałszować).
 */
export async function readJsonBody(req: Request, maxBytes = 32 * 1024): Promise<BodyResult> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, response: tooLarge() };

  if (!req.body) return { ok: false, response: invalid() };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false, response: tooLarge() };
    }
    chunks.push(value);
  }
  if (total === 0) return { ok: false, response: invalid() };

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(merged)) };
  } catch {
    return { ok: false, response: invalid() };
  }
}
