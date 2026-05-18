/**
 * WhatsApp notifications via CallMeBot (free, personal use)
 *
 * Setup (jednorazowe):
 * 1. Dodaj +34 644 91 99 04 do kontaktów jako "CallMeBot"
 * 2. Wyślij na ten numer przez WhatsApp: "I allow callmebot to send me messages"
 * 3. Otrzymasz API key w odpowiedzi (np. 1234567)
 * 4. Ustaw w .env.local:
 *    WHATSAPP_PHONE=48XXXXXXXXX   (numer bez +, z kodem kraju)
 *    WHATSAPP_APIKEY=1234567
 */

export async function sendWhatsApp(message: string): Promise<void> {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_APIKEY;

  if (!phone || !apikey) {
    console.warn("[WhatsApp] WHATSAPP_PHONE lub WHATSAPP_APIKEY nie ustawione — pomijam");
    return;
  }

  try {
    const url = new URL("https://api.callmebot.com/whatsapp.php");
    url.searchParams.set("phone", phone);
    url.searchParams.set("text", message);
    url.searchParams.set("apikey", apikey);

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      console.error("[WhatsApp] Błąd wysyłki:", res.status, await res.text());
    }
  } catch (err) {
    // non-critical — nie blokujemy głównego flow
    console.error("[WhatsApp] fetch error:", err);
  }
}
