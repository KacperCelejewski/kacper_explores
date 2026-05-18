"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import { downloadICS } from "@/lib/ics";
import ChatPanel from "@/app/components/ChatPanel";
import BudgetTracker from "@/app/components/BudgetTracker";
import type { DayPlan, DayActivity, TripPlan, DestinationRecommendation } from "@/types";
import { getCityPhotoUrl } from "@/lib/cityPhotos";

function buildBookingUrl(city: string, country: string, checkin?: string, checkout?: string): string {
  const params = new URLSearchParams({ ss: `${city}, ${country}`, group_adults: "1", no_rooms: "1" });
  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);
  return `https://www.booking.com/search.html?${params}`;
}

function buildHostelworldUrl(city: string): string {
  return `https://www.hostelworld.com/search?search=${encodeURIComponent(city)}`;
}

const ACTIVITY_COLORS: Record<string, string> = {
  attraction: "rgba(255,107,53,0.07)",
  food: "rgba(255,107,53,0.05)",
  transport: "#F7F7F5",
  tip: "rgba(255,107,53,0.06)",
  accommodation: "rgba(59,130,246,0.07)",
};

const ACTIVITY_BORDER: Record<string, string> = {
  attraction: "rgba(255,107,53,0.25)",
  food: "rgba(255,107,53,0.2)",
  transport: "#EBEBEB",
  tip: "rgba(255,107,53,0.2)",
  accommodation: "rgba(59,130,246,0.25)",
};

const ACTIVITY_LABELS: Record<string, string> = {
  attraction: "Atrakcja",
  food: "Jedzenie",
  transport: "Transport",
  tip: "Wskazówka",
  accommodation: "Nocleg",
};

interface PackingCategory {
  name: string;
  emoji: string;
  items: string[];
}

