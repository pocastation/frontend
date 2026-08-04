import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PreRegistrationForm from "./PreRegistrationForm";
import StickyApplyBar from "./StickyApplyBar";
import { FOCUS_RING } from "@/lib/ui";

// 홍보 링크로 뿌리는 사전예약 페이지. 링크 미리보기가 이 페이지 전용으로 뜨도록 메타를 따로 준다
// (레이아웃 기본값은 "K-POP 포카 경매"라 사전예약 맥락이 안 드러난다).
export const metadata: Metadata = {
  title: "포카스테이션 사전예약 — 믿고 거래하는 K-POP 포토카드 경매",
  description:
    "사진 인증으로 실물을 확인하고, 대금은 거래가 끝날 때까지 보호해요. 지금 사전 신청하면 정식 오픈 소식을 가장 먼저 받고 선착순 혜택도 챙겨드려요.",
  alternates: { canonical: "/intro" },
  openGraph: {
    type: "website",
    url: "/intro",
    title: "포카스테이션 사전예약 — 믿고 거래하는 K-POP 포토카드 경매",
    description:
      "사진 인증으로 실물을 확인하고, 대금은 거래가 끝날 때까지 보호해요. 지금 사전 신청하고 오픈 소식을 가장 먼저 받아보세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "포카스테이션 사전예약 — 믿고 거래하는 K-POP 포토카드 경매",
    description:
      "사진 인증으로 실물을 확인하고, 대금은 거래가 끝날 때까지 보호해요.",
  },
};

// 서비스가 실제로 하는 일만 적는다. 시안의 "DM 없는 자동 매칭"·"셀러가 올리면 바이어가 즉시 체결"은
// 다른 제품의 설명이라 그대로 쓸 수 없다 — 우리는 경매와 즉시판매다.
const FEATURES: { title: string; body: string }[] = [
  {
    title: "사진만 퍼온 매물이 올라오지 않아요",
    body: "판매자는 발급된 코드를 종이에 적어 실물과 함께 찍어야 등록을 마칠 수 있어요. 인증 사진과 판매 사진을 대조해 승인한 매물만 공개돼요.",
  },
  {
    title: "대금은 거래가 끝날 때까지 보호돼요",
    body: "낙찰되면 바로 결제되지만 판매자에게 곧장 넘어가지 않아요. 발송과 수령이 확인되고 구매가 확정된 뒤에 정산됩니다.",
  },
  {
    title: "마감 직전 낚아채기가 통하지 않아요",
    body: "마감 3분 안에 입찰이 들어오면 시간이 3분 연장돼요. 끝까지 화면을 지켜보지 않아도 공정하게 겨룰 수 있어요.",
  },
  {
    title: "배송이 늦어져도 방치되지 않아요",
    body: "운송장을 등록하면 배송 상태가 자동으로 추적돼요. 3영업일까지 발송하지 않으면 주문이 취소되고 환불되며, 문제가 생기면 반품·중재 절차로 이어집니다.",
  },
];

const BENEFITS: { title: string; body: string }[] = [
  {
    title: "거래 수수료 2,000 포인트",
    body: "정식 가입 선착순 30명께 수수료 결제에 쓸 수 있는 2,000 포인트를 드려요.",
  },
  {
    title: "정식 오픈 최우선 알림",
    body: "오픈 소식을 가장 먼저 받아보세요. 남겨주신 이메일로 안내가 나가요.",
  },
  {
    title: "얼리어답터 배지",
    body: "사전 신청자에게만 드리는 배지로 프로필에 표시돼요.",
  },
];

