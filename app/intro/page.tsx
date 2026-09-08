import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PreRegistrationForm from "./PreRegistrationForm";
import StickyApplyBar from "./StickyApplyBar";
import PhoneMockup from "./PhoneMockup";
import GroupMarquee from "./GroupMarquee";
import { FOCUS_RING } from "@/lib/ui";

// 홍보 링크로 뿌리는 사전예약 페이지. 링크 미리보기가 이 페이지 전용으로 뜨도록 메타를 따로 준다
// (레이아웃 기본값은 "K-POP 포카 거래"라 사전예약 맥락이 안 드러난다).
export const metadata: Metadata = {
  title: "포카스테이션 사전예약 — 믿고 거래하는 K-POP 포토카드",
  description:
    "사진 인증으로 실물을 확인하고, 대금은 거래가 끝날 때까지 보호해요. 지금 사전 신청하면 정식 오픈 소식을 가장 먼저 받아보실 수 있어요.",
  alternates: { canonical: "/intro" },
  openGraph: {
    type: "website",
    url: "/intro",
    title: "포카스테이션 사전예약 — 믿고 거래하는 K-POP 포토카드",
    description:
      "사진 인증으로 실물을 확인하고, 대금은 거래가 끝날 때까지 보호해요. 지금 사전 신청하고 오픈 소식을 가장 먼저 받아보세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "포카스테이션 사전예약 — 믿고 거래하는 K-POP 포토카드",
    description:
      "사진 인증으로 실물을 확인하고, 대금은 거래가 끝날 때까지 보호해요.",
  },
};

// 서비스가 실제로 하는 일만 적는다. 시안 원본의 "DM 없는 자동 매칭"·"셀러가 올리면 바이어가 즉시 체결"은
// 다른 제품의 설명이라 그대로 쓸 수 없다 — 우리는 제안판매와 즉시판매다.
// problem은 없앤 문제다. 화면에서는 취소선으로 그려 「지웠다」는 뜻을 형태로 드러낸다.
const FEATURES: { problem: string; title: string; body: string }[] = [
  {
    problem: "사진만 퍼온 매물",
    title: "실물 없이는 등록이 안 돼요",
    body: "판매자는 발급된 코드를 종이에 적어 실물과 함께 찍어야 등록을 마칠 수 있어요. 인증 사진과 판매 사진을 대조해 승인한 매물만 공개돼요.",
  },
  {
    problem: "입금하고 잠수",
    title: "대금은 끝까지 보호돼요",
    body: "거래가 성사되면 바로 결제되지만 판매자에게 곧장 넘어가지 않아요. 발송과 수령이 확인되고 구매가 확정된 뒤에 정산됩니다.",
  },
  {
    problem: "마감 직전 낚아채기",
    title: "끝까지 지켜볼 필요 없어요",
    body: "마감 3분 안에 제안이 들어오면 시간이 3분 연장돼요. 끝까지 화면을 지켜보지 않아도 공정하게 겨룰 수 있어요.",
  },
  {
    problem: "배송 지연 방치",
    title: "3영업일 지나면 자동 취소돼요",
    body: "운송장을 등록하면 배송 상태가 자동으로 추적돼요. 3영업일까지 발송하지 않으면 주문이 취소되고 환불되며, 문제가 생기면 반품·중재 절차로 이어집니다.",
  },
];

// 거래 흐름은 실제 순서라 번호를 붙인다(01~04).
const STEPS: { who: string; title: string; body: string }[] = [
  { who: "판매자", title: "코드를 적어 실물과 함께 찍어요", body: "인증 사진을 대조해 승인한 매물만 공개돼요." },
  { who: "구매자", title: "원하는 값을 제안해요", body: "판매자가 고르면 그 자리에서 거래가 성사돼요." },
  { who: "포카스테이션", title: "대금을 맡아 보관해요", body: "판매자에게 곧장 넘어가지 않아요." },
  { who: "구매자 · 판매자", title: "수령을 확인하면 정산돼요", body: "구매 확정 뒤에 판매자에게 넘어가요." },
];

const BENEFITS: { title: string; body: string }[] = [
  {
    title: "정식 오픈 최우선 알림",
    body: "오픈 소식을 가장 먼저 받아보세요. 남겨주신 이메일로 안내가 나가요.",
  },
  {
    title: "얼리어답터 배지",
    body: "사전 신청자에게만 드리는 배지로 프로필에 표시돼요.",
  },
];

const CHIPS = ["사진 인증", "대금 보호", "마감 자동 연장"];

