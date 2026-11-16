import type { CSSProperties } from "react";

// Pojedynczy blok szkieletu; zdobi (aria-hidden), a komunikat dla czytnika niesie SkeletonPage.
export function SkeletonBlock({ height = 16, width = "100%", radius, style }: {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return <div className="skeleton" aria-hidden="true" style={{ height, width, ...(radius != null ? { borderRadius: radius } : {}), ...style }} />;
}

// Opakowanie stanu ładowania: role="status" ogłasza czytnikowi, co się dzieje, a dzieci są tylko dekoracją.
export function SkeletonPage({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col flex-1 px-5 pt-6 pb-8 gap-4">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function PlanSkeleton() {
  return (
    <SkeletonPage label="Ładujemy plan podróży…">
      <SkeletonBlock height={14} width={96} />
      <SkeletonBlock height={36} width="70%" />
      <SkeletonBlock height={14} width="40%" />
      <SkeletonBlock height={132} radius={20} style={{ marginTop: 8 }} />
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <SkeletonBlock height={40} width={72} />
        <SkeletonBlock height={40} width={72} />
        <SkeletonBlock height={40} width={72} />
      </div>
      <SkeletonBlock height={84} radius={16} />
      <SkeletonBlock height={84} radius={16} />
      <SkeletonBlock height={84} radius={16} />
    </SkeletonPage>
  );
}

export function ProfileSkeleton() {
  return (
    <SkeletonPage label="Ładujemy Twój profil…">
      <div className="flex items-center gap-4" style={{ marginTop: 24 }}>
        <SkeletonBlock height={56} width={56} radius={16} />
        <div className="flex flex-col gap-2 flex-1">
          <SkeletonBlock height={18} width="60%" />
          <SkeletonBlock height={14} width="30%" />
        </div>
      </div>
      <SkeletonBlock height={68} radius={16} />
      <SkeletonBlock height={120} radius={16} />
      <SkeletonBlock height={64} radius={16} />
      <SkeletonBlock height={64} radius={16} />
    </SkeletonPage>
  );
}

export function GallerySkeleton() {
  return (
    <SkeletonPage label="Ładujemy galerię planów…">
      <SkeletonBlock height={28} width="55%" />
      <SkeletonBlock height={44} radius={22} />
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} height={140} radius={20} />
      ))}
    </SkeletonPage>
  );
}
