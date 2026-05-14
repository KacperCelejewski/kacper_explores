"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/flights";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    setLoading(false);
    if (error) setError("Błąd wysyłania. Sprawdź adres email.");
    else setSent(true);
  };

  const handleOAuth = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-8 justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--accent)" }}>
            Kacper Explores
          </p>
          <h1 className="text-3xl font-bold leading-tight">
            Zaloguj się,<br />żeby planować.
          </h1>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Po rejestracji dostaniesz 1 plan podróży za darmo.
          </p>
        </div>

        {sent ? (
          <div
            className="p-6 rounded-2xl text-center"
            style={{ background: "var(--accent-light)", border: "1px solid var(--accent)" }}
          >
            <span className="text-3xl">📬</span>
            <h2 className="text-base font-bold mt-3">Sprawdź skrzynkę</h2>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Wysłaliśmy link na <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
              Kliknij go, żeby się zalogować.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Google */}
            <button
              onClick={() => handleOAuth("google")}
              className="flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-sm transition-all"
              style={{
                background: "#FFFFFF",
                border: "1.5px solid var(--border)",
                color: "var(--text-primary)",
                boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Kontynuuj z Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>lub email</span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Twój adres email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-2xl text-sm"
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid var(--border)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading || !email}>
                {loading ? "Wysyłanie…" : "Wyślij link logowania →"}
              </button>
            </form>

            <p className="text-xs text-center mt-1" style={{ color: "var(--text-muted)" }}>
              Bez hasła. Kliknij link w emailu i gotowe.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
