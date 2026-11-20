import { describe, it, expect } from "vitest";
import { dropConfirmationMail, dropManageLinkMail, newsletterConfirmationMail } from "./email";
import { preTripWhen, renderPreTripEmail } from "./preTripEmail";
import { mailShell, stripTags } from "./emailLayout";
import { FORBIDDEN_COPY } from "./homeCopy";

const VERIFY = "https://wloczykij.me/api/newsletter/verify?token=abc";

const mails = {
  newsletter: newsletterConfirmationMail(VERIFY),
  dropConfirm: dropConfirmationMail(VERIFY, { airports: ["WRO", "KRK"], maxPrice: 400 }),
  dropManage: dropManageLinkMail("https://wloczykij.me/zrzut/ustawienia?token=abc"),
  preTrip: renderPreTripEmail({ city: "Porto", country: "Portugalia", planUrl: "https://wloczykij.me/plan/1" }),
};

describe.each(Object.entries(mails))("mail %s", (_name, mail) => {
  it("ma temat, HTML i wersję tekstową", () => {
    expect(mail.subject.length).toBeGreaterThan(5);
    expect(mail.subject.length).toBeLessThanOrEqual(70);
    expect(mail.html).toContain('lang="pl"');
    expect(mail.text.length).toBeGreaterThan(50);
    expect(mail.text).not.toMatch(/<\/?[a-z]/i);
  });

  it("trzyma głos marki: bez wykrzykników, emoji, form w pierwszej osobie i korpomowy", () => {
    for (const re of FORBIDDEN_COPY) {
      expect(mail.subject, String(re)).not.toMatch(re);
      expect(mail.text, String(re)).not.toMatch(re);
      // w HTML-u sprawdzamy tylko widoczny tekst, bez atrybutów i stylów
      expect(stripTags(mail.html.replace(/<style[\s\S]*?<\/style>/g, "")), String(re)).not.toMatch(re);
    }
  });

  it("ma preheader, tryb ciemny, dane nadawcy i dokładnie jedno główne CTA", () => {
    expect(mail.html).toContain('name="color-scheme"');
    expect(mail.html).toContain("prefers-color-scheme:dark");
    expect(mail.html).toContain("display:none;max-height:0");
    expect(mail.html).toContain("hej@wloczykij.me");
    expect(mail.text).toContain("hej@wloczykij.me");
    expect(mail.html.match(/class="m-btn"/g)).toHaveLength(1);
  });

  it("nie obiecuje funkcji grupowych, których nie ma", () => {
    const all = `${mail.subject} ${mail.text}`.toLowerCase();
    for (const word of ["zaproś", "głosowan", "rozlicz", "wspólne loty"]) expect(all).not.toContain(word);
  });
});

describe("potwierdzenia", () => {
  it("niosą link i informację o 48 godzinach w HTML i tekście", () => {
    for (const m of [mails.newsletter, mails.dropConfirm]) {
      expect(m.html).toContain(`href="${VERIFY}"`);
      expect(m.text).toContain(VERIFY);
      expect(m.text).toContain("48 godzin");
    }
  });

  it("zrzut mówi, skąd i do ilu zł", () => {
    expect(mails.dropConfirm.text).toContain("z Wrocławia i Krakowa (lot w obie strony do 400 zł)");
  });
});

describe("przypomnienie przed wyjazdem", () => {
  it("escapuje miasto i kraj z bazy", () => {
    const m = renderPreTripEmail({ city: "<img src=x>", country: `"Kraj" & Co`, planUrl: "https://wloczykij.me/plan/1" });
    expect(m.html).not.toContain("<img src=x>");
    expect(m.html).toContain("&lt;img src=x&gt;");
    expect(m.html).toContain("&quot;Kraj&quot; &amp; Co");
  });

  it("nie używa samolotu ani emoji w temacie", () => {
    expect(mails.preTrip.subject).toBe("Za 3 dni lecisz do Porto. Plan czeka");
  });

  it("mówi, jak wyłączyć przypomnienia", () => {
    expect(mails.preTrip.text).toContain("Odpisz na tę wiadomość");
  });
});

describe("mailShell", () => {
  it("escapuje tytuł i preheader", () => {
    const html = mailShell({
      title: "<script>x</script>",
      preheader: "a & b",
      heading: "H",
      content: "<p>c</p>",
      footer: { reason: "r" },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("a &amp; b");
  });
});

describe("mail przed wylotem: termin", () => {
  it("pokazuje daty planu, gdy są zapisane", () => {
    const m = renderPreTripEmail({ city: "Porto", country: "Portugalia", planUrl: "https://wloczykij.me/plan/1", when: "12–14 grudnia 2026" });
    expect(m.html).toContain("12–14 grudnia 2026");
    expect(m.text).toContain("(12–14 grudnia 2026)");
  });

  it("bez terminu mail wygląda jak dotąd", () => {
    const m = renderPreTripEmail({ city: "Porto", country: "Portugalia", planUrl: "https://wloczykij.me/plan/1" });
    expect(m.text).toContain("Portugalia czeka gotowy");
  });

  it("termin z planu ma pierwszeństwo przed ofertą lotu", () => {
    expect(preTripWhen({ planStart: "2026-12-12", planDays: "3", offerDeparture: "2026-12-05", offerReturn: "2026-12-07" })).toBe("12–14 grudnia 2026");
  });

  it("bez daty planu bierze daty oferty lotu", () => {
    expect(preTripWhen({ offerDeparture: "2026-12-30", offerReturn: "2027-01-02" })).toBe("30 grudnia 2026 – 2 stycznia 2027");
  });

  it("bez żadnej daty zwraca null", () => {
    expect(preTripWhen({})).toBeNull();
  });
});
