"use client";

import { IconPlane } from "@/app/components/Icons";
import { EDGE_COPY } from "@/lib/edgeCopy";

export default function OfflinePage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 text-center gap-6">
      <span aria-hidden="true" style={{ color: "var(--accent)" }}><IconPlane size={64} /></span>
      <div>
        <h1 className="text-2xl font-bold mb-2">{EDGE_COPY.offline.title}</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {EDGE_COPY.offline.body}
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary"
        style={{ maxWidth: 240 }}
      >
        {EDGE_COPY.offline.retry}
      </button>
    </div>
  );
}
