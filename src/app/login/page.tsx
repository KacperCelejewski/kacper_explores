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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    setLoading(false);
    if (error) {
      setError("Błąd wysyłania. Sprawdź adres email.");
    } else {
      setSent(true);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
  };

  return (
    <div className="flex flex-col flex-1 px-5 pb-8 justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-8">
          <span className="text-4xl">🌍</span>
          <h1 className="text-2xl font-bold mt-3">
            Zaloguj się do{" "}
            <span className="gradient-text">Kacper Explores</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Potrzebujesz konta, żeby generować plany podróży.
          </p>
        </div>

        {sent ? (
          <div className="glass-card p-6 text-center">
            <span className="text-3xl">📬</span>
            <h2 className="text-lg font-bold mt-3">Sprawdź skrzynkę</h2>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Wysłaliśmy link do logowania na <strong>{email}</strong>.
              Kliknij go, żeby się zalogować.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleOAuth("google")}
              className="glass-card flex items-center justify-center gap-3 py-4 font-semibold text-sm transition-all hover:border-white/30"
              style={{ borderRadius: "14px" }}
            >
              <span className="text-xl">G</span>
              Kontynuuj z Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>lub</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>

            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Twój adres email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  color: "var(--text-primary)",
                }}
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !email}
              >
                {loading ? "Wysyłanie…" : "Wyślij link logowania ✉️"}
              </button>
            </form>

            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              Po pierwszej rejestracji otrzymujesz <strong style={{ color: "var(--text-primary)" }}>1 plan za darmo</strong>.
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
