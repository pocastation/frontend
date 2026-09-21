import type { Metadata } from "next";
import Link from "next/link";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

/**
 * 없는 페이지(#694).
 *
 * <p>이 화면이 필요한 이유는 주소 오타가 아니다. <b>알림이 여기로 보낸다.</b> 운영 기준에 따라
 * 내려간 교환글은 상세 조회가 404를 주고({@code ExchangePost.isVisible()}은 {@code SUSPENDED}를
 * 숨긴다) 페이지가 {@code notFound()}를 부른다 — 「글이 내려갔어요」 알림을 누른 작성자가 닿는
 * 자리가 여기다. 기본 화면을 두면 그 사람이 영어 한 줄을 보고 끝난다.
 *
 * <p>그래서 원인을 셋으로 나눠 적고 <b>문의 경로를 함께 둔다.</b> 이의를 받을 자리가 없으면
 * 내려간 이유를 물을 곳이 없다.
 *
 * <p>골격은 탈퇴 완료 화면(#567)에서 가져왔다 — 3px 보라 바 → 오버라인 → 제목 → 본문 → CTA.
 * 다만 사실 표는 두지 않는다. 여기서 확정해 말할 수 있는 사실이 없다.
 */

export const metadata: Metadata = {
  title: "찾을 수 없는 페이지",
  robots: { index: false, follow: false },
};

// 되돌아갈 자리. 「홈」만 두면 무엇을 보러 왔든 처음부터 다시 찾게 된다.
const ROUTES: { href: string; label: string; detail: string }[] = [
  { href: "/auctions", label: "제안판매", detail: "가격을 제안해 사는 판매글" },
  { href: "/instant-sales", label: "즉시판매", detail: "정해진 값에 바로 사는 판매글" },
  { href: "/events", label: "행사 캘린더", detail: "음악방송·공연 일정과 포카 교환" },
];

export default function NotFound() {
  return (
    <>
      <MobilePageHead title="찾을 수 없는 페이지" variant="close" backHref="/" />

      {/* 레이아웃이 이미 <main>으로 감싼다 — 여기서 또 쓰면 main이 중첩된다. */}
      <div className="mx-auto w-full max-w-[560px] px-[14px] py-9 sm:px-5 sm:py-20">
        <span aria-hidden="true" className="block h-[3px] w-7 bg-primary" />
        <p className="mt-4 text-[11.5px] font-bold tracking-[0.08em] text-text-3">404</p>
        <h1 className="mt-2 font-display text-[24px] font-extrabold leading-[1.25] tracking-[-0.03em] text-text-1 sm:text-[26px]">
          이 페이지를 찾을 수 없어요
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-text-2">
          주소가 바뀌었거나, 글이 지워졌거나, 운영 기준에 따라 내려간 글일 수 있어요.
        </p>

        <nav aria-label="다른 경로" className="mt-7 border-t border-border">
          {ROUTES.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`flex items-baseline gap-2.5 border-b border-border py-3 ${FOCUS_RING}`}
            >
              <span className="w-[74px] shrink-0 text-[12.5px] font-extrabold text-text-1 sm:w-[96px]">
                {route.label}
              </span>
              <span className="text-[12.5px] leading-[1.55] text-text-3">{route.detail}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/"
            className={`inline-flex h-12 items-center justify-center px-5 sm:w-[200px] ${PRIMARY_BUTTON_CLASS}`}
          >
            홈으로
          </Link>
          {/* 내려간 글의 작성자가 이유를 물을 자리다. 404에서 가장 필요한 링크가 이것이다. */}
          <Link
            href="/inquiries/new"
            className="text-center text-[12.5px] text-text-3 underline decoration-text-3 underline-offset-[3px] hover:text-text-2"
          >
            글이 내려간 이유를 문의하기
          </Link>
        </div>
      </div>
    </>
  );
}
