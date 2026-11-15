import { escapeHtml } from "@/lib/escapeHtml";

// Wspólny układ maili Włóczykija: krem, ciemna czekolada i ceglasty akcent ze strony (globals.css).
// Zasady: tabele i style inline (klienci poczty), jedno główne CTA, preheader, stopka z danymi nadawcy,
// jasny i ciemny motyw (prefers-color-scheme; klienci bez obsługi zostają przy jasnym).

export const MAIL_SITE = "https://wloczykij.me";
export const MAIL_CONTACT = "hej@wloczykij.me";
export const MAIL_TAGLINE = "Obudź w sobie Włóczykija.";

export const MAIL_COLORS = {
  page: "#F5EFE0",
  card: "#FFFBF3",
  ink: "#1C1008",
  body: "#3D2B1F",
  muted: "#6B523D",
  line: "#E2D6BC",
  accent: "#A04B20",
  accentSoft: "#F0DFD0",
} as const;

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const esc = escapeHtml;

export interface MailLink {
  label: string;
  url: string;
}

export interface MailShellInput {
  /** Tytuł dokumentu (karta poczty, czytnik ekranu). */
  title: string;
  /** Tekst zapowiedzi widoczny na liście wiadomości, ukryty w treści. */
  preheader: string;
  /** Mała etykieta nad nagłówkiem, np. "Czwartkowy zrzut". */
  kicker?: string;
  /** Nagłówek h1, już bezpieczny HTML (dane z zewnątrz przepuść przez esc). */
  heading: string;
  /** Treść, już bezpieczny HTML. */
  content: string;
  footer: MailFooterInput;
}

export interface MailFooterInput {
  /** Dlaczego ta wiadomość przyszła. Bezpieczny HTML. */
  reason: string;
  links?: MailLink[];
}

const DARK_CSS = `
:root{color-scheme:light dark;supported-color-schemes:light dark;}
@media (prefers-color-scheme:dark){
  .m-page{background:#17110B !important;}
  .m-card{background:#241A12 !important;border-color:#3A2B1E !important;}
  .m-ink{color:#F5EFE0 !important;}
  .m-body{color:#E6DAC4 !important;}
  .m-muted{color:#BBA98F !important;}
  .m-line{border-color:#3A2B1E !important;}
  .m-accent{color:#E8895A !important;}
  .m-soft{background:#2F2217 !important;}
  .m-btn{background:#E8895A !important;}
  .m-btn a{color:#1C1008 !important;}
  .m-ghost a{color:#E8895A !important;border-color:#E8895A !important;}
}
@media (max-width:520px){
  .m-pad{padding-left:20px !important;padding-right:20px !important;}
}`;

/** Główny przycisk. Tabela z tłem w komórce, żeby kolor trzymał też w Outlooku. */
export function mailButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="m-btn" bgcolor="${MAIL_COLORS.accent}" style="background:${MAIL_COLORS.accent};border-radius:12px;">
      <a href="${esc(url)}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;font-family:${SANS};font-size:16px;font-weight:700;line-height:20px;text-decoration:none;border-radius:12px;">${esc(label)}</a>
    </td>
  </tr></table>`;
}

/** Przycisk drugorzędny (obrys). */
export function mailGhostButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="m-ghost" style="border-radius:12px;">
      <a href="${esc(url)}" style="display:inline-block;padding:11px 20px;color:${MAIL_COLORS.accent};font-family:${SANS};font-size:14px;font-weight:700;line-height:20px;text-decoration:none;border:1px solid ${MAIL_COLORS.accent};border-radius:12px;">${esc(label)}</a>
    </td>
  </tr></table>`;
}

export function mailParagraph(html: string, opts: { muted?: boolean; size?: number } = {}): string {
  const size = opts.size ?? 16;
  const cls = opts.muted ? "m-muted" : "m-body";
  const color = opts.muted ? MAIL_COLORS.muted : MAIL_COLORS.body;
  return `<p class="${cls}" style="margin:0 0 16px;color:${color};font-family:${SANS};font-size:${size}px;line-height:1.6;">${html}</p>`;
}

