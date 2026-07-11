"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// 상단 메뉴는 리디자인 검토 과정에서 일단 비웠었음(§2026-07-05) — 콘텐츠를 갖춘 페이지가
// 하나씩 생길 때마다 되살리는 중(아티스트 §2026-07-06, 경매 목록 §2026-07-07). 종료된 경매는
// 아직 스텁이라 보류.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/auctions", label: "경매" },
  { href: "/instant-sales", label: "즉시판매" },
  { href: "/artists", label: "아티스트" },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { member, logout, isLoading } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchFieldId = useId();
  const mobileSearchFieldId = useId();

  // 페이지가 바뀌면 검색 입력을 비운다 — 검색어가 다른 화면까지 따라다니지 않게. 이전 pathname을
  // 렌더 중에 비교해 리셋하는 React 권장 패턴(effect 안 setState 대신).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSearchInput("");
  }

  const isAdminMember = member?.role === "ADMIN" || member?.role === "ROLE_ADMIN";
  const navLinks = isAdminMember ? [...NAV_LINKS, { href: "/admin", label: "관리자" }] : NAV_LINKS;

  async function handleLogout() {
    setIsMenuOpen(false);
    await logout();
    router.push("/");
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  // 헤더 검색은 "제출(Enter/돋보기) 시 경매 목록에서 검색". 타이핑 중에는 아무 페이지도
  // 이동하지 않고, 제출하면 /auctions?q=로 넘겨 그 페이지의 검색으로 이어받는다.
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsMenuOpen(false);
    const q = searchInput.trim();
    router.push(q ? `/auctions?q=${encodeURIComponent(q)}` : "/auctions");
  }

  return (
    <header className="hdr">
      <div className="pg hdr-in">
        <Link href="/" onClick={closeMenu} className="logo">
          <span className="logo-i">★</span>
          <span>
            <span className="logo-nm">POCA</span>
            <span className="logo-ds">K-POP 포카 경매</span>
          </span>
        </Link>

        <form className="srch" role="search" onSubmit={handleSearchSubmit}>
          <button type="submit" className="srch-ic" aria-label="검색">
            <SearchIcon />
          </button>
          <input
            id={searchFieldId}
            type="search"
            aria-label="아티스트, 멤버, 앨범 검색"
            placeholder="아티스트, 멤버, 앨범 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <nav aria-label="주요 메뉴" className="gnv">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={closeMenu}
              className={(link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)) ? "on" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hdr-r">
          <Link href="/notifications" className="ic-btn" aria-label="알림">
            <BellIcon />
          </Link>
          <Link href={member ? "/auctions/new" : "/login"} className="btn btn-p sell-btn">
            <PlusIcon />
            <span className="btn-txt">판매 등록</span>
          </Link>

          {isLoading ? (
            <div className="auth-skel" aria-hidden="true" />
          ) : member ? (
            <>
              <Link href="/mypage" onClick={closeMenu} className="user-chip" title="마이페이지">
                <span className="user-av">{member.nickname.slice(0, 1).toUpperCase()}</span>
                <span className="user-nm">{member.nickname}</span>
              </Link>
              <button type="button" onClick={handleLogout} className="ic-btn" aria-label="로그아웃" title="로그아웃">
                <LogoutIcon />
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-o">
              로그인
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen((open) => !open)}
          className={`ml-auto flex h-9 w-9 items-center justify-center rounded-r2 text-text-1 sm:hidden ${FOCUS_RING}`}
        >
          <span className="relative block h-4 w-5" aria-hidden="true">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform ${isMenuOpen ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span
              className={`absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-current transition-opacity ${isMenuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 top-3 h-0.5 w-5 rounded-full bg-current transition-transform ${isMenuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {isMenuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-white px-4 py-3 sm:hidden">
          <form className="relative mb-3" role="search" onSubmit={handleSearchSubmit}>
            <label htmlFor={mobileSearchFieldId} className="sr-only">
              아티스트, 멤버, 앨범 검색
            </label>
            <button type="submit" aria-label="검색" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3">
              <SearchIcon />
            </button>
            <input
              id={mobileSearchFieldId}
              type="search"
              placeholder="아티스트, 멤버, 앨범 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`w-full rounded-full border border-border bg-bg py-2 pl-9 pr-3.5 text-sm outline-none focus:border-primary ${FOCUS_RING}`}
            />
          </form>

          <nav aria-label="주요 메뉴" className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className={`rounded-r2 px-2 py-2.5 text-sm font-semibold text-text-2 transition-colors hover:bg-primary-soft hover:text-primary ${FOCUS_RING}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            {isLoading ? null : member ? (
              <>
                <Link
                  href="/auctions/new"
                  onClick={closeMenu}
                  className={`flex h-11 items-center justify-center rounded-r3 bg-primary text-sm font-bold text-white ${FOCUS_RING}`}
                >
                  판매 등록
                </Link>
                <div className="flex items-center justify-between px-1">
                  <Link href="/mypage" onClick={closeMenu} className={`text-sm font-semibold text-text-2 ${FOCUS_RING}`}>
                    {member.nickname}님 마이페이지 →
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={`rounded-full border border-border-2 bg-white px-4 py-1.5 text-sm font-bold text-text-2 ${FOCUS_RING}`}
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                onClick={closeMenu}
                className={`flex h-11 items-center justify-center rounded-r3 bg-primary text-sm font-bold text-white ${FOCUS_RING}`}
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
