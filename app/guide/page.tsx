import Link from "next/link";
import GuideSteps, { type GuideStep } from "@/components/GuideSteps";
import GuideTabs from "@/components/GuideTabs";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = {
  title: "이용 가이드 — Pocastation",
  description:
    "회원가입부터 판매 등록, 결제, 구매 확정까지 — 포카스테이션 안전 거래의 모든 흐름을 단계별로 안내합니다.",
};

// 홈페이지 이용 — 거래를 시작하기 전 준비.
const GENERAL_STEPS: GuideStep[] = [
  {
    title: "회원가입 · 본인인증",
    body: (
      <>
        이메일로 가입하면 <b className="font-bold text-text-1">받은 인증 메일의 링크를 눌러야 가입이
        끝나요.</b> 카카오 · 네이버 · 구글은 링크를 누를 필요 없이 바로 가입돼요. 이어서 본인인증까지
        마치면 입찰 · 구매 · 판매를 시작할 수 있어요.
      </>
    ),
  },
  {
    title: "배송지 등록",
    note: "미리 해두면 편해요",
    body: (
      <>
        마이페이지에서 기본 배송지를 등록해 두세요. 낙찰되면{" "}
        <b className="font-bold text-text-1">기본 배송지로 자동 확정</b>돼서 따로 입력할 일이 없어요.
        등록해 두지 않았다면 낙찰 후에 입력하면 됩니다.
      </>
    ),
  },
  {
    title: "알림 설정",
    body: (
      <>
        입찰 추월, 낙찰, 결제, 발송 같은 소식은 알림함으로 와요. 종류별로 끄고 켤 수 있고, 관심 있는
        경매만 따로 지정할 수도 있어요.
      </>
    ),
  },
];

// 판매자 — 등록부터 정산까지.
const SELLER_STEPS: GuideStep[] = [
  {
    title: "판매 등록하기",
    body: (
      <>
        경매판매와 즉시판매 중 방식을 고르고, 실물 사진 · 상품 정보 · 가격을 순서대로 입력해요. 정확한
        정보일수록 문의와 분쟁이 줄어요.{" "}
        <Link
          href="/guide/sell"
          className={`font-bold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary ${FOCUS_RING}`}
        >
          등록 7단계 자세히 보기
        </Link>
      </>
    ),
  },
  {
    title: "입찰 받고 낙찰",
    body: (
      <>
        경매판매는 정한 기간 동안 입찰을 받고, 마감 시각에 최고 입찰자에게 낙찰돼요. 즉시판매는
        구매자가 정한 가격으로 바로 사 가요. 낙찰되면 구매자 카드에서 자동으로 결제가 진행돼요.
      </>
    ),
  },
  {
    title: "포장하고 발송하기",
    note: "3영업일 이내",
    body: (
      <>
        포토카드가 상하지 않게 탑로더 · 프로텍터로 포장해 발송하고 운송장 번호를 입력해요.{" "}
        <b className="font-bold text-text-1">2영업일이 지나면 발송 독촉 알림</b>이 가고,{" "}
        <b className="font-bold text-text-1">3영업일까지 발송하지 않으면 주문이 자동 취소</b>돼요
        (주말 · 공휴일은 세지 않아요).
      </>
    ),
  },
  {
    title: "정산 받기",
    body: (
      <>
        구매자가 구매 확정을 누르면 수수료를 뺀 정산 대금이 등록된 계좌로 입금돼요. 별도 신청 절차는
        없고, 카드사 정산 주기에 따라 실제 입금까지 영업일 기준으로 며칠이 걸릴 수 있어요.
      </>
    ),
  },
];

// 구매자 — 검색부터 구매 확정까지.
const BUYER_STEPS: GuideStep[] = [
  {
    title: "포카 검색하기",
    body: (
      <>
        스타 · 멤버 · 앨범으로 검색하고, 마감임박 · 인기순으로 정렬해 원하는 포카를 찾아요. 상세
        페이지의 사진과 상태 등급을 꼼꼼히 확인하는 게 좋아요.
      </>
    ),
  },
  {
    title: "입찰 또는 즉시구매",
    body: (
      <>
        경매는 1,000원 단위로 입찰하고, 마감 3분 안에 입찰이 들어오면 3분씩 연장돼요(최대 3회).
        즉시판매는 정해진 가격으로 바로 구매할 수 있어요. 결제는 미리 등록한 카드로{" "}
        <b className="font-bold text-text-1">낙찰 즉시 자동</b> 진행되고, 대금은 구매 확정 전까지
        안전하게 보관돼요.
      </>
    ),
  },
  {
    title: "배송 조회",
    body: (
      <>
        판매자가 발송하면 운송장 번호가 등록돼요. 마이페이지 구매 내역에서 배송 상태를 확인할 수
        있어요.
      </>
    ),
  },
  {
    title: "구매 확정",
    note: "확정 전 반품 요청 가능",
    body: (
      <>
        물품을 받고 상태를 확인한 뒤 <b className="font-bold text-text-1">구매 확정</b>을 눌러 거래를
        마무리해요. 확정하면 판매자에게 정산되니 반드시 확인 후 눌러 주세요.
      </>
    ),
  },
];

