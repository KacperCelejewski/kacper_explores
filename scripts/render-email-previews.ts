// Renderuje szablony maili do docs/email-previews/ z PRZYKŁADOWYMI danymi (nie prawdziwe okazje, nie prawdziwi użytkownicy).
// Uruchom: npx vite-node --config vitest.config.ts scripts/render-email-previews.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dropConfirmationMail, dropManageLinkMail, newsletterConfirmationMail } from "../src/lib/email";
import { renderDropEmail } from "../src/lib/drop/email";
import { renderPreTripEmail } from "../src/lib/preTripEmail";
import type { CityTeaser, DropDeal } from "../src/lib/drop/types";

const OUT = path.resolve(__dirname, "../docs/email-previews");
mkdirSync(OUT, { recursive: true });

const SAMPLE_BANNER =
  `<div style="background:#FFF3B0;color:#1C1008;font:700 13px/1.4 system-ui,sans-serif;padding:8px 12px;text-align:center;">PODGLĄD: dane przykładowe, wymyślone na potrzeby podglądu. To nie jest prawdziwa oferta.</div>`;

function save(name: string, subject: string, html: string, text: string) {
  const withBanner = html.replace(/<body([^>]*)>/, `<body$1>${SAMPLE_BANNER}`);
  writeFileSync(path.join(OUT, `${name}.html`), withBanner, "utf-8");
  writeFileSync(path.join(OUT, `${name}.txt`), `Temat: ${subject}\n\n${text}\n`, "utf-8");
  console.log("zapisano", name);
}

const deal = (code: string, name: string, price: number, over: Partial<DropDeal> = {}): DropDeal => ({
  week: "2026-W47", origin: "WRO", city_code: code, city_name: name, price,
  departure_at: "2026-11-20T19:05:00+01:00", return_at: "2026-11-22T21:40:00+01:00",
  airline: "FR", transfers: 0, link: `/search/WRO2011${code}22111?t=PODGLAD`,
  duration_to: 130, fetched_at: "2026-11-18T21:00:00Z", ...over,
});

const teaser = (code: string, t: string, b: string): [string, CityTeaser] => [
  code, { week: "2026-W47", city_code: code, teaser: t, local_budget: b },
];

const base = { week: "2026-W47", appUrl: "https://wloczykij.me", marker: "PODGLAD", unsubscribeToken: "PODGLAD-TOKEN" };

// Zrzut: trzy okazje (przykładowe)
const three = renderDropEmail({
  ...base, originCity: "Wrocławia",
  deals: [
    deal("LIS", "Lizbona", 389),
    deal("MIL", "Mediolan", 201, { airline: "W6", duration_to: 105 }),
    deal("BUD", "Budapeszt", 165, { airline: "LO", transfers: 1, duration_to: null }),
  ],
  teasers: new Map([
    teaser("LIS", "Tramwaj 28, pastéis de nata i zachód słońca z miradouro.", "Obiad ok. 40 zł, kawa 6 zł (przykład)"),
    teaser("MIL", "Duomo rano, aperitivo wieczorem.", "Aperitivo ok. 45 zł (przykład)"),
  ]),
});
save("drop-3-okazje", three.subject, three.html, three.text);

// Zrzut: jedna okazja, bez zajawki
const one = renderDropEmail({ ...base, originCity: "Wrocławia", deals: [deal("MIL", "Mediolan", 201)], teasers: new Map() });
save("drop-1-okazja", one.subject, one.html, one.text);

const nl = newsletterConfirmationMail("https://wloczykij.me/api/newsletter/verify?token=PODGLAD");
save("newsletter-potwierdzenie", nl.subject, nl.html, nl.text);

const dc = dropConfirmationMail("https://wloczykij.me/api/newsletter/verify?token=PODGLAD", { airports: ["WRO", "KTW"], maxPrice: 400 });
save("zrzut-potwierdzenie", dc.subject, dc.html, dc.text);

const dm = dropManageLinkMail("https://wloczykij.me/zrzut/ustawienia?token=PODGLAD");
save("zrzut-ustawienia", dm.subject, dm.html, dm.text);

const pt = renderPreTripEmail({ city: "Porto", country: "Portugalia", planUrl: "https://wloczykij.me/plan/PODGLAD" });
save("przypomnienie-przed-wyjazdem", pt.subject, pt.html, pt.text);
