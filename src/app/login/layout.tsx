import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaloguj się",
  description: "Zaloguj się bez hasła — link na e-mail albo Google. 2 plany podróży za darmo co miesiąc.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