function footerHtml(footer: MailFooterInput): string {
  const links = (footer.links ?? [])
    .map((l) => `<a href="${esc(l.url)}" class="m-accent" style="color:${MAIL_COLORS.accent};text-decoration:underline;">${esc(l.label)}</a>`)
    .join(" &middot; ");
  return `<tr>
    <td class="m-pad m-line" style="padding:20px 32px 28px;border-top:1px solid ${MAIL_COLORS.line};">
      <p class="m-muted" style="margin:0 0 8px;color:${MAIL_COLORS.muted};font-family:${SANS};font-size:13px;line-height:1.5;">${footer.reason}</p>
      ${links ? `<p class="m-muted" style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:1.5;">${links}</p>` : ""}
      <p class="m-muted" style="margin:0;color:${MAIL_COLORS.muted};font-family:${SANS};font-size:12px;line-height:1.5;">Włóczykij &middot; <a href="${MAIL_SITE}" class="m-accent" style="color:${MAIL_COLORS.accent};text-decoration:underline;">wloczykij.me</a> &middot; <a href="mailto:${MAIL_CONTACT}" class="m-accent" style="color:${MAIL_COLORS.accent};text-decoration:underline;">${MAIL_CONTACT}</a></p>
    </td>
  </tr>`;
}

/** Cały dokument HTML maila. */
export function mailShell(input: MailShellInput): string {
  const kicker = input.kicker
    ? `<p class="m-accent" style="margin:0 0 8px;color:${MAIL_COLORS.accent};font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;line-height:16px;text-transform:uppercase;">${esc(input.kicker)}</p>`
    : "";
  // Preheader: ukryty, dopełniony niewidocznymi znakami, żeby klient nie dokleił początku treści.
  const pad = "&#8199;&#847; ".repeat(40);
  return `<!DOCTYPE html>
<html lang="pl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(input.title)}</title>
<style>${DARK_CSS}</style>
</head>
<body class="m-page" style="margin:0;padding:0;background:${MAIL_COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${MAIL_COLORS.page};opacity:0;">${esc(input.preheader)}${pad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-page" bgcolor="${MAIL_COLORS.page}" style="background:${MAIL_COLORS.page};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-card" bgcolor="${MAIL_COLORS.card}" style="max-width:560px;background:${MAIL_COLORS.card};border:1px solid ${MAIL_COLORS.line};border-radius:16px;">
      <tr>
        <td class="m-pad" style="padding:28px 32px 4px;">
          <p class="m-ink" style="margin:0;color:${MAIL_COLORS.ink};font-family:${SERIF};font-size:24px;font-weight:700;line-height:28px;">Włóczykij</p>
          <p class="m-muted" style="margin:2px 0 0;color:${MAIL_COLORS.muted};font-family:${SERIF};font-size:13px;font-style:italic;line-height:18px;">${esc(MAIL_TAGLINE)}</p>
        </td>
      </tr>
      <tr>
        <td class="m-pad" style="padding:24px 32px 8px;">
          ${kicker}
          <h1 class="m-ink" style="margin:0;color:${MAIL_COLORS.ink};font-family:${SERIF};font-size:26px;font-weight:700;line-height:1.25;">${input.heading}</h1>
        </td>
      </tr>
      <tr>
        <td class="m-pad" style="padding:16px 32px 24px;">
          ${input.content}
        </td>
      </tr>
      ${footerHtml(input.footer)}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Stopka w wersji tekstowej. */
export function mailTextFooter(reason: string, links: MailLink[] = []): string {
  const lines = ["--", reason];
  for (const l of links) lines.push(`${l.label}: ${l.url}`);
  lines.push(`Włóczykij · ${MAIL_SITE} · ${MAIL_CONTACT}`);
  return lines.join("\n");
}

/** Usuwa znaczniki z krótkiego, zaufanego fragmentu HTML (dla pól tekstowych z szablonu). */
export function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
