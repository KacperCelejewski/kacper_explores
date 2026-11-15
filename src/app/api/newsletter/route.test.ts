import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  existing: null as null | { discount_code: string; verified: boolean; verification_token: string | null; token_sent_at: string | null },
  sent: [] as { email: string; url: string }[],
  updates: [] as Record<string, unknown>[],
  inserted: 0,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.existing }) }) }),
      update: (patch: Record<string, unknown>) => {
        state.updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
      insert: async () => {
        state.inserted++;
        return { error: null };
      },
    }),
  }),
}));
vi.mock("@/lib/email", () => ({
  sendNewsletterConfirmation: async (email: string, url: string) => {
    state.sent.push({ email, url });
  },
}));
vi.mock("@/lib/newsletter", () => ({
  createNewsletterPromo: async () => ({ code: "PACK10-NEW", stripePromoId: "promo_1" }),
  newVerificationToken: () => "n".repeat(64),
  newsletterVerifyUrl: (t: string) => `https://app.test/api/newsletter/verify?token=${t}`,
}));

import { POST } from "./route";

let n = 0;
const post = (email: string) =>
  POST(
    new Request("http://x/api/newsletter", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "x-forwarded-for": `10.0.0.${++n}` },
    }) as never,
  );

beforeEach(() => {
  state.existing = null;
  state.sent = [];
  state.updates = [];
  state.inserted = 0;
});

describe("newsletter: jednolita odpowiedź", () => {
  it("nowy adres: pending, bez kodu", async () => {
    const body = await (await post("new@example.com")).json();
    expect(body).toEqual({ pending: true });
    expect(state.inserted).toBe(1);
  });

  it("zweryfikowany adres: te same pola co dla nowego i brak kodu rabatowego", async () => {
    state.existing = { discount_code: "PACK10-SECRET", verified: true, verification_token: "t".repeat(64), token_sent_at: null };
    const res = await post("owner@example.com");
    const body = await res.json();
    expect(body).toEqual({ pending: true });
    expect(JSON.stringify(body)).not.toContain("PACK10-SECRET");
    // Kod dostaje wyłącznie właściciel skrzynki, przez link z maila
    expect(state.sent).toEqual([
      { email: "owner@example.com", url: `https://app.test/api/newsletter/verify?token=${"t".repeat(64)}` },
    ]);
  });

  it("niezweryfikowany adres z świeżym linkiem: nie unieważnia cudzego linku", async () => {
    state.existing = {
      discount_code: "PACK10-X",
      verified: false,
      verification_token: "a".repeat(64),
      token_sent_at: new Date().toISOString(),
    };
    const body = await (await post("pending@example.com")).json();
    expect(body).toEqual({ pending: true });
    expect(state.updates).toEqual([]);
    expect(state.sent.length).toBe(0);
  });

  it("niezweryfikowany adres ze starym linkiem: nowy token i ponowna wysyłka", async () => {
    state.existing = {
      discount_code: "PACK10-X",
      verified: false,
      verification_token: "a".repeat(64),
      token_sent_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    await post("old@example.com");
    expect(state.updates.length).toBe(1);
    expect(state.sent.length).toBe(1);
  });

  it("limit na adres e-mail: kolejne zgłoszenia tego samego adresu nie wysyłają maili, odpowiedź bez zmian", async () => {
    state.existing = { discount_code: "C", verified: true, verification_token: "t".repeat(64), token_sent_at: null };
    for (let i = 0; i < 6; i++) expect(await (await post("spam@example.com")).json()).toEqual({ pending: true });
    expect(state.sent.length).toBe(3);
  });
});
