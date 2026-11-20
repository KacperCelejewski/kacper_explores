import type { ReactElement } from "react";
import { PER_PERSON, TOGETHER, type CostComponent, type CostKey, type PlanCostModel } from "@/lib/costModel";
import { IconPlane, IconBed, IconFork, IconTicket, IconBus } from "./Icons";

const ICONS: Record<CostKey, (p: { size?: number }) => ReactElement> = {
  flight: IconPlane,
  accommodation: IconBed,
  food: IconFork,
  attractions: IconTicket,
  localTransport: IconBus,
  access: IconBus,
};

const muted = { color: "var(--text-muted)" } as const;

function Row({ item }: { item: CostComponent }) {
  const Icon = ICONS[item.key];
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden="true" className="mt-0.5" style={{ color: "var(--accent)" }}><Icon size={18} /></span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm">{item.label}</span>
          <span className="text-sm font-semibold text-right">{item.display}</span>
        </div>
        <p className="text-xs" style={muted}>
          {item.statusLabel} · {item.inOnSiteTotal ? "wliczone w sumę na miejscu" : "poza sumą na miejscu"}
        </p>
      </div>
    </li>
  );
}

/**
 * Rozbicie kosztu planu z jawnym podziałem: co jest w sumie na miejscu, co poza nią, co jest ceną
 * z datą, a co szacunkiem. Wspólne dla strony planu i publicznego podglądu.
 */
export default function CostBreakdown({ model, note }: { model: PlanCostModel; note: string }) {
  const { onSite, withFlight } = model;
  return (
    <div>
      <ul className="flex flex-col gap-3" aria-label="Z czego składa się koszt">
        {model.components.map((item) => <Row key={item.key} item={item} />)}
      </ul>

      <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold">{onSite.label}</span>
          {onSite.perPerson ? (
            <div className="text-right">
              <div className="text-base font-bold" style={{ color: "var(--accent)" }}>
                {onSite.perPerson}
                {onSite.groupTotal && <span className="text-xs font-normal ml-1" style={muted}>{PER_PERSON}</span>}
              </div>
              {onSite.groupTotal && (
                <div className="text-sm mt-0.5" style={muted}>
                  {onSite.groupTotal} {TOGETHER}
                  <span className="text-xs ml-1">(szacunek)</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm" style={muted}>brak szacunku</span>
          )}
        </div>

        {withFlight?.perPerson ? (
          <div className="mt-3 flex items-start justify-between gap-3">
            <span className="text-sm font-semibold">{withFlight.label}</span>
            <div className="text-right">
              <div className="text-base font-bold" style={{ color: "var(--accent)" }}>
                {withFlight.perPerson}
                {withFlight.groupTotal && <span className="text-xs font-normal ml-1" style={muted}>{PER_PERSON}</span>}
              </div>
              {withFlight.groupTotal && (
                <div className="text-sm mt-0.5" style={muted}>{withFlight.groupTotal} {TOGETHER}</div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm mt-2" style={muted}>{model.flightLine}</p>
        )}
        {withFlight && <p className="text-xs mt-1" style={muted}>{withFlight.note}</p>}
      </div>

      {/* Notatka o braku lotu w sumie ma sens tylko wtedy, gdy "Razem z lotem" nie jest pokazane */}
      {!withFlight && <p className="text-xs mt-2" style={muted}>{model.legacy ? onSite.note : note}</p>}
      <p className="text-xs mt-1" style={muted}>{model.assumptions}</p>
    </div>
  );
}
