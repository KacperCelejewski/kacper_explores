import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wybierz destynację",
  robots: { index: false, follow: false },
};

export default function DestinationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
