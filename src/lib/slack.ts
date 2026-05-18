/**
 * Slack notifications via Incoming Webhooks
 *
 * Setup:
 * 1. api.slack.com/apps → Create New App → From scratch
 * 2. Incoming Webhooks → włącz → Add New Webhook → wybierz kanał
 * 3. Skopiuj Webhook URL
 * 4. Dodaj do .env.local:
 *    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
 */

export async function sendSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;

  if (!url) {
    console.warn("[Slack] SLACK_WEBHOOK_URL nie ustawione — pomijam");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error("[Slack] Błąd wysyłki:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Slack] fetch error:", err);
  }
}