export default function IntroPage() {
  return (
    <main>
      {/* ── 첫 화면 ── 브랜드 문장과 신청 폼을 나란히 둔다.
          시안은 문장·신뢰요소·폼을 세로로 쌓아 데스크톱에서 폼이 접힘 아래로 밀렸다.
          넓은 화면에서는 스크롤 없이 신청까지 닿게 한다. */}
      <section id="intro-hero" className="border-b border-border bg-surface-2">
        <div className="mx-auto grid max-w-[1080px] items-start gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[1fr_400px] lg:gap-14">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-extrabold text-primary">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
              사전 신청 모집 중
            </p>
            <h1 className="mt-4 font-display text-[30px] font-extrabold leading-[1.18] tracking-[-0.045em] text-text-1 sm:text-[40px]">
              포카 거래,
              <br />
              걱정 없이 하고 싶었어요
            </h1>
            <p className="mt-5 max-w-[30rem] text-[14.5px] leading-[1.8] text-text-2">
              사진만 퍼온 매물, 입금하고 잠수, 마감 직전 낚아채기. 포카스테이션은 이 세 가지를
              시스템으로 막습니다. 지금 사전 신청하면 정식 오픈 소식을 가장 먼저 받아보실 수 있어요.
            </p>

            <dl className="mt-8 flex flex-col divide-y divide-border-2/70 border-y border-border-2/70">
              {[
                ["사진 인증", "코드를 적어 실물과 함께 찍어야 등록이 끝나요"],
                ["대금 보호", "구매 확정 전까지 판매자에게 넘어가지 않아요"],
                ["자동 연장", "마감 3분 내 입찰이 들어오면 3분 연장돼요"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4 py-3">
                  <dt className="w-[64px] shrink-0 text-[12.5px] font-extrabold text-text-1">{k}</dt>
                  <dd className="text-[12.5px] leading-[1.65] text-text-2">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Suspense fallback={<div className="h-[520px] rounded-[6px] border border-border-2 bg-white" />}>
            <PreRegistrationForm />
          </Suspense>
        </div>
      </section>

      {/* ── 기능 ── 카드 격자를 반복하지 않고 번호 목록으로 둔다. */}
      <section className="mx-auto max-w-[1080px] px-5 py-14 sm:py-16">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-text-3">왜 포카스테이션인가</p>
        <h2 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1 sm:text-[28px]">
          거래가 무서웠던 이유를 하나씩 없앴어요
        </h2>
        <p className="mt-2.5 text-[13px] text-text-3">지금 실제로 동작하는 기능만 적었어요.</p>

        <ol className="mt-8 grid gap-x-12 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="flex gap-4 border-t border-border py-5">
              <span
                aria-hidden="true"
                className="mt-1 font-display text-[11px] font-extrabold tabular-nums text-text-3"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[15.5px] font-extrabold tracking-[-0.025em] text-text-1">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-[1.75] text-text-2">{f.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 신뢰 ── 딥스페이스 지면으로 넘겨 본문과 층위를 나눈다. */}
      <section className="bg-deepspace">
        <div className="mx-auto max-w-[1080px] px-5 py-14 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-14">
            <div>
              <p className="font-display text-[46px] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[56px]">
                8.7
                <span className="ml-1 align-baseline text-[20px] font-bold" style={{ color: "#c8bcff" }}>
                  / 10
                </span>
              </p>
              <p className="mt-2.5 text-[12.5px]" style={{ color: "#c8bcff" }}>
                1월 사전 테스트 만족도
              </p>
            </div>

            <figure className="border-l border-white/15 pl-6 sm:pl-8">
              <blockquote className="text-[14.5px] leading-[1.85] text-white/85">
                트위터에서 포카 팔다가 사기 당한 적 있어서 항상 무서웠는데, 이런 플랫폼이 생기면 진짜
                편하게 거래할 수 있을 것 같아요
              </blockquote>
              <figcaption className="mt-3.5 text-[12px] text-white/40">
                1월 사전 테스트 참여자
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ── 혜택 ── */}
      <section className="mx-auto max-w-[1080px] px-5 py-14 sm:py-16">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-text-3">사전 신청 혜택</p>
        <h2 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1 sm:text-[28px]">
          지금 신청하면 드리는 것
        </h2>

        <ul className="mt-7 flex flex-col">
          {BENEFITS.map((b) => (
            <li
              key={b.title}
              className="flex flex-col gap-1 border-t border-border py-5 last:border-b sm:flex-row sm:gap-10"
            >
              <h3 className="text-[14px] font-extrabold tracking-[-0.02em] text-text-1 sm:w-[210px] sm:shrink-0">
                {b.title}
              </h3>
              <p className="text-[13px] leading-[1.75] text-text-2">{b.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href="#apply"
            className={`inline-flex h-12 items-center rounded-[4px] bg-primary px-8 text-[14.5px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
          >
            사전 신청하기
          </a>
          <Link
            href="/auctions"
            className={`text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
          >
            지금 올라온 매물 둘러보기
          </Link>
        </div>
      </section>

      <StickyApplyBar />
      {/* 하단 고정 바가 마지막 콘텐츠를 가리지 않도록 모바일에서만 여백을 준다. */}
      <div aria-hidden="true" className="h-[72px] sm:hidden" />
    </main>
  );
}
