import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ProfileRow {
  id: string;
  subscription_tier: string;
  credits_remaining: number;
  created_at: string;
  stripe_customer_id: string | null;
}

interface TripRow {
  user_id: string;
  city: string;
  country: string | null;
  created_at: string;
}

interface PaymentRow {
  user_id: string;
  amount_cents: number;
  plan_type: string | null;
  created_at: string;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

async function getAnalytics() {
  const sb = getServiceClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const [authRes, profilesRes, tripsRes, paymentsRes] = await Promise.all([
    sb.auth.admin.listUsers({ perPage: 1000 }),
    sb.from("user_profiles").select("id,subscription_tier,credits_remaining,created_at,stripe_customer_id"),
    sb.from("trips").select("user_id,city,country,created_at").gte("created_at", thirtyDaysAgo.toISOString()),
    sb.from("payments").select("user_id,amount_cents,plan_type,created_at"),
  ]);

  const authUsers: AuthUser[] = (authRes.data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }));

  const profiles: ProfileRow[] = profilesRes.data ?? [];
  const trips: TripRow[] = tripsRes.data ?? [];
  const payments: PaymentRow[] = paymentsRes.data ?? [];

  // ── Totals ──
  const totalUsers = authUsers.length;
  const proUsers = profiles.filter((p) => p.subscription_tier === "pro").length;
  const freeNoCredits = profiles.filter(
    (p) => p.subscription_tier === "free" && p.credits_remaining === 0
  ).length;
  const freeWithCredits = profiles.filter(
    (p) => p.subscription_tier === "free" && p.credits_remaining > 0
  ).length;
  const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : "0";

  // ── New users per day (last 7 days) ──
  const signupDayStats: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const nextD = new Date(d);
    nextD.setUTCDate(nextD.getUTCDate() + 1);
    const count = authUsers.filter(
      (u) => u.created_at >= d.toISOString() && u.created_at < nextD.toISOString()
    ).length;
    signupDayStats.push({ date: d.toISOString().slice(0, 10), count });
  }
  const maxSignups = Math.max(...signupDayStats.map((d) => d.count), 1);
  const newUsersToday = signupDayStats[signupDayStats.length - 1].count;
  const newUsersWeek = signupDayStats.reduce((s, d) => s + d.count, 0);

  // ── Active users (generated trip) ──
  const activeToday = new Set(
    trips.filter((t) => t.created_at >= todayStart.toISOString()).map((t) => t.user_id)
  ).size;
  const activeWeek = new Set(
    trips.filter((t) => t.created_at >= sevenDaysAgo.toISOString()).map((t) => t.user_id)
  ).size;
  const activeMonth = new Set(trips.map((t) => t.user_id)).size;

  // ── Trips per day (last 7 days) ──
  const tripDayStats: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const nextD = new Date(d);
    nextD.setUTCDate(nextD.getUTCDate() + 1);
    const count = trips.filter(
      (t) => t.created_at >= d.toISOString() && t.created_at < nextD.toISOString()
    ).length;
    tripDayStats.push({ date: d.toISOString().slice(0, 10), count });
  }
  const maxTrips = Math.max(...tripDayStats.map((d) => d.count), 1);
  const tripsToday = tripDayStats[tripDayStats.length - 1].count;

  // ── Conversion funnel ──
  const usersWithTrip = new Set(trips.map((t) => t.user_id)).size;
  const usersWithPayment = new Set(payments.map((p) => p.user_id)).size;

  // ── Revenue ──
  const totalRevenueCents = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const revenueThisMonth = payments
    .filter(() => {
      const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString();
      return true; // will filter below
    })
    .filter((p) => {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      return p.created_at >= monthStart;
    })
    .reduce((s, p) => s + (p.amount_cents ?? 0), 0);

  const planBreakdown: Record<string, number> = {};
  for (const p of payments) {
    const key = p.plan_type ?? "unknown";
    planBreakdown[key] = (planBreakdown[key] ?? 0) + 1;
  }

  // ── Top destinations (last 30d) ──
  const destCount: Record<string, number> = {};
  for (const t of trips) {
    const key = `${t.city}${t.country ? `, ${t.country}` : ""}`;
    destCount[key] = (destCount[key] ?? 0) + 1;
  }
  const topDests = Object.entries(destCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // ── Recent signups ──
  const recentSignups = authUsers
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((u) => {
      const profile = profiles.find((p) => p.id === u.id);
      return {
        email: u.email,
        created_at: u.created_at,
        tier: profile?.subscription_tier ?? "free",
        credits: profile?.credits_remaining ?? 0,
        tripsCount: trips.filter((t) => t.user_id === u.id).length,
      };
    });

  return {
    totalUsers,
    proUsers,
    freeNoCredits,
    freeWithCredits,
    conversionRate,
    newUsersToday,
    newUsersWeek,
    activeToday,
    activeWeek,
    activeMonth,
    tripsToday,
    signupDayStats,
    maxSignups,
    tripDayStats,
    maxTrips,
    usersWithTrip,
    usersWithPayment,
    totalRevenueCents,
    revenueThisMonth,
    planBreakdown,
    topDests,
    recentSignups,
  };
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 34, fontWeight: 800, color: accent ?? "#E5E5E5" }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#555" }}>{sub}</p>}
    </div>
  );
}