export default function PlanPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const { currentTrip, setCurrentTrip, updateTripDay, updateTripActivity, resetQuiz } = useAppStore();
  const [activeDay, setActiveDay] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<{ credits: number; isPro: boolean } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfGate, setPdfGate] = useState(false);

  // is_public toggle
  const [isPublic, setIsPublic] = useState(false);
  const [publicToggling, setPublicToggling] = useState(false);

  const handleTogglePublic = async () => {
    if (!currentTrip?.id || publicToggling) return;
    setPublicToggling(true);
    try {
      const res = await fetch(`/api/trips/${currentTrip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !isPublic }),
      });
      if (res.ok) setIsPublic((p) => !p);
    } finally {
      setPublicToggling(false);
    }
  };

  // Packing list state
  const [packingOpen, setPackingOpen] = useState(false);
  const [packingLoading, setPackingLoading] = useState(false);
  const [packingList, setPackingList] = useState<PackingCategory[] | null>(null);
  const [packingError, setPackingError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Regenerate day state — keyed by day index
  const [regenLoading, setRegenLoading] = useState<Record<number, boolean>>({});

  // Swap activity state — keyed by "dayIndex-activityIndex"
  const [swapLoading, setSwapLoading] = useState<Record<string, boolean>>({});

  // Transient error banner for regen/swap failures
  const [actionError, setActionError] = useState<string | null>(null);

  const handleShare = () => {
    if (!currentTrip?.id) return;
    if (!isPublic) {
      // Plan must be public before sharing — nudge user to toggle below
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      return;
    }
    const url = `${window.location.origin}/share/${currentTrip.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => window.print();

  const handlePDF = async () => {
    if (!userCredits?.isPro) {
      setPdfGate(true);
      return;
    }
    if (!currentTrip?.plan) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const planEl = document.getElementById("plan-print-area");
      if (!planEl) { window.print(); return; }
      const canvas = await html2canvas(planEl, { scale: 2, useCORS: true, backgroundColor: "#F5EFE0" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgW = 210;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 0;
      const pageH = 297;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, -y, imgW, imgH);
        y += pageH;
      }
      pdf.save(`wloczykij-${currentTrip.plan.city.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch {
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleICS = () => {
    if (!currentTrip?.plan) return;
    const startDate = currentTrip.destination?.bestOffer?.departureDate;
    downloadICS(currentTrip.plan, startDate);
  };

  const handlePackingList = async () => {
    if (packingList) { setPackingOpen((o) => !o); return; }
    setPackingOpen(true);
    setPackingLoading(true);
    setPackingError(null);
    try {
      const res = await fetch("/api/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: currentTrip?.plan?.city,
          country: currentTrip?.plan?.country,
          quizAnswers: currentTrip?.quizAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd generowania");
      setPackingList(data.categories);
    } catch (err) {
      setPackingError(err instanceof Error ? err.message : "Błąd sieci");
    } finally {
      setPackingLoading(false);
    }
  };

  const toggleChecked = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const showActionError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  const handleSwapActivity = async (dayIndex: number, activityIndex: number) => {
    if (!currentTrip?.id) return;
    const key = `${dayIndex}-${activityIndex}`;
    setSwapLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/swap-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: currentTrip.id, dayIndex, activityIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zamiany");
      updateTripActivity(dayIndex, activityIndex, data.activity);
    } catch {
      showActionError("Nie udało się zamienić aktywności. Spróbuj ponownie.");
    } finally {
      setSwapLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRegenerateDay = async (dayIndex: number) => {
    if (!currentTrip?.id) return;
    setRegenLoading((prev) => ({ ...prev, [dayIndex]: true }));
    try {
      const res = await fetch("/api/regenerate-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: currentTrip.id, dayIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd regeneracji");
      updateTripDay(dayIndex, data.day);
    } catch {
      showActionError("Nie udało się wygenerować nowego planu dnia. Spróbuj ponownie.");
    } finally {
      setRegenLoading((prev) => ({ ...prev, [dayIndex]: false }));
    }
  };

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setUserCredits({ credits: d.credits_remaining ?? 0, isPro: d.is_pro ?? false });
        }
      })
      .catch(() => {});
  }, []);

  // Store-first, Supabase fallback (active session required)
  useEffect(() => {
    const tripId = params?.tripId;
    if (!tripId) { router.replace("/"); return; }
    if (currentTrip?.id === tripId && currentTrip.plan) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/trips/${tripId}`)
      .then((r) => {
        if (r.status === 401) { router.replace(`/login?next=/plan/${tripId}`); return null; }
        if (!r.ok) { router.replace("/"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setIsPublic(data.is_public ?? false);
        setCurrentTrip({
          id: data.id,
          destination: data.destination,
          quizAnswers: data.quizAnswers,
          plan: data.plan as TripPlan,
          createdAt: new Date().toISOString(),
        });
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [params?.tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !currentTrip?.plan) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4" aria-busy="true" aria-label="Ładowanie planu podróży">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-3xl"
          aria-hidden="true"
        >
          ✈️
        </motion.div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ładowanie planu…</p>
      </div>
    );
  }

  const { plan, destination } = currentTrip;
  const dest = destination as DestinationRecommendation | null;

  return (
    <div className="flex flex-col flex-1 pb-8" id="plan-print-area">
      {/* Hero photo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full overflow-hidden no-print"
        style={{ height: 220 }}
      >
        <Image
          src={getCityPhotoUrl(plan.city, 1600)}
          alt={plan.city}
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        <div className="absolute top-4 left-5">
          <button
            onClick={() => router.push("/flights")}
            className="text-sm transition-opacity hover:opacity-70 no-print"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            ← Zmień kierunek
          </button>
        </div>
        <div className="absolute bottom-5 left-5 right-5">
          <h1 className="text-2xl font-bold text-white leading-tight">
            {plan.city} {dest?.countryFlag ?? ""}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
            {plan.duration} dni · {plan.country}
          </p>
        </div>
      </motion.div>

      {/* Header */}
      <div className="px-5 pt-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="sr-only">
            <h1>{plan.city} {dest?.countryFlag ?? ""} — {plan.duration} dni · {plan.country}</h1>
          </div>

          {/* Budget breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <BudgetItem label="Loty" value={plan.budgetBreakdown.flights} emoji="✈️" />
            <BudgetItem label="Nocleg" value={plan.budgetBreakdown.accommodation} emoji="🛏️" />
            <BudgetItem label="Jedzenie" value={plan.budgetBreakdown.food} emoji="🍽️" />
            <BudgetItem label="Atrakcje" value={plan.budgetBreakdown.attractions} emoji="🎟️" />
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Szacowany całkowity koszt
            </span>
            <span className="text-base font-bold" style={{ color: "var(--accent)" }}>
              {plan.totalBudgetEstimate}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Upsell banner — show when low on credits or out */}
      {userCredits && !userCredits.isPro && userCredits.credits <= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mx-5 mb-4 p-4 rounded-2xl no-print"
          style={{ background: "var(--accent-light)", border: "2px solid var(--accent)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
            {userCredits.credits === 0 ? "To był ostatni plan ✦" : `Zostały Ci ${userCredits.credits} ${userCredits.credits === 1 ? "plan" : "plany"} ✦`}
          </p>
          <p className="text-xs mt-1 mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Kup Pack (5 planów, 14,99 PLN) albo przejdź na Pro z nielimitowanymi planami i historią wyjazdów.
          </p>
          <div className="flex gap-2">
            <a
              href="/pricing"
              className="flex-1 text-xs font-bold py-2.5 rounded-xl text-center"
              style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}
            >
              Kup Pack — 14,99 PLN →
            </a>
            <a
              href="/pricing"
              className="text-xs font-semibold px-3 py-2.5 rounded-xl"
              style={{ background: "white", color: "var(--accent)", border: "1px solid var(--accent)", textDecoration: "none" }}
            >
              Pro
            </a>
          </div>
        </motion.div>
      )}

      {/* Hotel suggestions */}
      <div className="px-5 mb-4 no-print">
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
          Noclegi w {plan.city}
        </p>
        <div className="flex flex-col gap-2">
          {[
            {
              label: "🛏️ Booking.com",
              sub: "Hotele i apartamenty",
              url: buildBookingUrl(
                plan.city, plan.country,
                dest?.bestOffer?.departureDate,
                dest?.bestOffer?.returnDate,
              ),
              color: "#003580",
              bg: "#EEF3FF",
            },
            {
              label: "🏕️ Hostelworld",
              sub: "Hostele dla backpackerów",
              url: buildHostelworldUrl(plan.city),
              color: "#FF6C2F",
              bg: "#FFF0E8",
            },
          ].map((opt) => (
            <a
              key={opt.label}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-2xl transition-opacity hover:opacity-80"
              style={{ background: opt.bg, textDecoration: "none", border: `1px solid ${opt.color}22` }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: opt.color }}>{opt.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.sub}</p>
              </div>
              <span className="text-xs font-semibold" style={{ color: opt.color }}>Szukaj →</span>
            </a>
          ))}
        </div>
      </div>

      {/* Tips */}
      {plan.generalTips?.length > 0 && (
        <div className="px-5 mb-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
            Wskazówki budżetowe
          </p>
          <div className="flex flex-col gap-2">
            {plan.generalTips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.06 }}
                className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "var(--accent-light)", border: "1px solid rgba(255,107,53,0.15)" }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>✦</span>
                <p className="text-xs leading-relaxed">{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action error banner */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-5 mb-3 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 no-print"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <p className="text-sm" style={{ color: "#DC2626" }}>{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="flex-shrink-0 text-xs font-bold transition-opacity hover:opacity-70"
              style={{ color: "#DC2626" }}
              aria-label="Zamknij"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day tabs — hidden in print */}
      <div className="px-5 mb-4 no-print" data-day-tabs>
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
          Plan dzienny
        </p>
        <div
          role="tablist"
          aria-label="Dni podróży"
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {plan.days.map((day, i) => (
            <button
              key={day.day}
              role="tab"
              id={`tab-day-${i}`}
              aria-selected={activeDay === i}
              aria-controls={`tabpanel-day-${i}`}
              tabIndex={activeDay === i ? 0 : -1}
              onClick={() => setActiveDay(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setActiveDay((prev) => Math.min(prev + 1, plan.days.length - 1));
                if (e.key === "ArrowLeft")  setActiveDay((prev) => Math.max(prev - 1, 0));
              }}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: activeDay === i ? "var(--accent)" : "#F0F0F0",
                color: activeDay === i ? "white" : "var(--text-secondary)",
              }}
            >
              Dzień {day.day}
            </button>
          ))}
        </div>
      </div>

      {/* Day panels — all rendered, only active shown on screen, all visible in print */}
      {plan.days.map((day, i) => (
        <div
          key={day.day}
          role="tabpanel"
          id={`tabpanel-day-${i}`}
          aria-labelledby={`tab-day-${i}`}
          data-print-day
          style={{ display: activeDay === i ? "block" : "none" }}
        >
          <DayPlanView
            day={day}
            city={plan.city}
            dayIndex={i}
            tripId={currentTrip.id}
            regenLoading={!!regenLoading[i]}
            onRegenerate={handleRegenerateDay}
            swapLoading={swapLoading}
            onSwapActivity={handleSwapActivity}
          />
        </div>
      ))}

      {/* Print-only day label */}
      <style>{`
        @media print {
          [data-print-day] { display: block !important; }
          [data-day-tabs] { display: none !important; }
        }
      `}</style>

      {/* Packing list */}
      <div className="px-5 mt-4 no-print">
        <button
          onClick={handlePackingList}
          disabled={packingLoading}
          className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
          style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid rgba(196,98,45,0.2)" }}
        >
          {packingLoading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              Generuję listę…
            </>
          ) : (
            <>{packingOpen && packingList ? "🧳 Lista rzeczy ↑" : "🧳 Wygeneruj listę do spakowania"}</>
          )}
        </button>

        <AnimatePresence>
          {packingOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                {packingError && (
                  <p className="text-sm text-center py-3" style={{ color: "var(--error)" }}>{packingError}</p>
                )}
                {packingList && (
                  <div className="flex flex-col gap-3">
                    {packingList.map((cat) => (
                      <div key={cat.name} className="glass-card p-4">
                        <p className="text-sm font-bold mb-2">{cat.emoji} {cat.name}</p>
                        <div className="flex flex-col gap-1.5">
                          {cat.items.map((item) => {
                            const key = `${cat.name}::${item}`;
                            const checked = checkedItems.has(key);
                            return (
                              <button
                                key={item}
                                onClick={() => toggleChecked(key)}
                                className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-70"
                              >
                                <span
                                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border text-xs"
                                  style={{
                                    background: checked ? "var(--accent)" : "transparent",
                                    borderColor: checked ? "var(--accent)" : "var(--border)",
                                    color: "white",
                                  }}
                                >
                                  {checked ? "✓" : ""}
                                </span>
                                <span
                                  className="text-sm"
                                  style={{
                                    textDecoration: checked ? "line-through" : "none",
                                    color: checked ? "var(--text-muted)" : "var(--text-primary)",
                                  }}
                                >
                                  {item}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Budget tracker */}
      {currentTrip && (
        <div className="px-5 mt-4 no-print">
          <BudgetTracker
            tripId={currentTrip.id}
            plannedBreakdown={plan.budgetBreakdown}
            plannedTotal={plan.totalBudgetEstimate}
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-5 mt-6 flex flex-col gap-3">
        {/* Saved indicator */}
        <div
          className="flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold"
          style={{ background: "#DCFCE7", color: "#16A34A" }}
        >
          <span>✓</span>
          <span>Plan zapisany na Twoim koncie</span>
        </div>

        <div className="grid grid-cols-3 gap-2 no-print">
          <button
            onClick={handleShare}
            className="py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            style={{
              background: copied && !isPublic ? "#FEF3C7" : copied ? "#DCFCE7" : "#F0F0F0",
              color: copied && !isPublic ? "#92400E" : copied ? "#16A34A" : "var(--text-secondary)",
            }}
          >
            {copied && !isPublic ? "↓ Najpierw udostępnij plan" : copied ? "✓ Skopiowano!" : "🔗 Udostępnij"}
          </button>
          <button
            onClick={handlePDF}
            disabled={pdfLoading}
            className="py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1 transition-all hover:opacity-80 relative"
            style={{
              background: userCredits?.isPro ? "#F0F0F0" : "var(--accent-light)",
              color: userCredits?.isPro ? "var(--text-secondary)" : "var(--accent)",
            }}
          >
            {pdfLoading ? "…" : userCredits?.isPro ? "📄 PDF" : "🔒 PDF Pro"}
          </button>
          <button
            onClick={handleICS}
            className="py-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1 transition-all hover:opacity-80"
            style={{ background: "#F0F0F0", color: "var(--text-secondary)" }}
          >
            📅 Kalendarz
          </button>
        </div>

        {/* Map link */}
        <button
          onClick={() => router.push(`/plan/${currentTrip?.id}/mapa`)}
          className="py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80 no-print"
          style={{ background: "#E8F4FD", color: "#1A73E8" }}
        >
          🗺️ Mapa atrakcji
        </button>

        {/* is_public toggle */}
        <button
          onClick={handleTogglePublic}
          disabled={publicToggling}
          className="py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-80 no-print disabled:opacity-40"
          style={{
            background: isPublic ? "#DCFCE7" : "#F0F0F0",
            color: isPublic ? "#16A34A" : "var(--text-secondary)",
          }}
        >
          {publicToggling ? "…" : isPublic ? "✓ Plan widoczny w galerii" : "🌍 Udostępnij w galerii Odkryj"}
        </button>

        <button
          className="btn-primary no-print"
          onClick={() => { resetQuiz(); router.push("/"); }}
        >
          Zaplanuj nową podróż →
        </button>
      </div>

      {/* PDF Pro gate modal */}
      <AnimatePresence>
        {pdfGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end justify-center no-print"
            style={{ background: "rgba(0,0,0,0.65)", zIndex: 9999 }}
            onClick={(e) => { if (e.target === e.currentTarget) setPdfGate(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full max-w-lg rounded-t-3xl px-5 pb-8 pt-5"
              style={{ background: "#F5EFE0" }}
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
              </div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--accent)" }}>
                Funkcja Pro
              </p>
              <h2 className="text-2xl font-bold leading-tight mb-1">
                Eksport PDF<br />wymaga Pro
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Zapisz swój plan jako gotowy PDF — idealny do druku i offline. Dostępny dla użytkowników Pro.
              </p>
              <div className="flex flex-col gap-3 mb-4">
                <a
                  href="/pricing"
                  className="block p-4 rounded-2xl"
                  style={{ background: "var(--accent)", textDecoration: "none" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">✦ Pro Roczny</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
                        PDF · nielimitowane plany · historia wyjazdów
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base text-white">149,99 PLN</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>12,50 PLN/mies.</p>
                    </div>
                  </div>
                </a>
                <a
                  href="/pricing"
                  className="block p-4 rounded-2xl"
                  style={{ background: "#FFFFFF", border: "1.5px solid var(--border)", textDecoration: "none" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">🎒 Pack</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>5 planów bez wygasania</p>
                    </div>
                    <p className="font-bold text-sm" style={{ color: "var(--accent)" }}>14,99 PLN</p>
                  </div>
                </a>
              </div>
              <button
                onClick={() => setPdfGate(false)}
                className="w-full py-3 text-sm font-semibold rounded-2xl"
                style={{ background: "transparent", color: "var(--text-muted)", border: "1.5px solid var(--border)" }}
              >
                Może później
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating chat panel */}
      {currentTrip && (
        <ChatPanel tripId={currentTrip.id} city={plan.city} />
      )}
    </div>
  );
}

function BudgetItem({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base" aria-hidden="true">{emoji}</span>
      <div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function buildMapsRouteUrl(activities: DayActivity[], city: string): string | null {
  const locations = activities
    .filter((a) => a.location && a.type !== "tip" && a.type !== "transport")
    .map((a) => encodeURIComponent(`${a.location}, ${city}`));
  if (locations.length < 1) return null;
  if (locations.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${locations[0]}`;
  }
  return `https://www.google.com/maps/dir/${locations.join("/")}`;
}

function DayPlanView({
  day,
  city,
  dayIndex,
  tripId,
  regenLoading,
  onRegenerate,
  swapLoading,
  onSwapActivity,
}: {
  day: DayPlan;
  city: string;
  dayIndex: number;
  tripId: string;
  regenLoading: boolean;
  onRegenerate: (i: number) => void;
  swapLoading: Record<string, boolean>;
  onSwapActivity: (dayIndex: number, activityIndex: number) => void;
}) {
  const mapsUrl = buildMapsRouteUrl(day.activities, city);

  return (
    <motion.div
      key={day.day}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="px-5"
    >
      <div
        className="px-4 py-3 mb-3 rounded-2xl flex items-center justify-between gap-3"
        style={{ background: "#F7F7F5", border: "1px solid var(--border)" }}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{day.date}</p>
          <p className="text-sm font-medium mt-0.5">{day.theme}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70 no-print"
              style={{ background: "#E8F4FD", color: "#1A73E8", textDecoration: "none" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Trasa
            </a>
          )}
          <button
            onClick={() => onRegenerate(dayIndex)}
            disabled={regenLoading}
            title="Zaproponuj inny plan tego dnia"
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-70 disabled:opacity-40 no-print"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            {regenLoading ? (
              <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            ) : (
              "↻"
            )}
            {regenLoading ? "…" : "Inny pomysł"}
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute left-[22px] top-0 bottom-0 w-px"
          style={{ background: "var(--border)" }}
        />
        <div className="flex flex-col gap-3">
          {day.activities.map((activity, i) => (
            <ActivityCard
              key={i}
              activity={activity}
              index={i}
              swapping={!!swapLoading[`${dayIndex}-${i}`]}
              onSwap={() => onSwapActivity(dayIndex, i)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ActivityCard({
  activity,
  index,
  swapping,
  onSwap,
}: {
  activity: DayActivity;
  index: number;
  swapping: boolean;
  onSwap: () => void;
}) {
  const bg = ACTIVITY_COLORS[activity.type] ?? ACTIVITY_COLORS.transport;
  const border = ACTIVITY_BORDER[activity.type] ?? ACTIVITY_BORDER.transport;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-3 relative"
    >
      <div className="flex-shrink-0 w-11 text-center relative z-10">
        <span className="text-lg" aria-hidden="true">{activity.emoji}</span>
        <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
          {activity.time}
        </p>
      </div>

      <div
        className="flex-1 rounded-2xl px-4 py-3 mb-1"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{activity.title}</p>
            <span
              className="inline-block text-xs mt-0.5 px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}
            >
              {ACTIVITY_LABELS[activity.type] ?? activity.type}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onSwap}
              disabled={swapping}
              title="Zamień na inną aktywność"
              className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-70 disabled:opacity-40 no-print"
              style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}
            >
              {swapping ? (
                <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block" style={{ borderColor: "var(--text-secondary)", borderTopColor: "transparent" }} />
              ) : "↻"}
            </button>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{
                background:
                  activity.cost === "Free" || activity.cost === "Bezpłatnie"
                    ? "rgba(34,197,94,0.12)"
                    : "#F0F0F0",
                color:
                  activity.cost === "Free" || activity.cost === "Bezpłatnie"
                    ? "#16A34A"
                    : "var(--text-muted)",
              }}
            >
              {activity.cost}
            </span>
          </div>
        </div>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {activity.description}
        </p>
        {activity.location && (
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              <span aria-hidden="true">📍 </span>{activity.location}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold ml-2 flex-shrink-0 transition-opacity hover:opacity-70 no-print"
              style={{ color: "#1A73E8", textDecoration: "none" }}
            >
              Nawiguj →
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
