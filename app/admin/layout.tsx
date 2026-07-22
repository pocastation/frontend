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
function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5.5 4v-4.5A2.5 2.5 0 0 1 4 13.5Z" />
    </svg>
  );
}

// 지금 쓸 수 있는 메뉴 / 준비 중인 메뉴를 구분해 보여준다(어드민 기능 지도 §2026-07-06 기준).
const OPERATION_NAV: NavItem[] = [
  { href: "/admin", label: "대시보드", icon: <GridIcon />, ready: true },
  { href: "/admin/members", label: "회원 관리", icon: <UsersIcon />, ready: true },
  { href: "/admin/catalog", label: "카탈로그 관리", icon: <CardIcon />, ready: true },
  { href: "/admin/auctions", label: "경매 관리", icon: <GavelIcon />, ready: true },
  { href: "/admin/reports", label: "신고 관리", icon: <FlagIcon />, ready: true },
  { href: "/admin/reviews", label: "리뷰 신고", icon: <FlagIcon />, ready: true },
  { href: "/admin/suggestions", label: "건의 관리", icon: <LightbulbIcon />, ready: true },
  { href: "/admin/inquiries", label: "문의 관리", icon: <MessageIcon />, ready: true },
  { href: "/admin/audit", label: "감사 로그", icon: <ClipboardListIcon />, ready: true },
  { href: "/admin/notices", label: "공지사항", icon: <MegaphoneIcon />, ready: false },
];

const COMING_NAV: NavItem[] = [
  { href: "/admin/settlement", label: "결제·정산", icon: <TagIcon />, ready: false },
  { href: "/admin/disputes", label: "분쟁·중재", icon: <ScaleIcon />, ready: false },
  { href: "/admin/notifications", label: "알림 발송", icon: <BellIcon />, ready: false },
];

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
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:py-8">
      {/* 모바일 내비 — 사이드바가 lg 미만에서 숨겨지므로, 사용 가능한 운영 메뉴를 가로 스크롤
          탭바로 제공해 모바일에서도 섹션 이동이 되게 한다. */}
      <nav
        aria-label="관리자 메뉴"
        className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
      >
        {OPERATION_NAV.filter((item) => item.ready).map((item) => {
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
            <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-extrabold text-text-3">운영</p>
            <nav aria-label="운영 메뉴" className="flex flex-col">
              {OPERATION_NAV.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </nav>
            <p className="mt-2 px-2.5 pb-1.5 pt-2 text-[11px] font-extrabold text-text-3">준비 중</p>
            <nav aria-label="준비 중 메뉴" className="flex flex-col">
              {COMING_NAV.map((item) => (
                <NavLink key={item.href} item={item} active={false} />
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
