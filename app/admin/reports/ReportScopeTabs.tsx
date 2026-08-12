"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCUS_RING } from "@/lib/ui";

// 사이드바에 '신고 관리'와 '리뷰 신고'가 따로 있어 메뉴가 길어졌다. 사이드바에는 '신고 관리'만
// 남기고, 대상(매물/리뷰) 전환은 이 하위 탭이 담당한다. 두 페이지 모두 같은 탭을 렌더한다.
const SCOPES: { href: string; label: string }[] = [
  { href: "/admin/reports", label: "매물 신고" },
  { href: "/admin/reviews", label: "리뷰 신고" },
];

export default function ReportScopeTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="신고 대상" className="mt-4 flex gap-1.5 border-b border-border">
      {SCOPES.map((scope) => {
        const active = pathname === scope.href;
        return (
          <Link
            key={scope.href}
            href={scope.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 pb-2.5 text-[13.5px] font-bold transition-colors ${FOCUS_RING} ${
              active ? "border-primary text-primary" : "border-transparent text-text-3 hover:text-text-1"
            }`}
          >
            {scope.label}
          </Link>
        );
      })}
    </nav>
  );
}
