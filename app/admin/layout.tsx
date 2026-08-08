"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { FOCUS_RING } from "@/lib/ui";
import type { MemberResponse } from "@/lib/types";

function isAdmin(member: MemberResponse | null): boolean {
  return member?.role === "ADMIN" || member?.role === "ROLE_ADMIN";
}

type NavItem = { href: string; label: string; icon: ReactNode; ready: boolean };

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6M17.5 20a5.5 5.5 0 0 0-2-4.3" />
    </svg>
  );
}
function GavelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m14 6 4 4M9 11l4 4M3 21h8M12.5 3.5l8 8-2 2-8-8zM8 9l-4.5 4.5 2 2L10 11" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 21V4M5 4h11l-1.5 3.5L16 11H5" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20 12 12.5 4.5A2 2 0 0 0 11 4H5a1 1 0 0 0-1 1v6c0 .5.2 1 .6 1.4L12 20Z" /><circle cx="8" cy="8" r="1.3" />
    </svg>
  );
}
function MegaphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1ZM14 8a4 4 0 0 1 0 8" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" />
    </svg>
  );
}
function ScaleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3v18M7 21h10M5 7h14M5 7l-2.5 5a3 3 0 0 0 5 0zM19 7l-2.5 5a3 3 0 0 0 5 0z" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ClipboardListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 12h6M9 16h6M9 8h6M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
function LightbulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </svg>
  );
}
function MailBanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M22 12V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" />
      <path d="m2 7 10 6 10-6" />
      <circle cx="18" cy="18" r="4" />
      <path d="m15.5 20.5 5-5" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5.5 4v-4.5A2.5 2.5 0 0 1 4 13.5Z" />
    </svg>
  );
}

// 한 덩어리로 11개가 늘어서 있어 원하는 메뉴를 찾기 어려웠다 — 성격별로 묶고,
// '리뷰 신고'는 '신고 관리' 안의 하위 탭(ReportScopeTabs)으로 흡수했다.
// 사이드바에 없어도 /admin/reviews 는 그대로 접근 가능하고, 활성 표시는 '신고 관리'가 받는다.
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "운영",
    items: [
      { href: "/admin", label: "대시보드", icon: <GridIcon />, ready: true },
      { href: "/admin/members", label: "회원 관리", icon: <UsersIcon />, ready: true },
      { href: "/admin/catalog", label: "카탈로그 관리", icon: <CardIcon />, ready: true },
      { href: "/admin/auctions", label: "경매 관리", icon: <GavelIcon />, ready: true },
    ],
  },
  {
    title: "검토·조치",
    items: [
      { href: "/admin/reports", label: "신고 관리", icon: <FlagIcon />, ready: true },
      { href: "/admin/disputes", label: "분쟁·중재", icon: <ScaleIcon />, ready: true },
    ],
  },
  {
    title: "고객 지원",
    items: [
      { href: "/admin/inquiries", label: "문의 관리", icon: <MessageIcon />, ready: true },
      { href: "/admin/suggestions", label: "건의 관리", icon: <LightbulbIcon />, ready: true },
    ],
  },
  {
    title: "기록",
    items: [{ href: "/admin/audit", label: "감사 로그", icon: <ClipboardListIcon />, ready: true }],
  },
  {
    title: "메일",
    items: [
      { href: "/admin/email-suppressions", label: "발송 금지 목록", icon: <MailBanIcon />, ready: true },
    ],
  },
  {
    title: "준비 중",
    items: [
      { href: "/admin/notices", label: "공지사항", icon: <MegaphoneIcon />, ready: false },
      { href: "/admin/settlement", label: "결제·정산", icon: <TagIcon />, ready: false },
      { href: "/admin/notifications", label: "알림 발송", icon: <BellIcon />, ready: false },
    ],
  },
];

// 모바일 탭바·활성 판정에 쓰는 평탄화 목록.
const READY_NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.ready);

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base = "flex items-center gap-2.5 rounded-r2 px-2.5 py-2 text-sm font-bold transition-colors";
  if (!item.ready) {
    return (
      <span
        className={`${base} cursor-not-allowed text-text-3/70`}
        aria-disabled="true"
        title="준비 중이에요"
      >
        {item.icon}
        <span className="flex-1">{item.label}</span>
        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-extrabold text-text-3">준비 중</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      className={`${base} ${FOCUS_RING} ${active ? "bg-primary-soft text-primary" : "text-text-2 hover:bg-surface-2"}`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, member, isLoading } = useAuth();
  const admin = isAdmin(member);

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=/admin");
    }
  }, [accessToken, isLoading, router]);

  if (isLoading || !accessToken) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center text-sm text-text-3">
        관리자 권한을 확인하는 중...
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-xs font-extrabold tracking-wide text-accent">ACCESS DENIED</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-text-1">관리자 권한이 필요합니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-3">
          현재 계정은 {member?.role ?? "알 수 없음"} 권한입니다. 관리자 계정으로 로그인한 뒤 다시 접근해주세요.
        </p>
        <Link href="/" className={`mt-6 inline-flex h-11 items-center rounded-full border border-border-2 bg-white px-5 text-sm font-bold text-text-2 ${FOCUS_RING}`}>
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    // 리뷰 신고는 사이드바 항목이 없고 '신고 관리'의 하위 탭이라, 활성 표시를 신고 관리가 대신 받는다.
    if (href === "/admin/reports" && pathname.startsWith("/admin/reviews")) return true;
    return pathname.startsWith(href);
  }

  // 지면 상한 1240 → 1720(#291). 1240은 **읽기 편한 줄 길이**를 위한 값인데, 관리자는 읽는
  // 화면이 아니라 여러 건을 한눈에 비교하는 화면이라 같은 상한을 쓸 이유가 없었다. 그 결과
  // 콘텐츠 영역이 964px(1240 − px-4 32 − 사이드바 220 − gap 24)로 고정돼, 경매 표의
  // min-w-[980px]가 **어떤 모니터에서도** 16px 모자라 항상 가로 스크롤이 났다.
  //
  // 무제한으로 풀지는 않는다 — 2560 울트라와이드에서 표가 2300px로 늘어나면 눈이 좌우로 너무
  // 멀리 가 밀도가 아니라 피로가 된다. 마이페이지는 사용자 화면이라 1160px 상한을 그대로 둔다.
  return (
    <div className="mx-auto max-w-[1720px] px-4 py-6 sm:py-8">
      {/* 모바일 내비 — 사이드바가 lg 미만에서 숨겨지므로, 사용 가능한 운영 메뉴를 가로 스크롤
          탭바로 제공해 모바일에서도 섹션 이동이 되게 한다. */}
      <nav
        aria-label="관리자 메뉴"
        className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
      >
        {READY_NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${FOCUS_RING} ${
                active ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-2"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex gap-6">
        <aside className="hidden w-[220px] shrink-0 lg:block">
          <div className="sticky top-20 rounded-r3 border border-border bg-surface p-2 shadow-card">
            <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-extrabold tracking-wide text-primary">POCASTATION ADMIN</p>
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="px-2.5 pb-1.5 pt-2.5 text-[11px] font-extrabold text-text-3">{group.title}</p>
                <nav aria-label={`${group.title} 메뉴`} className="flex flex-col">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} active={item.ready && isActive(item.href)} />
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
