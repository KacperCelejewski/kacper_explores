"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { GA_ID, trackEvent } from "@/lib/analytics";
import { affiliateClickParams } from "@/lib/affiliate";

const SCROLL_STEPS = [25, 50, 75, 90];

function clean(text: string | null | undefined, max = 80) {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export default function Analytics() {
  const pathname = usePathname();

  // Strony w App Routerze zmieniają się bez przeładowania, więc page_view wysyłamy ręcznie.
  useEffect(() => {
    trackEvent("page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  // Każde kliknięcie w link albo przycisk: co to było i gdzie.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("a, button, [role='button'], [data-track]");
      if (!el) return;
      const link = el instanceof HTMLAnchorElement ? el : null;
      const label =
        el.dataset.track ||
        clean(el.getAttribute("aria-label")) ||
        clean(el.textContent) ||
        clean(link?.getAttribute("title"));
      const href = link?.href;
      const outbound = !!href && link!.origin !== window.location.origin && /^https?:/.test(href);
      trackEvent("ui_click", {
        click_label: label || "(bez tekstu)",
        click_element: el.tagName.toLowerCase(),
        click_url: href,
        click_outbound: outbound,
        click_section: clean(el.closest<HTMLElement>("[data-track-section], section[id], nav, footer, header")?.dataset.trackSection
          ?? el.closest("section[id]")?.id ?? el.closest("nav, footer, header")?.tagName.toLowerCase(), 40) || undefined,
        page_path: window.location.pathname,
      });
      const aff = link ? affiliateClickParams(link.dataset) : null;
      if (aff) trackEvent("affiliate_click", { ...aff, page_path: window.location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Jak głęboko ktoś przewija daną stronę.
  useEffect(() => {
    const sent = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      for (const step of SCROLL_STEPS) {
        if (pct >= step && !sent.has(step)) {
          sent.add(step);
          trackEvent("scroll_depth", { percent: step, page_path: window.location.pathname });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;
var c=null;try{c=localStorage.getItem('cookie_consent')}catch(e){}
gtag('consent','default',{analytics_storage:c==='accepted'?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
      </Script>
    </>
  );
}
