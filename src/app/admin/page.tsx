import { createClient as createServiceClient } from "@supabase/supabase-js";
import { DAILY_CAP } from "@/lib/flights/rapidapi";

interface GeminiRow {
  called_at: string;
  endpoint: string;
  model: string;
  success: boolean;
  error_code: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface UsageRow {
  called_at: string;
  cache_key: string;
  origin: string;
  dest: string;
  month: number;
  hit: boolean;
}

interface CacheRow {
  cache_key: string;
  expires_at: string;
  created_at: string;
  flights: unknown[];
}

interface DayStat {
  date: string;
  total: number;
  misses: number;
  hits: number;
}

async function getStats() {
  const sb = getServiceClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const [usageRes, cacheRes, alertRes, geminiRes] = await Promise.all([
    sb
      .from("api_usage_log")
      .select("called_at,cache_key,origin,dest,month,hit")
      .gte("called_at", sevenDaysAgo.toISOString())
      .order("called_at", { ascending: false })
      .limit(500),
    sb
      .from("flight_cache")
      .select("cache_key,expires_at,created_at,flights")
      .order("expires_at", { ascending: false }),
    sb
      .from("api_alert_log")
      .select("sent_at,threshold")
      .order("sent_at", { ascending: false })
      .limit(5),
    sb
      .from("gemini_usage_log")
      .select("called_at,endpoint,model,success,error_code,input_tokens,output_tokens")
      .gte("called_at", sevenDaysAgo.toISOString())
      .order("called_at", { ascending: false })
      .limit(500),
  ]);

  const rows: UsageRow[] = usageRes.data ?? [];
  const cacheRows: CacheRow[] = cacheRes.data ?? [];
  const alertRows = alertRes.data ?? [];
  const geminiRows: GeminiRow[] = geminiRes.data ?? [];

  // Today's stats
  const todayRows = rows.filter((r) => r.called_at >= todayStart.toISOString());
  const todayTotal = todayRows.length;
  const todayMisses = todayRows.filter((r) => !r.hit).length;
  const todayHits = todayRows.filter((r) => r.hit).length;
  const hitRate = todayTotal > 0 ? Math.round((todayHits / todayTotal) * 100) : 0;
  const capPct = Math.min(100, Math.round((todayMisses / DAILY_CAP) * 100));

  // 7-day breakdown
  const dayStats: DayStat[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const nextD = new Date(d);
    nextD.setUTCDate(nextD.getUTCDate() + 1);
    const dayRows = rows.filter(
      (r) => r.called_at >= d.toISOString() && r.called_at < nextD.toISOString()
    );
    dayStats.push({
      date: d.toISOString().slice(0, 10),
      total: dayRows.length,
      misses: dayRows.filter((r) => !r.hit).length,
      hits: dayRows.filter((r) => r.hit).length,
    });
  }

  const maxDayTotal = Math.max(...dayStats.map((d) => d.total), 1);

  // Gemini stats
  const geminiToday = geminiRows.filter((r) => r.called_at >= todayStart.toISOString());
  const geminiTodayTotal = geminiToday.length;
  const geminiTodayErrors = geminiToday.filter((r) => !r.success).length;
  const geminiTodayTokensIn = geminiToday.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const geminiTodayTokensOut = geminiToday.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const geminiQuotaErrors = geminiToday.filter((r) => r.error_code === "quota").length;

  const endpointCounts: Record<string, number> = {};
  const modelCounts: Record<string, number> = {};
  for (const r of geminiToday) {
    endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] ?? 0) + 1;
    if (r.success) modelCounts[r.model] = (modelCounts[r.model] ?? 0) + 1;
  }

  // Gemini 7-day breakdown
  const geminiDayStats: { date: string; total: number; errors: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const nextD = new Date(d);
    nextD.setUTCDate(nextD.getUTCDate() + 1);
    const dayRows = geminiRows.filter(
      (r) => r.called_at >= d.toISOString() && r.called_at < nextD.toISOString()
    );
    geminiDayStats.push({
      date: d.toISOString().slice(0, 10),
      total: dayRows.length,
      errors: dayRows.filter((r) => !r.success).length,
    });
  }
  const geminiMaxDay = Math.max(...geminiDayStats.map((d) => d.total), 1);

  return {
    todayMisses,
    todayHits,
    todayTotal,
    hitRate,
    capPct,
    dayStats,
    maxDayTotal,
    cacheRows,
    recentCalls: rows.slice(0, 20),
    alertRows,
    geminiTodayTotal,
    geminiTodayErrors,
    geminiTodayTokensIn,
    geminiTodayTokensOut,
    geminiQuotaErrors,
    endpointCounts,
    modelCounts,
    geminiDayStats,
    geminiMaxDay,
    geminiRecentCalls: geminiRows.slice(0, 20),
  };
}

function GaugeMeter({ pct, label, danger = 80 }: { pct: number; label: string; danger?: number }) {
  const color = pct >= danger ? "#EF4444" : pct >= 60 ? "#F59E0B" : "#22C55E";
  return (
    <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 42, fontWeight: 800, color }}>{pct}%</span>
      </div>
      <div style={{ background: "#111", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: 6, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: "#E5E5E5" }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#555" }}>{sub}</p>}
    </div>
  );
}

