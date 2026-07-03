const FOOTER_COLUMNS = [
  {
    title: "서비스",
    links: [
      { label: "경매 둘러보기", href: "/" },
      { label: "이용 방법", href: "/" },
    ],
  },
  {
    title: "고객지원",
    links: [
      { label: "공지사항", href: "/" },
      { label: "자주 묻는 질문", href: "/" },
    ],
  },
  {
    title: "약관",
    links: [
      { label: "이용약관", href: "/" },
      { label: "개인정보처리방침", href: "/" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-text-1 px-4 pb-7 pt-12 text-white/40">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 sm:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-r1 bg-primary text-sm">
              ★
            </span>
            POCA
          </div>
          <p className="max-w-[22ch] text-xs leading-relaxed">
            K-pop 포토카드 특화 경매 플랫폼
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h4 className="mb-3 text-[11px] font-extrabold tracking-wide text-white/70">
              {column.title}
            </h4>
            {column.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block py-1 text-xs transition-colors hover:text-white/85"
              >
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-5xl border-t border-white/10 pt-5 text-[11px]">
        © {new Date().getFullYear()} Pocastation. All rights reserved.
      </div>
    </footer>
  );
}
