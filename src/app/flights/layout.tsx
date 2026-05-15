import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loty",
  robots: { index: false, follow: false },
};

export default function FlightsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