export default async function AdminPage() {
  const stats = await getStats();
  const now = new Date().toLocaleString("pl-PL", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" });

  return (
    <div style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#E5E5E5" }}>RapidAPI Monitor</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#555" }}>Odświeżono: {now} UTC</p>
        </div>
        <a href="/admin" style={{ background: "#1A1A1A", border: "1px solid #333", color: "#888", padding: "8px 16px", borderRadius: 8, fontSize: 12, textDecoration: "none" }}>
          ↻ Odśwież
        </a>
      </div>

      {/* Alert banner */}
      {stats.capPct >= 80 && (
        <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#FCA5A5", fontSize: 14 }}>
              Uwaga — {stats.capPct}% dziennego limitu RapidAPI wykorzystane
            </p>
            <p style={{ margin: "2px 0 0", color: "#F87171", fontSize: 12 }}>
              Zostało {DAILY_CAP - stats.todayMisses} callów. Alert e-mail wysłany.
            </p>
          </div>
        </div>
      )}
      {stats.capPct >= 60 && stats.capPct < 80 && (
        <div style={{ background: "#422006", border: "1px solid #78350f", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <p style={{ margin: 0, color: "#FCD34D", fontSize: 14 }}>
            {stats.capPct}% dziennego limitu — obserwuj. Zostało {DAILY_CAP - stats.todayMisses} callów.
          </p>
        </div>
      )}

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <GaugeMeter pct={stats.capPct} label="Dzienny cap API" />
        <GaugeMeter pct={stats.hitRate} label="Cache hit rate" danger={20} />
        <Stat label="Calle dziś (real)" value={stats.todayMisses} sub={`limit: ${DAILY_CAP}/dzień`} />
        <Stat label="Obsłużone z cache" value={stats.todayHits} sub={`łącznie: ${stats.todayTotal}`} />
        <Stat label="Trasy w cache" value={stats.cacheRows.length} sub="aktywnych wpisów" />
      </div>

      {/* 7-day bar chart */}
      <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <p style={{ margin: "0 0 20px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>Ostatnie 7 dni (real API calle)</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
          {stats.dayStats.map((d) => {
            const heightPct = Math.round((d.misses / stats.maxDayTotal) * 100);
            const capLine = Math.round((DAILY_CAP / stats.maxDayTotal) * 100);
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            const color = d.misses >= DAILY_CAP * 0.8 ? "#EF4444" : d.misses >= DAILY_CAP * 0.6 ? "#F59E0B" : "#22C55E";
            return (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", position: "relative" }}>
                {/* Cap reference line */}
                {capLine <= 100 && (
                  <div style={{ position: "absolute", bottom: `${capLine}%`, left: 0, right: 0, borderTop: "1px dashed #333", zIndex: 1 }} />
                )}
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                  <div
                    title={`${d.date}: ${d.misses} API, ${d.hits} cache`}
                    style={{
                      width: "100%",
                      height: `${Math.max(heightPct, d.misses > 0 ? 4 : 0)}%`,
                      background: color,
                      borderRadius: "4px 4px 0 0",
                      opacity: isToday ? 1 : 0.5,
                    }}
                  />
                </div>
                <span style={{ fontSize: 9, color: isToday ? "#E5E5E5" : "#555" }}>
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 10, color: "#444" }}>
          -- -- limit dzienny ({DAILY_CAP}) · słupki zaciemnione = poprzednie dni
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Cache contents */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
            Zawartość cache ({stats.cacheRows.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
            {stats.cacheRows.length === 0 && (
              <p style={{ margin: 0, color: "#555", fontSize: 12 }}>Brak wpisów w cache</p>
            )}
            {stats.cacheRows.map((row) => {
              const expiresAt = new Date(row.expires_at);
              const remainingMs = expiresAt.getTime() - Date.now();
              const remainingH = Math.max(0, Math.round(remainingMs / 3600000));
              const isExpiringSoon = remainingH <= 2;
              return (
                <div key={row.cache_key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#111", borderRadius: 6 }}>
                  <span style={{ fontSize: 12, color: "#CCC", fontFamily: "monospace" }}>{row.cache_key}</span>
                  <span style={{ fontSize: 11, color: isExpiringSoon ? "#F59E0B" : "#555", flexShrink: 0, marginLeft: 8 }}>
                    {remainingH}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent calls */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
            Ostatnie calle
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
            {stats.recentCalls.length === 0 && (
              <p style={{ margin: 0, color: "#555", fontSize: 12 }}>Brak danych</p>
            )}
            {stats.recentCalls.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "#111", borderRadius: 6 }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: r.hit ? "#052e16" : "#450a0a",
                  color: r.hit ? "#22C55E" : "#EF4444",
                  flexShrink: 0,
                }}>
                  {r.hit ? "HIT" : "API"}
                </span>
                <span style={{ fontSize: 11, color: "#CCC", fontFamily: "monospace", flex: 1 }}>
                  {r.origin}→{r.dest}
                </span>
                <span style={{ fontSize: 10, color: "#444" }}>
                  {new Date(r.called_at).toLocaleTimeString("pl-PL", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gemini AI Monitor ── */}
      <div style={{ marginTop: 40, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#E5E5E5" }}>Gemini AI Monitor</h2>
        <p style={{ margin: "2px 0 20px", fontSize: 12, color: "#555" }}>Dziś · {stats.geminiTodayTotal} wywołań</p>
      </div>

      {/* Gemini quota warning */}
      {stats.geminiQuotaErrors > 0 && (
        <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <p style={{ margin: 0, color: "#FCA5A5", fontSize: 13 }}>
            Dzisiaj wystąpiło <strong>{stats.geminiQuotaErrors}</strong> błędów quota — prawdopodobnie limit AI Studio. Przejdź na Google Cloud.
          </p>
        </div>
      )}

      {/* Gemini top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Stat label="Wywołania dziś" value={stats.geminiTodayTotal} sub="wszystkie endpointy" />
        <Stat label="Błędy dziś" value={stats.geminiTodayErrors} sub={stats.geminiTodayTotal > 0 ? `${Math.round((stats.geminiTodayErrors / stats.geminiTodayTotal) * 100)}% error rate` : "—"} />
        <Stat label="Tokeny wejście" value={stats.geminiTodayTokensIn.toLocaleString("pl-PL")} sub="prompt tokens" />
        <Stat label="Tokeny wyjście" value={stats.geminiTodayTokensOut.toLocaleString("pl-PL")} sub="output tokens" />
      </div>

      {/* Gemini 7-day chart + breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* 7-day bar chart */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 20px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>Ostatnie 7 dni</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {stats.geminiDayStats.map((d) => {
              const heightPct = Math.round((d.total / stats.geminiMaxDay) * 100);
              const isToday = d.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div
                      title={`${d.date}: ${d.total} wywołań, ${d.errors} błędów`}
                      style={{
                        width: "100%",
                        height: `${Math.max(heightPct, d.total > 0 ? 4 : 0)}%`,
                        background: d.errors > 0 ? "#F59E0B" : "#6366F1",
                        borderRadius: "4px 4px 0 0",
                        opacity: isToday ? 1 : 0.45,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 9, color: isToday ? "#E5E5E5" : "#555" }}>{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 10, color: "#444" }}>fiolet = OK · żółty = dzień z błędami</p>
        </div>

        {/* Endpoint + model breakdown */}
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>Endpointy dziś</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
            {Object.entries(stats.endpointCounts).length === 0 && (
              <p style={{ margin: 0, color: "#555", fontSize: 12 }}>Brak danych</p>
            )}
            {Object.entries(stats.endpointCounts).sort((a, b) => b[1] - a[1]).map(([ep, count]) => (
              <div key={ep} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: "#111", borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: "#CCC", fontFamily: "monospace" }}>{ep}</span>
                <span style={{ fontSize: 12, color: "#6366F1", fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>Modele (sukcesy)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {Object.entries(stats.modelCounts).length === 0 && (
              <p style={{ margin: 0, color: "#555", fontSize: 12 }}>Brak danych</p>
            )}
            {Object.entries(stats.modelCounts).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
              <div key={model} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: "#111", borderRadius: 6 }}>
                <span style={{ fontSize: 11, color: "#CCC", fontFamily: "monospace" }}>{model}</span>
                <span style={{ fontSize: 12, color: "#22C55E", fontWeight: 700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gemini recent calls */}
      <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px", marginBottom: 32 }}>
        <p style={{ margin: "0 0 16px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
          Ostatnie wywołania Gemini
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 300, overflowY: "auto" }}>
          {stats.geminiRecentCalls.length === 0 && (
            <p style={{ margin: 0, color: "#555", fontSize: 12 }}>Brak danych</p>
          )}
          {stats.geminiRecentCalls.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "#111", borderRadius: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                background: r.success ? "#052e16" : "#450a0a",
                color: r.success ? "#22C55E" : "#EF4444",
              }}>
                {r.success ? "OK" : r.error_code ?? "ERR"}
              </span>
              <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace", flexShrink: 0, width: 100 }}>{r.endpoint}</span>
              <span style={{ fontSize: 10, color: "#CCC", fontFamily: "monospace", flex: 1 }}>{r.model}</span>
              {r.input_tokens != null && (
                <span style={{ fontSize: 10, color: "#555" }}>
                  {r.input_tokens}↑ {r.output_tokens}↓
                </span>
              )}
              <span style={{ fontSize: 10, color: "#444", flexShrink: 0 }}>
                {new Date(r.called_at).toLocaleTimeString("pl-PL", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert history */}
      {stats.alertRows.length > 0 && (
        <div style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2 }}>
            Historia alertów e-mail
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stats.alertRows.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, fontSize: 12, color: "#888" }}>
                <span style={{ color: "#F59E0B" }}>⚠️ {a.threshold}%</span>
                <span>{new Date(a.sent_at).toLocaleString("pl-PL", { timeZone: "UTC" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
