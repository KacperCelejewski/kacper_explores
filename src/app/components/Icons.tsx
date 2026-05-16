type IconProps = { size?: number; className?: string };

export const IconHome = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5V21H3z"/>
    <path d="M9 21V13h6v8"/>
  </svg>
);

export const IconCompass = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
  </svg>
);

export const IconPerson = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="4"/>
    <path d="M5 20v-1a7 7 0 0 1 14 0v1"/>
  </svg>
);

export const IconTag = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 2H7a2 2 0 0 0-2 2v5.586a1 1 0 0 0 .293.707l8.828 8.828a2 2 0 0 0 2.829 0l3.171-3.171a2 2 0 0 0 0-2.829L13.414 4.293A1 1 0 0 0 12.707 4H7"/>
    <circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

export const IconBook = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="8" y1="7" x2="16" y2="7"/>
    <line x1="8" y1="11" x2="13" y2="11"/>
  </svg>
);

export const IconPlane = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 21 4s-2 0-3.5 1.5L14 9 5.8 7.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 3.2c.4.4.9.4 1.3.3l.5-.2c.4-.3.6-.7.5-1.1z"/>
  </svg>
);

export const IconClock = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

export const IconCoin = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v1.5m0 9V18m-2.5-5.5c0-1.1.9-2 2.5-2s2.5.9 2.5 2-1.1 1.5-2.5 2c-1.4.5-2.5 1-2.5 2.1s.9 1.9 2.5 1.9 2.5-.9 2.5-1.9"/>
  </svg>
);

export const IconBackpack = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M9 4h6a6 6 0 0 1 6 6v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a6 6 0 0 1 6-6z"/>
    <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
    <line x1="7" y1="14" x2="17" y2="14"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
  </svg>
);

export const IconSuitcase = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
);

export const IconSun = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

export const IconLightning = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

export const IconPeople = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export const IconMountain = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m8 3-5 19h18L13 3z"/>
    <path d="m8 3 4 8 4-8"/>
  </svg>
);

export const IconArch = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <line x1="2" y1="22" x2="22" y2="22"/>
    <line x1="4" y1="22" x2="4" y2="13"/>
    <line x1="20" y1="22" x2="20" y2="13"/>
    <path d="M4 13a8 8 0 0 1 16 0"/>
    <line x1="12" y1="5" x2="12" y2="22"/>
  </svg>
);

export const IconBuilding = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <line x1="1" y1="22" x2="23" y2="22"/>
    <rect x="2" y="9" width="8" height="13"/>
    <rect x="14" y="2" width="8" height="20"/>
    <path d="M6 9V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
    <line x1="15" y1="6" x2="17" y2="6"/>
    <line x1="15" y1="10" x2="17" y2="10"/>
    <line x1="15" y1="14" x2="17" y2="14"/>
    <line x1="15" y1="18" x2="17" y2="18"/>
  </svg>
);

export const IconFork = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <line x1="18" y1="2" x2="18" y2="22"/>
    <path d="M14 2v4a4 4 0 0 0 8 0V2"/>
    <line x1="6" y1="2" x2="6" y2="12"/>
    <path d="M6 12a4 4 0 0 0 0 8v2"/>
    <line x1="4" y1="7" x2="8" y2="7"/>
  </svg>
);

export const IconLeaf = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

export const IconWave = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M2 8c1.5 2 3 2 4.5 0S9.5 6 11 8s3 2 4.5 0 3-2 4.5 0"/>
    <path d="M2 13c1.5 2 3 2 4.5 0s3-2 4.5 0 3 2 4.5 0 3-2 4.5 0"/>
    <path d="M2 18c1.5 2 3 2 4.5 0s3-2 4.5 0 3 2 4.5 0 3-2 4.5 0"/>
  </svg>
);

export const IconMoon = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export const IconCity = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <line x1="1" y1="22" x2="23" y2="22"/>
    <path d="M2 22V14h4v8"/>
    <path d="M8 22V10h5v12"/>
    <path d="M15 22V4h6v18"/>
  </svg>
);

export const IconHouseSmall = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5V21H3z"/>
    <path d="M9 21V13h6v8"/>
  </svg>
);

export const IconSunWave = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="8" r="4"/>
    <line x1="12" y1="2" x2="12" y2="3"/>
    <line x1="6.5" y1="4.5" x2="7.2" y2="5.2"/>
    <line x1="17.5" y1="4.5" x2="16.8" y2="5.2"/>
    <line x1="3" y1="8" x2="4" y2="8"/>
    <line x1="21" y1="8" x2="20" y2="8"/>
    <path d="M2 16c1.5 2 3 2 4.5 0s3-2 4.5 0 3 2 4.5 0 3-2 4.5 0"/>
    <path d="M2 20c1.5 2 3 2 4.5 0s3-2 4.5 0 3 2 4.5 0 3-2 4.5 0"/>
  </svg>
);

export const IconPin = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);

export const IconCar = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M5 17H3a2 2 0 0 1-2-2V9.5L4.5 6h15L23 9.5V15a2 2 0 0 1-2 2h-2"/>
    <circle cx="7.5" cy="17.5" r="2.5"/>
    <circle cx="16.5" cy="17.5" r="2.5"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

export const IconGlobe = ({ size = 20, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