function MiniBar({ stats, max, color }: { stats: { date: string; count: number }[]; max: number; color: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
      {stats.map((d) => {
        const h = Math.max((d.count / max) * 100, d.count > 0 ? 5 : 0);
        const isToday = d.date === today;
        return (
          <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div
                title={`${d.date}: ${d.count}`}
                style={{ width: "100%", height: `${h}%`, background: color, borderRadius: "3px 3px 0 0", opacity: isToday ? 1 : 0.4 }}
              />
            </div>
            <span style={{ fontSize: 8, color: isToday ? "#E5E5E5" : "#444" }}>{d.date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#AAA" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#E5E5E5", fontWeight: 700 }}>{value} <span style={{ color: "#555", fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ background: "#111", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const s = await getAnalytics();
  const now = new Date().toLocaleString("pl-PL", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" });

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#E5E5E5" }}>Analityka użytkowników</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#555" }}>Odświeżono: {now} UTC</p>
        </div>
        <a href="/admin/analytics" style={{ background: "#1A1A1A", border: "1px solid #333", color: "#888", padding: "8px 16px", borderRadius: 8, fontSize: 12, textDecoration: "none" }}>
          ↻ Odśwież
        </a>
      </div>

      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Stat label="Wszyscy użytkownicy" value={s.totalUsers} sub={`+${s.newUsersWeek} ten tydzień`} />
        <Stat label="Nowi dziś" value={s.newUsersToday} sub={`+${s.newUsersWeek} ostatnie 7 dni`} accent="#6366F1" />
        <Stat label="Aktywni dziś" value={s.activeToday} sub={`${s.activeWeek} ten tydzień`} accent="#22C55E" />
        <Stat label="Plany dziś" value={s.tripsToday} sub="wygenerowanych" accent="#F59E0B" />
        <Stat label="Pro" value={s.proUsers} sub={`konwersja ${s.conversionRate}%`} accent="#FF6B35" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
            Nowe rejestracje — ostatnie 7 dni
          </p>
          <MiniBar stats={s.signupDayStats} max={s.maxSignups} color="#6366F1" />
        </div>
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
            Wygenerowane plany — ostatnie 7 dni
          </p>
          <MiniBar stats={s.tripDayStats} max={s.maxTrips} color="#F59E0B" />
        </div>
      </div>

      {/* Funnel + Segments + Revenue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Funnel */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 20px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>Lejek konwersji</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FunnelBar label="Zarejestrowani" value={s.totalUsers} total={s.totalUsers} color="#6366F1" />
            <FunnelBar label="Wygenerowali plan" value={s.usersWithTrip} total={s.totalUsers} color="#F59E0B" />
            <FunnelBar label="Zapłacili" value={s.usersWithPayment} total={s.totalUsers} color="#22C55E" />
            <FunnelBar label="Pro aktywne" value={s.proUsers} total={s.totalUsers} color="#FF6B35" />
          </div>
        </div>

        {/* User segments */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 20px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>Segmenty</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Pro", value: s.proUsers, color: "#FF6B35" },
              { label: "Free z kredytami", value: s.freeWithCredits, color: "#22C55E" },
              { label: "Free bez kredytów", value: s.freeNoCredits, color: "#EF4444", note: "do konwersji" },
            ].map(({ label, value, color, note }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#111", borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 12, color: "#CCC" }}>{label}</span>
                  {note && <span style={{ fontSize: 10, color: "#666", marginLeft: 6 }}>{note}</span>}
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 20px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>Przychód</p>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "#555" }}>łącznie</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#22C55E" }}>
              {(s.totalRevenueCents / 100).toFixed(2)} zł
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "#555" }}>ten miesiąc</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#E5E5E5" }}>
              {(s.revenueThisMonth / 100).toFixed(2)} zł
            </p>
          </div>
          <div style={{ borderTop: "1px solid #2A2A2A", paddingTop: 12 }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>Pakiety</p>
            {Object.entries(s.planBreakdown).map(([plan, count]) => (
              <div key={plan} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace" }}>{plan}</span>
                <span style={{ color: "#CCC" }}>{count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top destinations + Recent signups */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Top destinations */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
            Top destynacje (30 dni)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {s.topDests.length === 0 && <p style={{ margin: 0, color: "#555", fontSize: 12 }}>Brak danych</p>}
            {s.topDests.map(([dest, count], i) => {
              const maxCount = s.topDests[0]?.[1] ?? 1;
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={dest}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: "#CCC" }}>
                      <span style={{ color: "#555", marginRight: 6 }}>#{i + 1}</span>{dest}
                    </span>
                    <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ background: "#111", borderRadius: 3, height: 4 }}>
                    <div style={{ background: "#F59E0B", width: `${pct}%`, height: "100%", borderRadius: 3, opacity: 0.7 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent signups */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
            Ostatnie rejestracje
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
            {s.recentSignups.map((u, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#111", borderRadius: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                  background: u.tier === "pro" ? "#431407" : "#111",
                  color: u.tier === "pro" ? "#FF6B35" : "#555",
                  border: u.tier === "pro" ? "1px solid #7c2d12" : "1px solid #222",
                }}>
                  {u.tier.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: "#CCC", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.email}
                </span>
                <span style={{ fontSize: 10, color: "#555", flexShrink: 0 }}>
                  {u.tripsCount} {u.tripsCount === 1 ? "plan" : "planów"}
                </span>
                <span style={{ fontSize: 10, color: "#444", flexShrink: 0 }}>
                  {new Date(u.created_at).toLocaleDateString("pl-PL", { timeZone: "UTC", day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
