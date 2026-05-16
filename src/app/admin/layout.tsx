import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "kacper@wloczykij.me";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", color: "#E5E5E5", fontFamily: "monospace" }}>
      <div style={{ borderBottom: "1px solid #222", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#FF6B35", fontWeight: 700, fontSize: 13 }}>WŁÓCZYKIJ</span>
        <span style={{ color: "#444" }}>·</span>
        <span style={{ color: "#888", fontSize: 12 }}>Admin Panel</span>
      </div>
      {children}
    </div>
  );
}