// 탭마다 CTA 한 개. 버튼을 여러 개 늘어놓으면 어디로 가야 할지가 오히려 흐려진다.
function Panel({
  intro,
  steps,
  ctaHref,
  ctaLabel,
}: {
  intro: string;
  steps: GuideStep[];
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <>
      <p className="mt-6 text-[13px] text-text-3">{intro}</p>
      <GuideSteps steps={steps} />
      <div className="mt-8">
        <Link
          href={ctaHref}
          className={`inline-flex h-12 items-center rounded-[4px] bg-primary px-8 text-[14px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
        >
          {ctaLabel}
        </Link>
      </div>
    </>
  );
}

// 안전 거래 팁 — 3칼럼 카드는 어느 서비스에나 붙는 템플릿으로 읽힌다.
// 번호 · 제목 · 짧은 설명 · 구분선의 목록으로 바꾼다.
const SAFETY = [
  {
    t: "상태를 먼저 본다",
    d: "스크래치 · 눌림 · 휨 · 모서리 까짐이 대표적인 하자예요. 판매자는 하자 부위를 근접 촬영해 등록하고, 표기되지 않은 하자는 반품 · 분쟁 사유가 될 수 있어요.",
  },
  {
    t: "결제는 플랫폼 안에서만",
    d: "대금은 구매 확정 전까지 안전하게 보관돼요. 구매 확정을 눌러야 판매자에게 정산되니, 물품을 확인하기 전에는 누르지 마세요.",
  },
  {
    t: "외부 거래는 보호받지 못한다",
    d: "계좌 직거래나 다른 메신저 결제 유도는 사기 위험이 높아요. 플랫폼 보호 대상이 아니니, 유도하는 상대는 즉시 신고해 주세요.",
  },
];

export default function GuidePage() {
  return (
    <>
      {/* ── 첫 화면 ── 문서 제목이 아니라 브랜드 문장으로 연다.
          다만 화면을 다 잡아먹는 히어로는 만들지 않는다 — 바로 아래 탭이 같이 보여야 한다. */}
      <div className="mx-auto max-w-[820px] px-5 pt-11 pb-14 sm:pt-14">
        <header>
          <span aria-hidden="true" className="block h-[3px] w-7 bg-primary" />
          <h1 className="mt-5 font-display text-[30px] font-extrabold leading-[1.16] tracking-[-0.045em] text-text-1 sm:text-[38px]">
            포카스테이션,
            <br />
            이렇게 거래해요
          </h1>
          <p className="mt-4 max-w-[30rem] text-[14px] leading-[1.75] text-text-2">
            처음이어도 괜찮아요. 준비 · 판매 · 구매까지 거래 흐름을 정리했어요.
          </p>
        </header>

        <div className="mt-9">
          <GuideTabs
            ariaLabel="이용 가이드 종류"
            tabs={[
              {
                id: "general",
                label: "시작하기",
                panel: (
                  <Panel
                    intro="거래를 시작하기 전 준비할 건 세 가지예요."
                    steps={GENERAL_STEPS}
                    ctaHref="/signup"
                    ctaLabel="회원가입하고 시작하기"
                  />
                ),
              },
              {
                id: "seller",
                label: "판매하기",
                panel: (
                  <Panel
                    intro="등록부터 정산까지 네 단계로 끝나요."
                    steps={SELLER_STEPS}
                    ctaHref="/auctions/new"
                    ctaLabel="판매 등록하러 가기"
                  />
                ),
              },
              {
                id: "buyer",
                label: "구매하기",
                panel: (
                  <Panel
                    intro="검색부터 구매 확정까지 네 단계면 충분해요."
                    steps={BUYER_STEPS}
                    ctaHref="/auctions"
                    ctaLabel="경매 둘러보기"
                  />
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* ── 안전 거래 팁 ── 본문과 성격이 다른 '읽고 넘어가는' 블록이라 지면을 바꾼다. */}
      <section className="border-t border-border bg-surface-2" aria-labelledby="safe-tips">
        <div className="mx-auto max-w-[820px] px-5 py-12 sm:py-14">
          <h2
            id="safe-tips"
            className="font-display text-[19px] font-extrabold tracking-[-0.03em] text-text-1"
          >
            안전 거래 팁
          </h2>
          <p className="mt-1.5 text-[12.5px] text-text-3">
            거래 전 1분만 읽어도 분쟁을 크게 줄일 수 있어요.
          </p>

          <ol className="mt-6">
            {SAFETY.map(({ t, d }, i) => (
              <li
                key={t}
                className="flex gap-4 border-t border-border-2/60 py-4 last:border-b last:border-border-2/60"
              >
                <span
                  aria-hidden="true"
                  className="mt-[3px] font-display text-[11px] font-extrabold tabular-nums text-text-3"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-extrabold tracking-[-0.02em] text-text-1">{t}</p>
                  <p className="mt-1 max-w-[42rem] text-[12.5px] leading-[1.75] text-text-2">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto flex max-w-[820px] flex-wrap items-baseline justify-between gap-2 px-5 py-8">
        <p className="text-[12.5px] text-text-3">더 궁금한 점이 있다면</p>
        <Link
          href="/faq"
          className={`text-[13px] font-bold text-text-1 underline decoration-border-2 underline-offset-4 transition-colors hover:decoration-text-1 ${FOCUS_RING}`}
        >
          자주 묻는 질문 보기
        </Link>
      </div>
    </>
  );
}
