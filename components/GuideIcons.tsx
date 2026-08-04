// 가이드 전용 아이콘 — 텍스트 글리프 대신 SVG를 쓴다(FE #148 교훈: 글리프는 폰트에 따라
// 광학 중심이 어긋나 원 안에서 치우친다). 모두 24 뷰박스·stroke 기반으로 통일.

const P = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;

export const UserCheckIcon = () => (
  <svg {...P}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </svg>
);

export const CardIcon = () => (
  <svg {...P}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18M7 15h4" />
  </svg>
);

export const BellIcon = () => (
  <svg {...P}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const CameraIcon = () => (
  <svg {...P}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

export const GavelIcon = () => (
  <svg {...P}>
    <path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10" />
    <path d="m16 16 6-6M8 8l6-6M9 7l8 8M5 11l8 8" />
  </svg>
);

export const BoxIcon = () => (
  <svg {...P}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </svg>
);

export const WalletIcon = () => (
  <svg {...P}>
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    <path d="M21 11v4h-6a2 2 0 0 1 0-4h6Z" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...P}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export const ShieldIcon = () => (
  <svg {...P}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const TruckIcon = () => (
  <svg {...P}>
    <path d="M10 17h4V5H2v12h3" />
    <path d="M14 8h4l4 4v5h-3" />
    <circle cx="7.5" cy="17.5" r="2" />
    <circle cx="17.5" cy="17.5" r="2" />
  </svg>
);

export const CheckCircleIcon = () => (
  <svg {...P}>
    <circle cx="12" cy="12" r="10" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </svg>
);

export const InfoIcon = () => (
  <svg {...P} width={16} height={16} strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

export const TagIcon = () => (
  <svg {...P}>
    <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

export const FileTextIcon = () => (
  <svg {...P}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6M9 13h6M9 17h4" />
  </svg>
);

export const VideoIcon = () => (
  <svg {...P}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m22 8-6 4 6 4V8Z" />
  </svg>
);

export const PenIcon = () => (
  <svg {...P}>
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);
