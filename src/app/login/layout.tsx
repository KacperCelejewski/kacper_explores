import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaloguj się",
  description: "Zaloguj się bez hasła — magic link na email lub Google. 1 plan podróży za darmo po rejestracji.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
