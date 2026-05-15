import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiz podróżny",
  robots: { index: false, follow: false },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
