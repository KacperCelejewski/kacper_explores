import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hej@wloczykij.me";

const NAV = [
  { href: "/admin", label: "API Monitor" },
  { href: "/admin/analytics", label: "Analityka" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", color: "#E5E5E5", fontFamily: "monospace" }}>
      <div style={{ borderBottom: "1px solid #222", padding: "12px 24px", display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ color: "#FF6B35", fontWeight: 700, fontSize: 13 }}>WŁÓCZYKIJ</span>
        <span style={{ color: "#333" }}>|</span>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            style={{ color: "#888", fontSize: 12, textDecoration: "none" }}
          >
            {n.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
