import Link from "next/link";
import GuidePageHeader from "@/components/GuidePageHeader";
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
        이메일 · 카카오 · 네이버 · 구글 중 편한 방법으로 가입해요. 가입할 때 이메일 인증과 본인인증을
        마치면 입찰 · 구매 · 판매를 시작할 수 있어요.
      </>
    ),
  },
  {
    title: "마이페이지 세팅",
    note: "입찰 전 필수",
    body: (
      <>
        배송지와 결제수단(카드)을 미리 등록해 두세요. 경매는{" "}
        <b className="font-bold text-text-1">낙찰 즉시 자동으로 결제</b>되기 때문에, 카드가 등록돼
        있어야 입찰할 수 있어요.
      </>
    ),
  },
  {
    title: "알림 확인",
    body: (
      <>
        입찰 추월, 낙찰, 결제, 발송 같은 소식은 알림함으로 와요. 마이페이지의 알림 설정에서 종류별로
        끄고 켤 수 있고, 관심 있는 경매만 따로 지정할 수도 있어요.
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
    title: "안전 배송",
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
    title: "포카 검색 · 탐색",
    body: (
      <>
        스타 · 멤버 · 앨범으로 검색하고, 마감임박 · 인기순으로 정렬해 원하는 포카를 찾아요. 상세
        페이지의 사진과 상태 정보를 꼼꼼히 확인하는 게 좋아요.
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
      <p className="mt-7 text-[13px] text-text-3">{intro}</p>
      <GuideSteps steps={steps} />
      <div className="mt-8">
        <Link
          href={ctaHref}
          className={`inline-flex h-12 items-center rounded-[3px] bg-primary px-8 text-[14px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
        >
          {ctaLabel}
        </Link>
      </div>
    </>
  );
}

// 안전 거래 팁 — 본문과 성격이 다른 '읽고 넘어가는' 블록이라 배경 띠로 분리한다.
// 테두리 카드를 하나 더 얹는 대신 지면 자체를 바꿔서 구분한다.
const SAFETY = [
  {
    title: "상태를 먼저 본다",
    lines: [
      "스크래치 · 눌림 · 휨 · 모서리 까짐이 대표적인 하자예요.",
      "판매자는 하자 부위를 밝은 곳에서 근접 촬영해 등록해요.",
      "표기되지 않은 하자는 반품 · 분쟁 사유가 될 수 있어요.",
    ],
  },
  {
    title: "결제는 플랫폼 안에서",
    lines: [
      "대금은 구매 확정 전까지 안전하게 보관돼요.",
      "구매 확정을 눌러야 판매자에게 정산되니, 물품을 확인하기 전에는 누르지 마세요.",
    ],
  },
  {
    title: "외부 거래는 보호받지 못한다",
    lines: [
      "계좌 직거래나 다른 메신저 결제 유도는 사기 위험이 높아요.",
      "플랫폼 보호 대상이 아니니, 유도하는 상대는 즉시 신고해 주세요.",
    ],
  },
];

export default function GuidePage() {
  return (
    <>
      <div className="mx-auto max-w-[820px] px-5 pt-10 pb-14 sm:pt-14">
        <GuidePageHeader
          kicker="가이드"
          title={
            <>
              포카스테이션,
              <br className="hidden sm:block" /> 이렇게 거래해요
            </>
          }
          lead="처음이어도 괜찮아요. 준비 · 판매 · 구매 세 가지 흐름으로 나눠 정리했어요."
          meta="읽는 데 약 3분"
        />

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

      {/* ── 안전 거래 팁 ── */}
      <section className="border-t border-border bg-surface-2" aria-labelledby="safe-tips">
        <div className="mx-auto max-w-[820px] px-5 py-12 sm:py-14">
          <h2
            id="safe-tips"
            className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-text-1"
          >
            안전 거래 팁
          </h2>
          <p className="mt-1.5 text-[12.5px] text-text-3">
            거래 전 1분만 읽어도 분쟁을 크게 줄일 수 있어요.
          </p>

          <div className="mt-7 grid gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border-2 sm:[&>*+*]:pl-6 sm:[&>*:not(:last-child)]:pr-6">
            {SAFETY.map((col) => (
              <div key={col.title}>
                <h3 className="text-[13px] font-extrabold tracking-[-0.01em] text-text-1">
                  {col.title}
                </h3>
                <ul className="mt-2.5 flex flex-col gap-2 text-[12.5px] leading-[1.7] text-text-2">
                  {col.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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