export default function IntroPage() {
  return (
    <main>
      {/* ── 첫 화면 ── 모바일은 문장 → 폰 목업 → 폼 순서로 쌓이고, 넓은 화면은 왼쪽 문장·목업 / 오른쪽 폼이다.
          폼을 히어로 안에 두는 건 넓은 화면에서 스크롤 없이 신청까지 닿게 하려는 것이고, StickyApplyBar가
          이 섹션(#intro-hero)을 관찰해 폼이 화면 밖일 때만 뜬다. */}
      <section id="intro-hero" className="overflow-hidden border-b border-border bg-surface-2">
        <div className="mx-auto grid max-w-[1080px] items-start gap-8 px-5 pt-10 pb-8 sm:pt-14 sm:pb-14 lg:grid-cols-[1fr_400px] lg:gap-14">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-extrabold text-primary">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
              사전 신청 모집 중
            </p>
            <h1 className="mt-3.5 font-display text-[30px] font-extrabold leading-[1.18] tracking-[-0.045em] text-text-1 sm:text-[42px]">
              포카 한 장에도
              <br />
              확인이 필요하니까,
              <span className="block font-sans font-black text-primary">포카스테이션</span>
            </h1>
            <p className="mt-4 max-w-[32rem] text-[14.5px] leading-[1.8] text-text-2 sm:text-[15.5px]">
              사진만 퍼온 매물, 입금하고 잠수, 마감 직전 낚아채기. 이 세 가지를 시스템으로 막아요.
            </p>
            <ul className="mt-[18px] flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <li
                  key={c}
                  className="inline-flex h-7 items-center rounded-[3px] border border-border-2 bg-white px-2.5 text-[12px] font-bold text-text-1"
                >
                  {c}
                </li>
              ))}
            </ul>

            <PhoneMockup className="mt-7 lg:mt-9 lg:max-w-[420px]" />
          </div>

          <Suspense fallback={<div className="h-[520px] rounded-[6px] border border-border-2 bg-white" />}>
            <PreRegistrationForm />
          </Suspense>
        </div>
      </section>

      <GroupMarquee />

      {/* ── 거래 흐름 ── 실제 순서라 번호를 둔다. 카드로 감싸지 않고 규칙선 행으로 나열한다. */}
      <section className="mx-auto max-w-[1080px] px-5 pt-10 sm:pt-14">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-text-3">거래 흐름</p>
        <h2 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1 sm:text-[28px]">
          등록부터 정산까지, 네 걸음이에요
        </h2>
        <ol className="mt-[18px] border-t border-border sm:grid sm:grid-cols-4 sm:gap-x-7">
          {STEPS.map((st, i) => (
            <li
              key={st.title}
              className="grid grid-cols-[34px_1fr] gap-3 border-b border-border py-4 sm:block sm:py-[18px]"
            >
              <span
                aria-hidden="true"
                className="pt-[3px] font-display text-[12px] font-extrabold tabular-nums text-text-3 sm:mb-2 sm:block sm:pt-0"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.02em] text-primary">{st.who}</p>
                <h3 className="mt-[3px] text-[15px] font-extrabold tracking-[-0.02em] text-text-1">{st.title}</h3>
                <p className="mt-1 text-[13px] leading-[1.7] text-text-2">{st.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 왜 ── 없앤 문제를 취소선으로 적고 그 아래 해법을 둔다. */}
      <section className="mx-auto max-w-[1080px] px-5 pt-10 sm:pt-14">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-text-3">왜 포카스테이션인가</p>
        <h2 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1 sm:text-[28px]">
          거래가 무서웠던 이유를
          <br className="sm:hidden" /> 하나씩 없앴어요
        </h2>
        <ul className="mt-[18px] border-t border-border sm:grid sm:grid-cols-2 sm:gap-x-12">
          {FEATURES.map((f) => (
            <li key={f.title} className="border-b border-border py-4">
              <p className="text-[11.5px] font-extrabold text-text-3 line-through decoration-border-2">{f.problem}</p>
              <h3 className="mt-1 text-[15px] font-extrabold tracking-[-0.02em] text-text-1">{f.title}</h3>
              <p className="mt-1 text-[13px] leading-[1.7] text-text-2">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 혜택 ── */}
      <section className="mx-auto max-w-[1080px] px-5 py-10 sm:py-14">
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-text-3">사전 신청 혜택</p>
        <h2 className="mt-2 font-display text-[24px] font-extrabold tracking-[-0.035em] text-text-1 sm:text-[28px]">
          지금 신청하면 드리는 것
        </h2>

        <ul className="mt-[18px] flex flex-col border-t border-border sm:max-w-[640px]">
          {BENEFITS.map((b) => (
            <li key={b.title} className="border-b border-border py-4">
              <h3 className="text-[14px] font-extrabold tracking-[-0.02em] text-text-1">{b.title}</h3>
              <p className="mt-1 text-[13px] leading-[1.7] text-text-2">{b.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href="#apply"
            className={`inline-flex h-12 items-center rounded-[4px] bg-primary px-7 text-[14.5px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
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
