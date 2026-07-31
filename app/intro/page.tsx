import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import InterestButton from "./InterestButton";
import { FOCUS_RING } from "@/lib/ui";

// 홍보 링크로 뿌리는 소개 페이지. 링크 미리보기가 이 페이지 전용으로 뜨도록 메타를 따로 준다
// (레이아웃 기본값은 "K-POP 포카 경매"라 소개/사전예약 맥락이 안 드러난다).
export const metadata: Metadata = {
  title: "포카스테이션 — 믿고 거래하는 K-POP 포토카드 경매",
  description:
    "사진 인증으로 실물을 확인하고, 안전결제로 대금을 보호하고, 공정한 경매로 제값에 거래해요. 오픈 소식을 가장 먼저 받아보세요.",
  alternates: { canonical: "/intro" },
  openGraph: {
    type: "website",
    url: "/intro",
    title: "포카스테이션 — 믿고 거래하는 K-POP 포토카드 경매",
    description:
      "사진 인증으로 실물을 확인하고, 안전결제로 대금을 보호하고, 공정한 경매로 제값에 거래해요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "포카스테이션 — 믿고 거래하는 K-POP 포토카드 경매",
    description:
      "사진 인증으로 실물을 확인하고, 안전결제로 대금을 보호하고, 공정한 경매로 제값에 거래해요.",
  },
};

// 히어로 별빛. 홈 Hero와 같은 브랜드 서사(포카+스테이션 = 우주 정거장)라 장식 방식을 맞춘다.
// 좌표는 좌측 텍스트 컬럼을 피해 상단 띠·우측·하단에 둔다(글자 위에 별이 겹치지 않게).
const STAR_DOTS: { top: string; left: string; size: number; lav?: boolean }[] = [
  { top: "6%", left: "10%", size: 2 },
  { top: "9%", left: "28%", size: 2, lav: true },
  { top: "5%", left: "52%", size: 3 },
  { top: "12%", left: "72%", size: 2, lav: true },
  { top: "7%", left: "88%", size: 2 },
  { top: "34%", left: "93%", size: 3, lav: true },
  { top: "58%", left: "86%", size: 2 },
  { top: "78%", left: "94%", size: 3, lav: true },
  { top: "88%", left: "18%", size: 2, lav: true },
  { top: "92%", left: "44%", size: 2 },
  { top: "84%", left: "68%", size: 3, lav: true },
];

// 서비스가 실제로 하는 일만 적는다. 없는 실적·숫자는 쓰지 않는다(§1 신뢰 —
// 홈 통계를 "예시"로 표기해온 것과 같은 원칙). 전부 지금 동작하는 기능이다.
const VALUES: { title: string; body: string }[] = [
  {
    title: "사진 인증으로 실물을 확인해요",
    body: "판매자는 발급된 코드를 적어 실물과 함께 촬영합니다. 관리자가 인증 사진과 판매 사진을 대조해 승인한 매물만 공개돼요. 남의 사진을 가져다 쓰는 걸 막습니다.",
  },
  {
    title: "대금은 거래가 끝날 때까지 보호돼요",
    body: "낙찰 즉시 결제되지만 판매자에게 바로 넘어가지 않아요. 발송·수령이 확인되고 구매가 확정된 뒤에 정산됩니다.",
  },
  {
    title: "마감 직전 낚아채기가 통하지 않아요",
    body: "마감 3분 안에 입찰이 들어오면 시간이 연장됩니다. 한 번에 값을 크게 올리는 것도 제한해, 끝까지 지켜보지 않아도 공정하게 겨룰 수 있어요.",
  },
  {
    title: "배송과 분쟁까지 절차가 있어요",
    body: "운송장을 등록하면 배송 상태가 자동으로 추적됩니다. 발송이 늦어지면 거래가 취소되고 환불되며, 문제가 생기면 반품·중재 절차로 이어져요.",
  },
];

