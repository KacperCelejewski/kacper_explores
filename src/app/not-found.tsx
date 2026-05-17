import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 px-5 pb-8 justify-center items-center text-center">
      <span className="text-6xl">🗺️</span>
      <h1 className="text-2xl font-bold mt-4">Nie znaleziono strony</h1>
      <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
        Wygląda na to, że ta trasa nie istnieje.
      </p>
      <Link
        href="/"
        className="btn-primary"
        style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "2rem" }}
      >
        Wróć do strony głównej →
      </Link>
    </div>
  );
}
