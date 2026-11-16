import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";
import { PRICES } from "@/lib/prices";

export const metadata: Metadata = {
  title: "Regulamin",
  description:
    "Regulamin serwisu Włóczykij — warunki korzystania, zasady płatności, prawo do odstąpienia od umowy i reklamacje.",
  alternates: { canonical: "https://wloczykij.me/regulamin" },
  robots: { index: true, follow: true },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold mt-8 mb-3 leading-snug" style={{ color: "var(--text-primary)" }}>
      {title}
    </h2>
    {children}
  </section>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }}>
    {children}
  </p>
);

const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-primary)" }}>
    {children}
  </li>
);

export default function ReguaminPage() {
  return (
    <>
      <SiteNav />
      <div className="px-5 py-8 max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/"
          className="text-sm mb-6 inline-block"
          style={{ color: "var(--text-muted)", textDecoration: "none" }}
        >
          ← Strona główna
        </Link>

        {/* Header */}
        <div className="mb-8 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
          <h1 className="text-3xl font-bold leading-tight mb-2">Regulamin serwisu</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ostatnia aktualizacja: 16 listopada 2026
          </p>
        </div>

        {/* §1 */}
        <Section title="§1. Postanowienia ogólne">
          <P>
            Niniejszy Regulamin określa zasady korzystania z serwisu internetowego <strong>Włóczykij</strong>,
            dostępnego pod adresem <strong>wloczykij.me</strong>, prowadzonego przez Włóczykij
            (zwanego dalej „Operatorem”), dostępnego pod adresem e-mail:{" "}
            <a href="mailto:hej@wloczykij.me" style={{ color: "var(--accent)" }}>hej@wloczykij.me</a>.
          </P>
          <P>
            Serwis oferuje narzędzie do planowania budżetowych wyjazdów (solo, we dwoje i ekipą) przy
            wykorzystaniu sztucznej inteligencji (zwane dalej „Usługą”). Korzystanie z Serwisu oznacza
            akceptację niniejszego Regulaminu.
          </P>
          <P>
            Regulamin dostępny jest w każdym czasie pod adresem{" "}
            <Link href="/regulamin" style={{ color: "var(--accent)" }}>wloczykij.me/regulamin</Link>.
          </P>
        </Section>

        {/* §2 */}
        <Section title="§2. Rodzaje i zakres świadczonych usług">
          <P>Operator świadczy następujące usługi drogą elektroniczną:</P>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <Li>
              <strong>Konto darmowe</strong> — 2 plany podróży AI w każdym miesiącu kalendarzowym, bez opłat.
              Niewykorzystane plany darmowe nie przechodzą na kolejny miesiąc. Plany z Packa i przyznane wcześniej
              na koncie nie wygasają i są wykorzystywane po planach darmowych.
            </Li>
            <Li>
              <strong>Pack (5 planów)</strong> — jednorazowy zakup 5 planów podróży AI za{" "}
              <strong>{PRICES.pack.label}</strong>. Plany nie wygasają.
            </Li>
            <Li>
              <strong>Subskrypcja Pro</strong> — miesięczna subskrypcja za <strong>{PRICES.proMonthly.label}/miesiąc</strong>{" "}
              lub roczna za <strong>{PRICES.proYearly.label}/rok</strong>, dająca dostęp do nielimitowanych planów podróży AI oraz dodatkowych funkcji.
              Zapytania do AI w już gotowym planie (zamiana aktywności, nowy dzień, czat i podobne) mają
              dzienny limit na konto: obecnie 30 na koncie darmowym i 200 w Pro.
            </Li>
            <Li>
              <strong>Plan za opinię</strong> — po wygenerowaniu planu możesz go ocenić. Za pełną opinię
              dostajesz jeden dodatkowy plan (raz na wyjazd) albo PDF planu.
            </Li>
          </ul>
          <P>
            Wygenerowane plany podróży tworzone są przez model sztucznej inteligencji i mają charakter
            informacyjny. Operator nie gwarantuje ich aktualności, dokładności ani dostępności
            prezentowanych lotów i cen.
          </P>
        </Section>

        {/* §3 */}
        <Section title="§3. Warunki zawarcia umowy i rejestracja">
          <P>
            Generowanie planów i płatności wymagają założenia konta. Rejestracja odbywa się przez
            Google OAuth lub magic link wysyłany na adres e-mail podany przez Użytkownika. Quiz,
            przeglądanie kierunków, okazje na weekend i blog działają bez konta.
          </P>
          <P>
            Umowa o świadczenie usług drogą elektroniczną zostaje zawarta z chwilą skutecznego
            zarejestrowania się w Serwisie (konto darmowe) lub z chwilą dokonania płatności (Pack, Pro).
            Konto możesz usunąć w dowolnej chwili w profilu; usunięcie kasuje też zapisane plany.
          </P>
          <P>
            Użytkownik zobowiązany jest do podania prawdziwych danych i korzystania z Serwisu zgodnie
            z prawem i niniejszym Regulaminem.
          </P>
        </Section>

        {/* §4 */}
        <Section title="§4. Płatności">
          <P>
            Płatności realizowane są za pośrednictwem serwisu <strong>Stripe</strong>. Operator nie
            przechowuje danych kart płatniczych — są one przetwarzane wyłącznie przez Stripe zgodnie
            z jego regulaminem i standardem PCI DSS.
          </P>
          <P>
            Cena, którą widzisz przed płatnością, jest ceną końcową w złotych polskich (PLN). Nie
            doliczamy do niej innych opłat. Kod rabatowy (np. z newslettera) obniża cenę w oknie
            płatności Stripe.
          </P>
          <P>
            Pack jest płatnością jednorazową. Plany trafiają na konto po potwierdzeniu płatności przez
            Stripe, zwykle w kilka sekund; gdy płatność jeszcze się księguje, strona po zakupie to
            pokazuje. Pro włącza się tak samo.
          </P>
          <P>
            Subskrypcja Pro odnawia się automatycznie: co miesiąc przy planie miesięcznym i co rok
            przy planie rocznym. Możesz ją anulować w dowolnym momencie w profilu (portal płatności
            Stripe); dostęp do Pro trwa do końca opłaconego okresu.
          </P>
          <P>
            Operator zastrzega sobie prawo do zmiany cen Usług. Zmiana nie dotyczy już opłaconego
            okresu. O zmianach Użytkownicy z aktywną subskrypcją zostaną powiadomieni z co najmniej
            14-dniowym wyprzedzeniem drogą e-mail.
          </P>
        </Section>

        {/* §5 */}
        <Section title="§5. Prawo do odstąpienia od umowy">
          <P>
            Konsument może odstąpić od umowy zakupu <strong>Packa</strong> albo <strong>Pro</strong> w ciągu
            14 dni od jej zawarcia, bez podawania przyczyny. Wystarczy oświadczenie wysłane na adres{" "}
            <a href="mailto:hej@wloczykij.me" style={{ color: "var(--accent)" }}>hej@wloczykij.me</a>.
            Zwracamy płatność tą samą metodą, w której została dokonana, w ciągu 14 dni od odstąpienia.
          </P>
          <P>
            Plan podróży to treść cyfrowa generowana na Twoje żądanie. Gdy wygenerujesz plan z
            kupionego Packa albo na Pro, zaczynamy wykonywać umowę i od tej chwili prawo do odstąpienia
            od niej wygasa (art. 38 pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta). Przed
            zakupem informujemy o tym na stronie cennika i w oknie płatności. Plany darmowe (2 w
            miesiącu) nie wpływają na prawo do odstąpienia.
          </P>
        </Section>

        {/* §6 */}
        <Section title="§6. Reklamacje">
          <P>
            Reklamacje dotyczące Usług należy zgłaszać drogą e-mail na adres{" "}
            <a href="mailto:hej@wloczykij.me" style={{ color: "var(--accent)" }}>hej@wloczykij.me</a>{" "}
            z opisem problemu.
          </P>
          <P>
            Operator rozpatruje reklamacje w terminie <strong>14 dni</strong> od daty otrzymania
            zgłoszenia i informuje Użytkownika o wyniku drogą e-mail.
          </P>
          <P>
            Konsument może też skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia
            roszczeń, np. z pomocy powiatowego (miejskiego) rzecznika konsumentów albo wojewódzkiego
            inspektoratu Inspekcji Handlowej. Informacje znajdziesz na{" "}
            <a
              href="https://uokik.gov.pl"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              uokik.gov.pl
            </a>
            . Unijna platforma ODR została zamknięta w lipcu 2025 r., więc już do niej nie odsyłamy.
          </P>
        </Section>

        {/* §7 */}
        <Section title="§7. Linki afiliacyjne">
          <P>
            Serwis korzysta z linków partnerskich sieci Travelpayouts do Aviasales (loty), Tiqets
            (bilety na atrakcje) i Radical Storage (przechowalnie bagażu). Po wyrażeniu zgody
            w bannerze cookies kliknięcie takiego linku na stronie i zakup u partnera może przynieść
            Operatorowi prowizję. Bez zgody lub konfiguracji partnera link na stronie prowadzi
            bezpośrednio do usługodawcy, bez identyfikatora partnera. Linki do Booking.com i
            Hostelworld nie są linkami z prowizją. Ceny i dostępność sprawdzisz na stronie usługodawcy.
          </P>
          <P>
            Wyjątek: linki do lotów w e-mailach z Czwartkowego zrzutu zawierają identyfikator partnera
            zawsze. Zapis na zrzut to osobna, dobrowolna zgoda na ten e-mail, więc nie pytamy tam o
            baner. Każdy taki e-mail ma dopisek o linkach partnerskich.
          </P>
          <P>
            Linki partnerskie na stronie są oznaczone dopiskiem „link partnerski”, a w kodzie strony
            atrybutem <code>{'rel="sponsored noopener noreferrer"'}</code>. Prowizję płaci partner,
            cena dla Ciebie nie rośnie. Prowizja nie oznacza gwarancji najniższej ceny ani dostępności.
            Pliki cookie partnerów po przejściu na ich strony podlegają ich politykom i mechanizmom zgody.
          </P>
        </Section>

        {/* §8 */}
        <Section title="§8. Własność intelektualna">
          <P>
            Wszelkie treści dostępne w Serwisie (logotypy, interfejs, teksty, kod) stanowią własność
            Operatora lub podmiotów, które udzieliły licencji, i podlegają ochronie na podstawie
            przepisów o prawie autorskim.
          </P>
          <P>
            Wygenerowane plany podróży tworzone są przez model AI na zlecenie Użytkownika — Użytkownik
            może je wykorzystywać na własny użytek i pokazywać znajomym (np. linkiem do podglądu).
            Komercyjne rozpowszechnianie planów bez zgody Operatora jest zabronione.
          </P>
        </Section>

        {/* §9 */}
        <Section title="§9. Odpowiedzialność">
          <P>
            Operator nie ponosi odpowiedzialności za:
          </P>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <Li>dokładność, aktualność i kompletność planów podróży wygenerowanych przez AI,</Li>
            <Li>dostępność i ceny lotów prezentowane w Serwisie — mają one charakter szacunkowy,</Li>
            <Li>treści zewnętrznych serwisów, do których prowadzą linki zamieszczone w Serwisie,</Li>
            <Li>przerwy w działaniu Serwisu wynikające z czynników niezależnych od Operatora.</Li>
          </ul>
          <P>
            Użytkownik zobowiązany jest do weryfikacji informacji dotyczących lotów, noclegów i cen
            przed dokonaniem rezerwacji. Powyższe wyłączenia obowiązują w zakresie dozwolonym przez
            prawo i nie ograniczają uprawnień konsumenta, których nie można wyłączyć umową.
          </P>
        </Section>

        {/* §10 */}
        <Section title="§10. Ochrona danych osobowych">
          <P>
            Zasady przetwarzania danych osobowych Użytkowników opisane są w{" "}
            <Link href="/privacy" style={{ color: "var(--accent)" }}>
              Polityce Prywatności
            </Link>
            , stanowiącej integralną część niniejszego Regulaminu.
          </P>
        </Section>

        {/* §11 */}
        <Section title="§11. Zmiany Regulaminu">
          <P>
            Operator zastrzega sobie prawo do zmiany Regulaminu. O istotnych zmianach Użytkownicy
            posiadający konto w Serwisie zostaną powiadomieni drogą e-mail z co najmniej
            <strong> 14-dniowym</strong> wyprzedzeniem. Dalsze korzystanie z Serwisu po wejściu
            w życie zmian oznacza ich akceptację. Zmiany nie naruszają praw nabytych przed ich
            wejściem w życie ani praw przysługujących konsumentom z mocy prawa.
          </P>
        </Section>

        {/* §12 */}
        <Section title="§12. Postanowienia końcowe">
          <P>
            Regulamin obowiązuje od 17 maja 2026 r. w brzmieniu zmienionym 16 listopada 2026 r.
          </P>
          <P>
            W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego,
            w szczególności Kodeksu cywilnego, Ustawy o świadczeniu usług drogą elektroniczną oraz
            Ustawy o prawach konsumenta.
          </P>
          <P>
            Wszelkie spory wynikające z korzystania z Serwisu będą rozstrzygane przez właściwy sąd
            powszechny. Konsumenci mogą skorzystać z pozasądowych metod rozwiązywania sporów.
          </P>
          <P>
            Kontakt z Operatorem:{" "}
            <a href="mailto:hej@wloczykij.me" style={{ color: "var(--accent)" }}>hej@wloczykij.me</a>
          </P>
        </Section>
      </div>
      <SiteFooter />
    </>
  );
}
