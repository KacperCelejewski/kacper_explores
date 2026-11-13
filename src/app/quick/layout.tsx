import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wiem dokąd jadę: plan w 4 krokach",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
