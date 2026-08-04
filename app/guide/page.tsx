import Link from "next/link";
import GuideHero from "@/components/GuideHero";
import GuideTabs from "@/components/GuideTabs";
import GuideTimeline, { type GuideStep } from "@/components/GuideTimeline";
import {
  BellIcon,
  BoxIcon,
  CameraIcon,
  CardIcon,
  CheckCircleIcon,
  GavelIcon,
  SearchIcon,
  ShieldIcon,
  TruckIcon,
  UserCheckIcon,
  WalletIcon,
} from "@/components/GuideIcons";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

export const metadata = {
  title: "이용 가이드 — Pocastation",
  description:
    "회원가입부터 판매 등록, 결제, 구매 확정까지 — 포카스테이션 안전 거래의 모든 흐름을 단계별로 안내합니다.",
};

// 홈페이지 이용 — 거래를 시작하기 전 준비.
const GENERAL_STEPS: GuideStep[] = [
  {
    title: "회원가입 및 본인인증",
    icon: <UserCheckIcon />,
    body: (
      <>
        이메일 · 카카오 · 네이버 · 구글 중 편한 방법으로 가입해요. 가입할 때 이메일 인증과 본인인증을
        마치면 입찰·구매·판매를 시작할 수 있어요.
      </>
    ),
  },
  {
    title: "마이페이지 세팅",
    icon: <CardIcon />,
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
    icon: <BellIcon />,
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
    icon: <CameraIcon />,
    body: (
      <>
        <p>
          경매판매와 즉시판매 중 방식을 고르고, 실물 사진·상품 정보·가격을 순서대로 입력해요. 정확한
          정보일수록 문의와 분쟁이 줄어요.
        </p>
        <p className="mt-2">
          <Link
            href="/guide/sell"
            className={`rounded-r1 text-xs font-bold text-primary hover:text-primary-dark ${FOCUS_RING}`}
          >
            등록 과정 7단계 자세히 보기 →
          </Link>
        </p>
      </>
    ),
  },
  {
    title: "입찰 받고 낙찰",
    icon: <GavelIcon />,
    body: (
      <>
        경매판매는 정한 기간 동안 입찰을 받고, 마감 시각에 최고 입찰자에게 낙찰돼요. 즉시판매는
        구매자가 정한 가격으로 바로 사 가요. 낙찰되면 구매자 카드에서 자동으로 결제가 진행돼요.
      </>
    ),
  },
  {
    title: "안전 배송",
    icon: <BoxIcon />,
    note: "3영업일 이내",
    body: (
      <>
        포토카드가 상하지 않게 탑로더·프로텍터로 포장해 발송하고 운송장 번호를 입력해요.{" "}
        <b className="font-bold text-text-1">2영업일이 지나면 발송 독촉 알림</b>이 가고,{" "}
        <b className="font-bold text-text-1">3영업일까지 발송하지 않으면 주문이 자동 취소</b>돼요
        (주말·공휴일은 세지 않아요).
      </>
    ),
  },
  {
    title: "정산 받기",
    icon: <WalletIcon />,
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
    title: "포카 검색 및 탐색",
    icon: <SearchIcon />,
    body: (
      <>
        스타·멤버·앨범으로 검색하고, 마감임박·인기순으로 정렬해 원하는 포카를 찾아요. 상세 페이지의
        사진과 상태 정보를 꼼꼼히 확인하는 게 좋아요.
      </>
    ),
  },
  {
    title: "입찰 또는 즉시구매",
    icon: <ShieldIcon />,
    body: (
      <>
        <p>
          경매는 1,000원 단위로 입찰하고, 마감 3분 안에 입찰이 들어오면 3분씩 연장돼요(최대 3회).
          즉시판매는 정해진 가격으로 바로 구매할 수 있어요.
        </p>
        <p className="mt-2">
          결제는 미리 등록한 카드로 <b className="font-bold text-text-1">낙찰 즉시 자동</b> 진행되고,
          대금은 구매 확정 전까지 안전하게 보관돼요.
        </p>
      </>
    ),
  },
  {
    title: "배송 조회",
    icon: <TruckIcon />,
    body: (
      <>
        판매자가 발송하면 운송장 번호가 등록돼요. 마이페이지 구매 내역에서 배송 상태를 확인할 수
        있어요.
      </>
    ),
  },
  {
    title: "구매 확정",
    icon: <CheckCircleIcon />,
    body: (
      <>
        물품을 받고 상태를 확인한 뒤 <b className="font-bold text-text-1">구매 확정</b>을 눌러 거래를
        마무리해요. 확정하면 판매자에게 정산되니 반드시 확인 후 눌러 주세요. 문제가 있으면 확정 전에
        반품을 요청할 수 있어요.
      </>
    ),
  },
];

