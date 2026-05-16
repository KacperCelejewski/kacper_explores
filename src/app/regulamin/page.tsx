import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Regulamin | Włóczykij",
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
          <div className="text-3xl mb-3">📋</div>
          <h1 className="text-3xl font-bold leading-tight mb-2">Regulamin serwisu</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Ostatnia aktualizacja: 17 maja 2026
          </p>
        </div>

        {/* §1 */}
        <Section title="§1. Postanowienia ogólne">
          <P>
            Niniejszy Regulamin określa zasady korzystania z serwisu internetowego <strong>Włóczykij</strong>,
            dostępnego pod adresem <strong>wloczykij.me</strong>, prowadzonego przez Włóczykij
            (zwanego dalej „Operatorem"), dostępnego pod adresem e-mail:{" "}
            <a href="mailto:hej@wloczykij.me" style={{ color: "var(--accent)" }}>hej@wloczykij.me</a>.
          </P>
          <P>
            Serwis oferuje narzędzie do planowania budżetowych podróży solo przy wykorzystaniu sztucznej
            inteligencji (zwane dalej „Usługą"). Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu.
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
            <Li><strong>Konto darmowe</strong> — 1 plan podróży AI po rejestracji, bez opłat.</Li>
            <Li>
              <strong>Pack (5 planów)</strong> — jednorazowy zakup 5 planów podróży AI za{" "}
              <strong>5 PLN</strong>. Plany nie wygasają.
            </Li>
            <Li>
              <strong>Subskrypcja Pro</strong> — miesięczna subskrypcja za <strong>19 PLN/miesiąc</strong>{" "}
              dająca dostęp do nielimitowanych planów podróży AI oraz dodatkowych funkcji.
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
            Korzystanie z płatnych funkcji Serwisu wymaga założenia konta. Rejestracja odbywa się przez
            Google OAuth lub magic link wysyłany na adres e-mail podany przez Użytkownika.
          </P>
          <P>
            Umowa o świadczenie usług drogą elektroniczną zostaje zawarta z chwilą skutecznego
            zarejestrowania się w Serwisie (konto darmowe) lub z chwilą dokonania płatności (Pack, Pro).
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
            Ceny podane w Serwisie są cenami brutto wyrażonymi w złotych polskich (PLN) i zawierają
            wszystkie należne podatki.
          </P>
          <P>
            Subskrypcja Pro odnawiana jest automatycznie co 30 dni. Użytkownik może anulować subskrypcję
            w dowolnym momencie z poziomu swojego profilu — dostęp do funkcji Pro trwa do końca
            opłaconego okresu.
          </P>
          <P>
            Operator zastrzega sobie prawo do zmiany cen Usług. O zmianach Użytkownicy z aktywną
            subskrypcją zostaną powiadomieni z co najmniej 14-dniowym wyprzedzeniem drogą e-mail.
          </P>
        </Section>

        {/* §5 */}
        <Section title="§5. Prawo do odstąpienia od umowy">
          <P>
            Zgodnie z art. 38 pkt 13 Ustawy z dnia 30 maja 2014 r. o prawach konsumenta (Dz.U. 2014
            poz. 827 ze zm.) prawo do odstąpienia od umowy <strong>nie przysługuje</strong> w odniesieniu
            do umów o dostarczanie treści cyfrowych, które nie są zapisane na nośniku materialnym, jeżeli
            spełnianie świadczenia rozpoczęło się za wyraźną zgodą konsumenta przed upływem terminu do
            odstąpienia od umowy i po poinformowaniu go przez przedsiębiorcę o utracie prawa do
            odstąpienia od umowy.
          </P>
          <P>
            Generując plan podróży, Użytkownik wyraża wyraźną zgodę na natychmiastowe wykonanie usługi
            i przyjmuje do wiadomości, że traci prawo do odstąpienia od umowy w chwili wygenerowania planu.
          </P>
          <P>
            W przypadku <strong>subskrypcji Pro</strong> Użytkownik ma prawo do odstąpienia od umowy
            w ciągu 14 dni od jej zawarcia, o ile nie skorzystał jeszcze z płatnych funkcji Serwisu.
            Aby skorzystać z prawa do odstąpienia, należy przesłać oświadczenie na adres{" "}
            <a href="mailto:hej@wloczykij.me" style={{ color: "var(--accent)" }}>hej@wloczykij.me</a>.
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
            Konsumenci mogą skorzystać z platformy ODR (Online Dispute Resolution) dostępnej pod
            adresem{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              ec.europa.eu/consumers/odr
            </a>{" "}
            w celu pozasądowego rozwiązywania sporów.
          </P>
        </Section>

        {/* §7 */}
        <Section title="§7. Linki afiliacyjne">
          <P>
            Serwis zawiera linki partnerskie (afiliacyjne) do zewnętrznych serwisów rezerwacji lotów,
            w tym do Skyscannera, realizowane za pośrednictwem sieci Travelpayouts. Kliknięcie takiego
            linku i dokonanie zakupu może skutkować otrzymaniem przez Operatora prowizji od partnera.
            Linki afiliacyjne nie wpływają na cenę lotu dla Użytkownika.
          </P>
          <P>
            Linki partnerskie są oznaczone atrybutem <code>rel="sponsored"</code> w kodzie strony.
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
            może je wykorzystywać na własny użytek. Komercyjne rozpowszechnianie planów bez zgody
            Operatora jest zabronione.
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
            Użytkownik korzysta z Serwisu na własną odpowiedzialność i zobowiązany jest do weryfikacji
            informacji dotyczących lotów, noclegów i cen przed dokonaniem rezerwacji.
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
            w życie zmian oznacza ich akceptację.
          </P>
        </Section>

        {/* §12 */}
        <Section title="§12. Postanowienia końcowe">
          <P>
            Regulamin wchodzi w życie z dniem 17 maja 2026 r.
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
