"use client";

export default function OfflinePage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 text-center gap-6">
      <span className="text-6xl">✈️</span>
      <div>
        <h1 className="text-2xl font-bold mb-2">Brak połączenia</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Nie można załadować strony bez internetu.<br />
          Sprawdź połączenie i spróbuj ponownie.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary"
        style={{ maxWidth: 240 }}
      >
        Odśwież →
      </button>
    </div>
  );
}
