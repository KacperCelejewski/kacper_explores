import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const state = vi.hoisted(() => ({ user: null as unknown }));
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));

import { isAdminUser, requireAdmin } from "./admin";

const admin = { id: "a", email: "Boss@Example.com", email_confirmed_at: "2026-01-01T00:00:00Z" };

beforeEach(() => {
  redirect.mockClear();
  vi.stubEnv("ADMIN_EMAIL", "boss@example.com");
});
afterEach(() => vi.unstubAllEnvs());

describe("isAdminUser", () => {
  it("przepuszcza potwierdzony adres admina bez względu na wielkość liter", () => {
    expect(isAdminUser(admin)).toBe(true);
  });
  it("odrzuca niepotwierdzony e-mail", () => {
    expect(isAdminUser({ ...admin, email_confirmed_at: null })).toBe(false);
  });
  it("odrzuca inny adres i brak użytkownika", () => {
    expect(isAdminUser({ ...admin, email: "x@example.com" })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
  it("odrzuca pusty adres, gdy ADMIN_EMAIL jest pusty i nie ma użytkownika z pustym e-mailem", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(isAdminUser({ email: "", email_confirmed_at: "2026-01-01" })).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("zwraca użytkownika-admina", async () => {
    state.user = admin;
    await expect(requireAdmin()).resolves.toMatchObject({ id: "a" });
  });
  it("przekierowuje wszystkich pozostałych", async () => {
    state.user = { id: "u", email: "u@example.com", email_confirmed_at: "2026-01-01" };
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
    state.user = null;
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });
});
