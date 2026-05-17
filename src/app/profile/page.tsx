"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { QuizAnswers } from "@/types";

interface Trip {
  id: string;
  city: string;
  country: string;
  created_at: string;
  quiz_answers: QuizAnswers | null;
}

interface ProfileData {
  authenticated: boolean;
  email?: string;
  is_pro?: boolean;
  credits_remaining?: number;
  subscription_tier?: string;
  quiz_preferences?: QuizAnswers | null;
  trips?: Trip[];
}

const VIBE_LABELS: Record<string, string> = {
  chill: "Reset ☕",
  intense: "Full program 🔥",
  social: "Towarzyski 🎉",
  active: "Aktywny 🥾",
};

const PLACE_LABELS: Record<string, string> = {
  big_city: "Duże miasto 🏙️",
  charming: "Kameralne 🏘️",
  beach_sun: "Słońce i woda 🏖️",
};

const TAG_LABELS: Record<string, string> = {
  history: "historia",
  food: "jedzenie",
  architecture: "architektura",
  beach: "plaża",
  nightlife: "nocne życie",
  nature: "natura",
};

const SHORT_MONTHS = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { setQuizAnswer, toggleStyle, resetQuiz } = useAppStore();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d: ProfileData) => {
        if (!d.authenticated) { router.replace("/login?next=/profile"); return; }
        setData(d);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleUsePreferences = () => {
    if (!data?.quiz_preferences) return;
    const p = data.quiz_preferences;
    resetQuiz();
    if (p.budget) setQuizAnswer("budget", p.budget);
    if (p.vibe) setQuizAnswer("vibe", p.vibe);
    if (p.placeType) setQuizAnswer("placeType", p.placeType);
    if (p.month) setQuizAnswer("month", p.month);
    if (p.duration) setQuizAnswer("duration", p.duration);
    p.styles.forEach((s) => toggleStyle(s));
    router.push("/flights");
  };

  const handleBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      // silently fail — user stays on profile
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Błąd usuwania konta");
      }
      // Sign out locally and redirect
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut();
      router.replace("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd usuwania konta. Spróbuj ponownie.");
      setDeleting(false);
      setDeleteStep("idle");
    }
  };

  const handleSaveAgain = async () => {
    setSaving(true);
    const stored = useAppStore.getState().quizAnswers;
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz_preferences: stored }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!data?.authenticated) return null;

  const prefs = data.quiz_preferences;
  const initials = data.email?.slice(0, 2).toUpperCase() ?? "KE";

  return (
    <div className="flex flex-col flex-1 px-5 pb-10">
      {/* Header */}
      <div className="pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm font-medium transition-opacity hover:opacity-60"
          style={{ color: "var(--text-muted)" }}
        >
          ← Wstecz
        </button>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--accent)" }}>
          Włóczykij
        </p>
      </div>

      {/* Avatar + info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 flex items-center gap-4"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          {initials}
        </div>
        <div>
          <p className="font-bold text-base leading-tight">{data.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {data.is_pro ? (
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: "var(--accent)", color: "white" }}
              >
                ✦ Pro
              </span>
            ) : (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
              >
                {data.credits_remaining ?? 0} {(data.credits_remaining ?? 0) === 1 ? "plan" : (data.credits_remaining ?? 0) <= 4 ? "plany" : "planów"} pozostało
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Upgrade nudge for non-pro */}
      {!data.is_pro && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push("/pricing")}
          className="mt-4 w-full p-4 rounded-2xl text-left transition-opacity hover:opacity-90"
          style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.2)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            ✦ Zostań Pro — nielimitowane plany →
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            19,99 PLN/mies. lub 149,99 PLN/rok · anuluj kiedy chcesz
          </p>
        </motion.button>
      )}

      <div className="mt-6 h-px" style={{ background: "var(--border)" }} />

      {/* Saved preferences */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-6"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Preferencje podróży
          </p>
          {prefs && (
            <button
              onClick={() => router.push("/quiz")}
              className="text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              Edytuj →
            </button>
          )}
        </div>

        {prefs ? (
          <div className="glass-card p-4">
            <div className="flex flex-wrap gap-2">
              {prefs.budget && (
                <Chip label={prefs.budget === "low" ? "🎒 Backpacker" : "🧳 Komfortowy"} />
              )}
              {prefs.vibe && <Chip label={VIBE_LABELS[prefs.vibe] ?? prefs.vibe} />}
              {prefs.placeType && <Chip label={PLACE_LABELS[prefs.placeType] ?? prefs.placeType} />}
              {prefs.duration && <Chip label={`${prefs.duration} dni`} />}
              {prefs.month && <Chip label={`${["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"][prefs.month - 1]}`} />}
              {prefs.styles.map((s) => (
                <Chip key={s} label={TAG_LABELS[s] ?? s} />
              ))}
            </div>

            <button
              className="btn-primary mt-4"
              onClick={handleUsePreferences}
            >
              Użyj tych ustawień → Znajdź loty
            </button>
          </div>
        ) : (
          <div
            className="p-5 rounded-2xl text-center"
            style={{ background: "#F7F7F5", border: "1.5px dashed var(--border)" }}
          >
            <p className="text-sm font-medium">Brak zapisanych preferencji</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-muted)" }}>
              Zrób quiz raz — Twoje ustawienia zostaną zapamiętane.
            </p>
            <button
              className="btn-primary"
              onClick={() => router.push("/quiz")}
            >
              Zrób quiz →
            </button>
          </div>
        )}
      </motion.div>

      <div className="mt-6 h-px" style={{ background: "var(--border)" }} />

      {/* Trip history */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
          Moje podróże
        </p>

        {data.trips && data.trips.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.trips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => router.push(`/plan/${trip.id}`)}
                className="flex items-center justify-between p-4 rounded-2xl text-left transition-opacity hover:opacity-80 w-full"
                style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-sm font-semibold">{trip.city}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {trip.country} · {formatDate(trip.created_at)}
                    {trip.quiz_answers?.duration ? ` · ${trip.quiz_answers.duration} dni` : ""}
                  </p>
                </div>
                <span className="text-xs font-medium flex-shrink-0 ml-2" style={{ color: "var(--accent)" }}>
                  Otwórz →
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nie masz jeszcze żadnych wygenerowanych planów.
          </p>
        )}
      </motion.div>

      <div className="mt-6 h-px" style={{ background: "var(--border)" }} />

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3">
        {data.is_pro ? (
          <button
            onClick={handleBillingPortal}
            disabled={portalLoading}
            className="btn-primary"
          >
            {portalLoading ? "Przekierowuję…" : "✦ Zarządzaj subskrypcją Pro →"}
          </button>
        ) : (
          <button
            onClick={() => router.push("/pricing")}
            className="btn-primary"
          >
            Kup więcej planów →
          </button>
        )}
        <button
          onClick={handleSaveAgain}
          disabled={saving}
          className="text-sm font-semibold py-3 rounded-2xl transition-opacity hover:opacity-70"
          style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
        >
          {saved ? "✓ Zapisano!" : saving ? "Zapisuję…" : "Zapisz obecne ustawienia quizu"}
        </button>
      </div>

      {/* Account deletion */}
      <div className="mt-8 h-px" style={{ background: "var(--border)" }} />
      <div className="mt-6 pb-2">
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
          Strefa niebezpieczna
        </p>
        {deleteStep === "idle" ? (
          <button
            onClick={() => setDeleteStep("confirm")}
            className="text-sm font-semibold py-3 px-4 rounded-2xl transition-opacity hover:opacity-70 w-full"
            style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
          >
            Usuń konto i wszystkie dane
          </button>
        ) : (
          <div className="p-4 rounded-2xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#DC2626" }}>
              Czy na pewno chcesz usunąć konto?
            </p>
            <p className="text-xs mb-4" style={{ color: "#991B1B" }}>
              Zostaną trwale usunięte: Twoje konto, wszystkie wygenerowane plany podróży i historia płatności.
              Tej operacji nie można cofnąć.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 text-sm font-bold py-2.5 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "#DC2626", color: "white" }}
              >
                {deleting ? "Usuwam…" : "Tak, usuń konto"}
              </button>
              <button
                onClick={() => setDeleteStep("idle")}
                disabled={deleting}
                className="flex-1 text-sm font-semibold py-2.5 rounded-xl transition-opacity hover:opacity-80"
                style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
    >
      {label}
    </span>
  );
}