// 실제로 무엇이 어떤 순서로 일어나는지. 판매자·구매자 모두 처음이면 여기서 감을 잡는다.
const STEPS: { step: string; title: string; body: string }[] = [
  { step: "01", title: "매물 등록", body: "판매자가 사진과 정보를 올리고, 발급 코드로 실물을 인증합니다." },
  { step: "02", title: "검수 후 공개", body: "관리자가 인증 사진을 확인해 승인하면 경매가 시작돼요." },
  { step: "03", title: "입찰 또는 즉시구매", body: "경매로 겨루거나, 즉시판매 매물은 바로 살 수 있어요." },
  { step: "04", title: "결제·발송·구매확정", body: "낙찰되면 자동 결제되고, 물건을 받아 확정하면 정산됩니다." },
];

export default function IntroPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-deepspace text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {STAR_DOTS.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                top: s.top,
                left: s.left,
                width: s.size,
                height: s.size,
                background: s.lav ? "#c8bcff" : "#ffffff",
                boxShadow: `0 0 ${s.size + 2}px ${s.lav ? "rgba(200,188,255,.7)" : "rgba(255,255,255,.8)"}`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-[1160px] px-4 py-20 text-center sm:py-28 sm:text-left">
          <p className="text-xs font-extrabold tracking-[0.2em]" style={{ color: "#ebc06b" }}>
            POCASTATION
          </p>
          <h1 className="mt-4 font-display text-[clamp(30px,5vw,46px)] font-extrabold leading-[1.25] tracking-[-0.02em]">
            <span className="font-sans font-black">포토카드를</span>
            <br />
            <span style={{ color: "#c8bcff" }}>믿고 거래하는</span>{" "}
            <span className="font-sans font-black">가장 쉬운 방법</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-base leading-relaxed sm:text-[17px]" style={{ color: "#c8bcff" }}>
            사진 인증으로 실물을 확인하고, 대금은 거래가 끝날 때까지 보호하고,
            <br className="hidden sm:block" />
            마감 직전 낚아채기가 통하지 않는 경매로 제값에 거래해요.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:items-start">
            <Suspense fallback={<div className="h-12" />}>
              <InterestButton />
            </Suspense>
            <Link
              href="/"
              className={`text-sm font-bold underline underline-offset-4 transition-colors hover:text-white ${FOCUS_RING}`}
              style={{ color: "#c8bcff" }}
            >
              지금 진행 중인 경매 둘러보기 →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 py-16 sm:py-20">
        <h2 className="font-display text-[clamp(22px,3vw,30px)] font-extrabold tracking-tight text-text-1">
          왜 포카스테이션인가요
        </h2>
        <p className="mt-2 text-sm text-text-3">지금 동작하는 것만 적었어요.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-r4 border border-border bg-surface p-6">
              <h3 className="font-display text-base font-extrabold text-text-1">{v.title}</h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-text-2">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface-2">
        <div className="mx-auto max-w-[1160px] px-4 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(22px,3vw,30px)] font-extrabold tracking-tight text-text-1">
            거래는 이렇게 진행돼요
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-r4 border border-border bg-surface p-5">
                <span className="font-display text-xs font-extrabold text-primary">{s.step}</span>
                <h3 className="mt-2 text-sm font-extrabold text-text-1">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-3">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 py-16 text-center sm:py-20">
        <h2 className="font-display text-[clamp(20px,2.6vw,26px)] font-extrabold tracking-tight text-text-1">
          정식 오픈 소식을 가장 먼저 받아보세요
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-sm leading-relaxed text-text-3">
          관심 표시는 이름·이메일·연락처를 받지 않아요. 얼마나 많은 분이 기다리시는지만 셉니다.
        </p>
        <div className="mt-7 flex justify-center">
          <div className="rounded-r4 border border-border bg-deepspace px-6 py-7 sm:px-10">
            <Suspense fallback={<div className="h-12" />}>
              <InterestButton />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
