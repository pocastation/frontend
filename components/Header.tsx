"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSearch } from "@/lib/search-context";

const NAV_LINKS = [
  { href: "/", label: "경매" },
  { href: "/", label: "아티스트" },
  { href: "/", label: "종료된 경매" },
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

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { member, logout, isLoading } = useAuth();
  const { query, setQuery } = useSearch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchFieldId = useId();
  const mobileSearchFieldId = useId();

  async function handleLogout() {
    setIsMenuOpen(false);
    await logout();
    router.push("/");
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  // 검색은 홈 화면(경매 목록)에서만 의미가 있다 — 다른 페이지에서 입력을 시작하면 홈으로 보낸다.
  function handleSearchChange(value: string) {
    setQuery(value);
    if (pathname !== "/") {
      router.push("/");
    }
  }

  return (
    <header className="sticky top-0 z-30 h-[60px] border-b border-border bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1160px] items-center gap-4 px-4">
        <Link
          href="/"
          onClick={closeMenu}
          className={`flex shrink-0 items-center gap-2 rounded-r2 ${FOCUS_RING}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-r2 bg-primary text-base text-white">
            ★
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-extrabold tracking-tight">POCA</span>
            <span className="block text-[10px] font-medium tracking-wide text-text-3">
              K-POP 포카 경매
            </span>
          </span>
        </Link>

        <div className="relative hidden max-w-[360px] flex-1 sm:block">
          <label htmlFor={searchFieldId} className="sr-only">
            아티스트, 멤버, 앨범 검색
          </label>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3">
            <SearchIcon />
          </span>
          <input
            id={searchFieldId}
            type="search"
            placeholder="아티스트, 멤버, 앨범 검색..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`w-full rounded-full border border-border bg-bg py-2 pl-9 pr-3.5 text-[13.5px] outline-none transition-colors placeholder:text-text-3 focus:border-primary focus:shadow-[0_0_0_3px_rgba(91,63,232,0.1)] ${FOCUS_RING}`}
          />
        </div>

        <nav aria-label="주요 메뉴" className="hidden gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold text-text-2 transition-colors hover:bg-primary-soft hover:text-primary ${FOCUS_RING}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {isLoading ? (
            // 서버는 항상 비로그인으로 렌더하므로, 클라이언트에서 실제 세션 상태를 확인하기
            // 전까지는 "로그인"/닉네임 둘 다 아닌 중립 placeholder를 보여준다. 틀린 상태를
            // 잠깐 보여줬다가 바뀌는 것(하이드레이션 깜빡임)을 막기 위함.
            <div className="h-8 w-16 animate-pulse rounded-full bg-border-2/50" aria-hidden="true" />
          ) : member ? (
            <>
              <Link
                href="/auctions/new"
                className={`rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white transition-all hover:bg-primary-dark active:scale-95 ${FOCUS_RING}`}
              >
                판매하기
              </Link>
              <span className="max-w-[9ch] truncate text-sm font-semibold text-text-2">
                {member.nickname}
              </span>
              <button
                onClick={handleLogout}
                className={`rounded-full border border-border-2 bg-white px-4 py-1.5 text-sm font-bold text-text-2 transition-all hover:border-primary hover:text-primary active:scale-95 ${FOCUS_RING}`}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={`rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white transition-all hover:bg-primary-dark active:scale-95 ${FOCUS_RING}`}
            >
              로그인
            </Link>
          )}
        </div>

        {/* 모바일: 데스크톱 가로 나열이 로그인 시 판매하기·닉네임·로그아웃까지 겹쳐 줄바꿈되던
            문제를 햄버거 메뉴로 해소 — 네비 링크도 이 메뉴가 아니면 모바일에서 접근 불가했음. */}
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
          <div className="relative mb-3">
            <label htmlFor={mobileSearchFieldId} className="sr-only">
              아티스트, 멤버, 앨범 검색
            </label>
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3">
              <SearchIcon />
            </span>
            <input
              id={mobileSearchFieldId}
              type="search"
              placeholder="아티스트, 멤버, 앨범 검색..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`w-full rounded-full border border-border bg-bg py-2 pl-9 pr-3.5 text-sm outline-none focus:border-primary ${FOCUS_RING}`}
            />
          </div>

          <nav aria-label="주요 메뉴" className="flex flex-col">
            {NAV_LINKS.map((link) => (
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
                  판매하기
                </Link>
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-text-2">{member.nickname}님</span>
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
