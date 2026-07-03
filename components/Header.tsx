import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "경매" },
  { href: "/", label: "아티스트" },
  { href: "/", label: "종료된 경매" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-r2 bg-primary text-base text-white">
            ★
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-extrabold tracking-tight">
              POCA
            </span>
            <span className="block text-[10px] font-medium tracking-wide text-text-3">
              K-POP 포카 경매
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-text-2 transition-colors hover:bg-primary-soft hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full border border-border-2 bg-white px-4 py-1.5 text-sm font-bold text-text-2 transition-colors hover:border-primary hover:text-primary"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
          >
            회원가입
          </Link>
        </div>
      </div>
    </header>
  );
}