function PanelBody({
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
      <p className="text-center text-sm text-text-3">{intro}</p>
      <GuideTimeline steps={steps} />
      <div className="mt-7 flex justify-center">
        <Link href={ctaHref} className={`flex h-11 items-center px-7 ${PRIMARY_BUTTON_CLASS}`}>
          {ctaLabel}
        </Link>
      </div>
    </>
  );
}

export default function GuidePage() {
  return (
    <>
      <GuideHero
        eyebrow="User Guide"
        title="포카스테이션 이용 가이드"
        description="처음이어도 괜찮아요. 회원가입부터 결제, 구매 확정까지 거래의 모든 단계를 순서대로 안내해 드려요."
      />

      <section className="mx-auto max-w-[880px] px-4 py-10">
        <GuideTabs
          ariaLabel="이용 가이드 종류"
          tabs={[
            {
              id: "general",
              label: "홈페이지 이용 가이드",
              panel: (
                <PanelBody
                  intro="안전한 거래를 시작하기 전, 딱 3가지만 준비하면 돼요."
                  steps={GENERAL_STEPS}
                  ctaHref="/signup"
                  ctaLabel="지금 시작하기 →"
                />
              ),
            },
            {
              id: "seller",
              label: "판매자 등록 가이드",
              panel: (
                <PanelBody
                  intro="등록부터 정산까지, 판매는 4단계로 끝나요."
                  steps={SELLER_STEPS}
                  ctaHref="/auctions/new"
                  ctaLabel="판매 등록하러 가기 →"
                />
              ),
            },
            {
              id: "buyer",
              label: "구매자 구매 가이드",
              panel: (
                <PanelBody
                  intro="검색부터 구매 확정까지, 구매도 4단계면 충분해요."
                  steps={BUYER_STEPS}
                  ctaHref="/auctions"
                  ctaLabel="경매 둘러보기 →"
                />
              ),
            },
          ]}
        />
      </section>

      {/* ── 안전 거래 팁 ── */}
      <section className="mx-auto max-w-[880px] px-4 pb-16" aria-labelledby="safe-tips">
        <div className="overflow-hidden rounded-r4 border border-border bg-surface shadow-card">
          <div className="flex items-center gap-3 border-b border-border bg-primary-soft px-5 py-4">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r2 bg-primary text-white"
            >
              <ShieldIcon />
            </span>
            <div>
              <h2 id="safe-tips" className="font-display text-base font-extrabold text-text-1">
                안전 거래 팁
              </h2>
              <p className="mt-0.5 text-xs text-text-3">
                거래 전 1분만 읽어도 분쟁을 크게 줄일 수 있어요.
              </p>
            </div>
          </div>

          {/* 세 칼럼이 그냥 나란히 있으면 문단 길이가 제각각이라 흐트러져 보인다.
              칼럼 사이에 헤어라인을 넣어 경계를 세운다(디자인 규칙: 뉴트럴 + 헤어라인). */}
          <div className="grid gap-5 p-5 sm:grid-cols-3 sm:gap-0 sm:[&>*+*]:border-l sm:[&>*+*]:border-border sm:[&>*+*]:pl-5 sm:[&>*:not(:last-child)]:pr-5">
            <div>
              <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-text-1">
                <span aria-hidden="true" className="text-primary">
                  ✓
                </span>
                상태, 꼭 확인하세요
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed text-text-2">
                <li>· 스크래치, 눌림, 휨, 모서리 까짐은 대표적인 하자예요.</li>
                <li>· 판매자는 하자 부위를 밝은 곳에서 근접 촬영해 등록해요.</li>
                <li>· 표기되지 않은 하자는 반품·분쟁 사유가 될 수 있어요.</li>
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-text-1">
                <span aria-hidden="true" className="text-primary">
                  ✓
                </span>
                결제는 플랫폼 안에서만
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed text-text-2">
                <li>· 대금은 구매 확정 전까지 안전하게 보관돼요.</li>
                <li>· 구매 확정을 눌러야 판매자에게 정산되니, 물품 확인 전에는 누르지 마세요.</li>
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-text-1">
                <span aria-hidden="true" className="text-accent">
                  !
                </span>
                외부 거래는 보호받지 못해요
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed text-text-2">
                <li>· 계좌 직거래나 다른 메신저 결제 유도는 사기 위험이 높아요.</li>
                <li>· 플랫폼 보호 대상이 아니니, 유도하는 상대는 즉시 신고해 주세요.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-border bg-surface-2 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-xs text-text-3">더 궁금한 점이 있다면 자주 묻는 질문을 확인해 보세요.</p>
            <Link
              href="/faq"
              className={`shrink-0 rounded-r1 text-xs font-bold text-primary hover:text-primary-dark ${FOCUS_RING}`}
            >
              자주 묻는 질문 보기 →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
