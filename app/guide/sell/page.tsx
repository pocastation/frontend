import Link from "next/link";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = {
  title: "판매 등록 가이드 — Pocastation",
  description:
    "판매 방식 선택부터 사진 인증까지 — 포카스테이션 판매 등록 6단계를 항목별로 상세히 안내합니다.",
};

// 등록 화면(app/auctions/new)의 실제 스텝 순서와 1:1로 맞춘다.
// 스텝이 바뀌면 이 배열도 함께 고쳐야 한다 — 화면과 가이드가 어긋나면 가이드가 오히려 혼란을 준다.
const STEPS = [
  { id: "step-1", label: "판매 방식" },
  { id: "step-2", label: "카테고리 · 소개" },
  { id: "step-3", label: "상품 정보" },
  { id: "step-4", label: "가격 · 기간" },
  { id: "step-5", label: "사진 · 영상" },
  { id: "step-6", label: "사진 인증" },
];

/**
 * 단계 머리말.
 *
 * 지면 구성은 단계마다 다르지만(선택 타일 · 폼 · 강조 패널 · 슬롯 · 산문 · 미니 플로우)
 * 번호와 제목의 **조판 규칙만은** 공유한다. 일관성은 여기까지고, 그 아래부터는 반복하지 않는다.
 *
 * 단계 안의 두 번째 입력(사진 단계의 영상)은 이 머리말을 쓰지 않는다 — `h3` + 헤어라인으로
 * 한 급 낮춰야 "별도 단계가 아니라 같은 단계의 뒷부분"으로 읽힌다.
 */
function StepHead({
  n,
  title,
  lead,
}: {
  n: number;
  title: string;
  lead?: string;
}) {
  return (
    <div className="border-t border-text-1/25 pt-4">
      <span
        aria-hidden="true"
        className="block font-display text-[11px] font-extrabold tabular-nums tracking-[0.08em] text-text-3"
      >
        {String(n).padStart(2, "0")}
      </span>
      <h2 className="mt-1.5 font-display text-[21px] font-extrabold tracking-[-0.035em] text-text-1">
        <span className="sr-only">{n}단계. </span>
        {title}
      </h2>
      {lead && (
        <p className="mt-2.5 max-w-[34rem] text-[13.5px] leading-[1.7] text-text-2">{lead}</p>
      )}
    </div>
  );
}

// 입력 항목 이름. 아래 입력 UI보다 작지만 더 굵다 — 라벨은 짧게 읽히고 값은 크게 보여야 한다.
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[13px] font-extrabold tracking-[-0.01em] text-text-1">{children}</span>
      {required && (
        <>
          <span aria-hidden="true" className="text-[13px] font-extrabold text-primary">
            *
          </span>
          <span className="sr-only">필수</span>
        </>
      )}
    </span>
  );
}

// 입력 아래 도움말. 안내를 박스로 만들지 않고 여기에 녹인다.
function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[12px] leading-[1.65] text-text-3">{children}</p>;
}

/**
 * 입력 칸의 겉모습만 옮긴 것. 실제 폼이 아니라 미리보기다.
 * helper(12px)보다 확실히 커야(14px · 높이 44px) "여기가 입력하는 곳"으로 읽힌다.
 */
function InputMock({
  children,
  filled,
  after,
  tall,
}: {
  children: React.ReactNode;
  // 값이 들어찬 상태 — 플레이스홀더와 실제 입력값의 차이를 보여준다.
  filled?: boolean;
  after?: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`mt-2 flex justify-between rounded-[4px] border border-border-2 bg-white px-4 text-[14px] ${
        tall ? "h-[76px] items-start py-3" : "h-11 items-center"
      } ${filled ? "font-medium text-text-1" : "text-text-3"}`}
    >
      <span>{children}</span>
      {after}
    </div>
  );
}

const SOURCES = ["앨범 포함", "예약 특전", "팬사인회", "럭키드로우", "기타"];
const GRADES = [
  { g: "S", d: "미사용" },
  { g: "A", d: "미세한 흔적" },
  { g: "B", d: "사용감 있음" },
  { g: "C", d: "뚜렷한 하자" },
];
/**
 * 🔴 이 화면은 **낡은 경매 모델을 가르치고 있었다**(#437 최신화). 거래 개편으로 폐기된
 * 내용을 게시본 이용약관·운영정책에 맞춰 고친 것들이다.
 *
 * | 있던 말 | 실제 |
 * | --- | --- |
 * | 판매 기간 1일·3일·7일 중 선택 | **7일 고정** (정책 제7조 ①) |
 * | 마감 3분 내 제안 시 3분씩 자동 연장 | **폐기** — 그런 기능이 없다 |
 * | 마감 시각에 최고가와 자동 성사 | **판매자가 골라야 성립** (정책 제10조 ①) |
 * | 등록한 카드로 자동 결제 | **가상계좌·계좌이체 48시간** (정책 제11조 ①) |
 * | 등록하면 바로 노출, 검수는 「경우에 따라」 | **항상 관리자 승인 후 게시** (정책 제5조) |
 */
const AFTER = [
  {
    k: "관리자 승인을 거쳐 올라가요",
    v: "등록을 마치면 관리자가 소유 인증을 확인한 뒤 게시돼요. 승인 전에는 다른 회원에게 보이지 않고, 반려되면 사유가 안내돼요.",
  },
  {
    k: "가격 제안을 받아요",
    v: "판매 기간은 7일이고, 종료 1일 전부터 +7일 · +3일까지 두 번 연장해 최대 17일이에요. 제안 금액은 판매자만 보고, 다른 구매자에게는 제안한 사람 수만 보여요.",
  },
  {
    k: "제안 하나를 고르면 성사돼요",
    v: "받은 제안 중 하나를 직접 골라야 거래가 성사돼요. 기간이 끝나도 자동으로 성사되지 않고, 남은 제안은 모두 사라져요.",
  },
  {
    k: "구매자가 48시간 안에 입금해요",
    v: "성사되는 즉시 구매자에게 가상계좌가 발급돼요. 기한 안에 입금이 없으면 거래가 취소되고 매물이 다시 게시되며, 남은 제안 중에서 다시 고를 수 있어요.",
  },
  {
    k: "발송하고 운송장을 넣어요",
    v: "입금을 확인한 날부터 3영업일까지 보내지 않으면 주문이 자동 취소돼요. 주말 · 공휴일은 세지 않아요.",
  },
  {
    k: "구매 확정되면 정산돼요",
    v: "수수료를 뺀 금액이 등록된 계좌로 입금돼요. 구매자가 확정하지 않아도 배송 완료 후 3일에 자동 확정돼요. 별도 신청 절차는 없어요.",
  },
];

export default function SellGuidePage() {
  return (
    <>
      <div className="mx-auto max-w-[820px] px-5 pt-9 pb-16 sm:pt-12">
        {/* ── 머리말 ── 브랜드 선언이 아니라 실무 안내라 담백하게 간다. */}
        <header>
          <p className="text-[12px] font-bold text-text-3">판매자 가이드</p>
          <h1 className="mt-2 font-display text-[27px] font-extrabold leading-[1.15] tracking-[-0.04em] text-text-1 sm:text-[32px]">
            판매 등록, 무엇을 입력하나요
          </h1>
          <p className="mt-3.5 max-w-[33rem] text-[13.5px] leading-[1.75] text-text-2">
            등록 화면에 나오는 순서 그대로예요. 각 단계에서 실제로 무엇을 고르고 적는지 미리 보고
            시작하면 훨씬 빨라요.
          </p>
          <p className="mt-3 text-[12px] text-text-3">
            총 6단계 · 로그인 후 헤더의 ‘판매 등록’에서 시작해요 ·{" "}
            <span aria-hidden="true" className="font-extrabold text-primary">
              *
            </span>{" "}
            는 필수 항목
          </p>
        </header>

        {/* 차례 — 알약 링크가 아니라 밑줄 항목. 목차는 조용해야 본문이 산다. */}
        <nav aria-label="단계 바로가기" className="mt-7 grid grid-cols-2 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`flex items-baseline gap-2 border-b border-border py-2.5 text-[12.5px] text-text-2 transition-colors hover:text-primary ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className="font-display text-[11px] font-extrabold tabular-nums text-text-3"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.label}
            </a>
          ))}
        </nav>

        {/* ── 01 판매 방식 ── 고르는 단계라 고를 수 있게 생긴 타일을 놓는다.
            왼쪽이 선택된 상태다: 보라 테두리 + 라디오 채움 + 보라 제목. */}
        <section id="step-1" className="mt-12 scroll-mt-24">
          <StepHead
            n={1}
            title="판매 방식"
            lead="여기서 고른 방식에 따라 4단계의 가격 입력 항목이 달라져요."
          />
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-[6px] border border-primary bg-white px-4 py-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-[15px] w-[15px] items-center justify-center rounded-full border-[1.5px] border-primary"
                >
                  <span className="h-[7px] w-[7px] rounded-full bg-primary" />
                </span>
                <b className="text-[14.5px] font-extrabold tracking-[-0.02em] text-primary">
                  제안판매
                </b>
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.7] text-text-2">
                7일 동안 가격 제안을 받고, 그중 하나를 직접 골라 판매해요. 희소성 있는 포카라면
                시세보다 높은 금액에 거래될 수 있어요.
              </p>
            </div>
            <div className="rounded-[6px] border border-border-2 bg-white px-4 py-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-[15px] w-[15px] rounded-full border-[1.5px] border-border-2"
                />
                <b className="text-[14.5px] font-extrabold tracking-[-0.02em] text-text-1">
                  즉시판매
                </b>
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.7] text-text-2">
                정한 가격으로 바로 구매할 수 있게 올려요. 시세가 안정적인 포카를 빠르게 팔 때 좋아요.
              </p>
            </div>
          </div>
        </section>

        {/* ── 02 카테고리 · 소개 ── 순수하게 적는 단계라 폼만 남긴다.
            모바일에서는 화면 끝까지 번지는 회색 바탕을 깔아 '입력 구역'임을 지면으로 표시한다. */}
        <section id="step-2" className="mt-14 scroll-mt-24">
          <StepHead
            n={2}
            title="카테고리 · 소개"
            lead="어떤 포카인지 구매자가 한눈에 알 수 있게 적어요."
          />
          <div className="-mx-5 mt-5 bg-surface-2 px-5 py-6 sm:mx-0 sm:rounded-[6px] sm:px-6">
            <div className="flex flex-col gap-5">
              <div>
                <Label required>스타</Label>
                <InputMock
                  after={
                    <span aria-hidden="true" className="text-[13px] text-text-3">
                      검색
                    </span>
                  }
                >
                  그룹명을 검색하세요
                </InputMock>
                <Help>검색해서 선택하면 검색 · 필터에 정확하게 연결돼요.</Help>
              </div>

              <div>
                <Label>멤버</Label>
                <InputMock
                  after={
                    <span aria-hidden="true" className="text-[10px] text-text-3">
                      ▾
                    </span>
                  }
                >
                  멤버 선택
                </InputMock>
                <Help>지정하면 그 멤버를 찾는 구매자에게 더 잘 노출돼요.</Help>
              </div>

              <div>
                <Label required>제목</Label>
                <InputMock filled>정국 Proof 위버스 특전 포카</InputMock>
                <Help>멤버명 · 앨범 · 버전을 담아 구체적으로 적을수록 검색에 유리해요.</Help>
              </div>

              <div>
                <Label>상품 설명</Label>
                <InputMock tall>구매 경로, 앨범명, 보관 방식 등을 적어주세요</InputMock>
                <Help>하자와 상태를 있는 그대로 적는 편이 결국 문의와 분쟁을 줄여요.</Help>
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 상품 정보 ── 전부 고르는 항목이라 고를 수 있는 값을 그대로 펼친다.
            선택된 값 하나씩만 보라로 켜 둔다 — 선택 상태가 어떻게 보이는지도 정보다. */}
        <section id="step-3" className="mt-14 scroll-mt-24">
          <StepHead n={3} title="상품 정보" lead="구매자가 가격 다음으로 오래 들여다보는 정보예요." />

          <div className="mt-5 flex flex-col gap-6">
            <div>
              <Label>출처</Label>
              <div aria-hidden="true" className="mt-2 flex flex-wrap gap-1.5">
                {SOURCES.map((s, i) => (
                  <span
                    key={s}
                    className={`rounded-[4px] border px-3 py-2 text-[12.5px] font-semibold ${
                      i === 0 ? "border-primary text-primary" : "border-border-2 text-text-2"
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <Help>포카를 얻은 경로를 골라요. 앨범 포함과 특전은 시세가 다르게 형성돼요.</Help>
            </div>

            <div>
              <Label>상태 등급</Label>
              <div aria-hidden="true" className="mt-2 grid grid-cols-4 gap-1.5">
                {GRADES.map(({ g, d }, i) => (
                  <div
                    key={g}
                    className={`rounded-[4px] border px-2 py-2.5 text-center ${
                      i === 0 ? "border-primary" : "border-border-2"
                    }`}
                  >
                    <span
                      className={`block font-display text-[16px] font-extrabold ${
                        i === 0 ? "text-primary" : "text-text-1"
                      }`}
                    >
                      {g}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-tight text-text-3">{d}</span>
                  </div>
                ))}
              </div>
              <Help>고른 등급은 상세 페이지에 그대로 표시돼요.</Help>
            </div>

            <div>
              <Label>미개봉 여부</Label>
              <div aria-hidden="true" className="mt-2 flex items-center gap-2.5">
                <span className="h-[18px] w-[18px] rounded-[3px] border border-border-2 bg-white" />
                <span className="text-[13px] text-text-2">미개봉 상품이에요</span>
              </div>
            </div>
          </div>

          {/* 이 페이지 통틀어 강조 영역은 두 곳뿐이다. 나머지 설명은 전부 helper로 내렸다. */}
          <p className="mt-6 border-l-[3px] border-accent pl-4 text-[13px] leading-[1.75] text-text-2">
            <b className="font-extrabold text-text-1">하자는 반드시 알려주세요.</b> 고지하지 않은
            하자는 반품 · 분쟁 사유가 되고 판매자에게 불리하게 작용해요. 밝은 곳에서 하자 부위를 근접
            촬영해 사진에도 함께 담아주세요.
          </p>
        </section>

        {/* ── 04 가격 · 판매 기간 ── 판매자가 가장 신경 쓰는 단계라 이 페이지에서 유일하게
            테두리 패널로 세운다. 카드를 아예 안 쓰는 게 목적이 아니라, 카드가 값을 하는
            자리에만 쓰는 게 목적이다. */}
        <section id="step-4" className="mt-14 scroll-mt-24">
          <StepHead n={4} title="가격 · 판매 기간" />
          <div className="mt-5 rounded-[6px] border border-border-2 bg-white p-5 sm:p-6">
            <p className="text-[11px] font-extrabold tracking-[0.06em] text-text-3">제안판매</p>

            <div className="mt-4 flex flex-col gap-5">
              <div>
                <Label required>최소 제안가</Label>
                <div
                  aria-hidden="true"
                  className="mt-2 flex h-12 items-center justify-between rounded-[4px] border border-border-2 px-4"
                >
                  <span className="font-display text-[17px] font-extrabold tabular-nums text-text-1">
                    12,000
                  </span>
                  <span className="text-[13px] text-text-3">원</span>
                </div>
                <Help>
                  최저 <span className="tabular-nums">5,000원</span>부터{" "}
                  <span className="tabular-nums">500원</span> 단위로 넣어요. 너무 높으면 제안 없이 끝날 수
                  있어 시세보다 살짝 낮게 잡는 편이 유리해요.
                </Help>
              </div>

              {/* 🔴 1일·3일·7일 선택 UI를 그리고 있었다. 등록 폼에서 그 선택은 없어졌고
                  판매 기간은 7일 고정이다 — 화면에 없는 입력을 가이드가 보여주면 안 된다. */}
              <div>
                <Label>판매 기간</Label>
                <div
                  aria-hidden="true"
                  className="mt-2 flex h-10 items-center rounded-[4px] border border-border-2 px-4 text-[13px] font-bold tabular-nums text-text-2"
                >
                  7일
                </div>
                <Help>
                  고정이라 고르지 않아요. 종료 <span className="tabular-nums">1일</span> 전부터{" "}
                  <span className="tabular-nums">+7일</span> ·{" "}
                  <span className="tabular-nums">+3일</span>까지 두 번 연장해 최대{" "}
                  <span className="tabular-nums">17일</span>이에요. 기간이 끝나도 자동으로 성사되지
                  않고, 받은 제안 중 하나를 직접 골라야 거래가 성립해요.
                </Help>
              </div>

            </div>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-[11px] font-extrabold tracking-[0.06em] text-text-3">즉시판매</p>
              <div className="mt-3">
                <Label required>즉시판매가</Label>
                <Help>
                  구매자가 바로 결제하는 확정 가격이에요. 단위 규칙은 최소 제안가와 같고, 판매 기간은
                  입력하지 않아요.
                </Help>
              </div>
            </div>
          </div>
          <Help>배송비는 판매자 부담이니 감안해서 가격을 정해주세요.</Help>
        </section>

        {/* ── 05 사진 · 영상 ── 이 서비스에서 가장 중요한 입력. 설명 대신 슬롯 자체를 보여준다.
            등록 화면에서 두 입력이 한 단계로 합쳐졌으므로(#279) 여기도 한 절로 붙인다. */}
        <section id="step-5" className="mt-14 scroll-mt-24">
          <StepHead
            n={5}
            title="사진 · 영상"
            lead="구매자가 가장 오래 보는 정보예요. 사진 3~6장과 틸팅 영상 1개를 한 단계에서 올려요. 첫 장이 목록에 걸리는 대표사진이 돼요."
          />
          <div aria-hidden="true" className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[3px] text-[10px] font-bold ${
                  i === 0
                    ? "border border-current bg-surface-2 text-text-1"
                    : i < 3
                      ? "border border-dashed border-border-2 text-text-3"
                      : "border border-dashed border-border-2/60 text-text-3/60"
                }`}
              >
                {i === 0 ? "대표" : i + 1}
              </div>
            ))}
          </div>
          <Help>
            3장까지는 반드시 채워야 하고, 나머지 세 칸은 선택이에요. 앞 · 뒷면, 모서리 네 곳, 하자 부위
            근접샷을 밝은 곳에서 찍으면 문의와 분쟁이 크게 줄어요.
          </Help>

          {/* 슬리브 — 요령이지만 실제로 분쟁을 만드는 지점이라 helper보다 한 칸 올려 쓴다. */}
          <p className="mt-5 max-w-[34rem] text-[13px] leading-[1.75] text-text-2">
            <b className="font-extrabold text-text-1">슬리브 · 탑로더에서 꺼내고 찍어주세요.</b> 비닐에
            생긴 반사 · 흠집 · 먼지가 카드 자체의 상태로 오해받아요. 상태를 좋게 보이려고 씌운 채
            찍어도 받는 사람은 결국 실물을 보게 되고, 그 차이가 그대로 분쟁이 됩니다.
          </p>

          <p className="mt-6 border-l-[3px] border-accent pl-4 text-[13px] leading-[1.75] text-text-2">
            <b className="font-extrabold text-text-1">도용 사진은 등록하지 마세요.</b> 타인의 사진을
            사용한 매물은 신고 대상이며, 확인되면 판매가 제한될 수 있어요. 반드시 직접 촬영한 실물
            사진을 올려주세요.
          </p>

          {/* 영상 — 같은 단계 안의 두 번째 입력이라 헤어라인으로 나누고 제목을 낮춘다. */}
          <div className="mt-8 border-t border-border pt-5">
            <h3 className="font-display text-[15px] font-extrabold tracking-[-0.03em] text-text-1">
              틸팅 영상
            </h3>
            <p className="mt-2 max-w-[34rem] text-[13.5px] leading-[1.8] text-text-2">
              포카를 손에 들고 앞뒤로 천천히 돌리며 <b className="font-bold text-text-1">10~15초</b>로
              찍어주세요. 홀로그램 · 코팅 상태처럼 사진으로는 판단하기 어려운 부분이 영상에서 드러나요.
              조명 아래에서 각도를 바꿔가며 찍으면 표면 상태가 잘 보이고, 흔들림이 적을수록 좋아요.
              영상도 슬리브는 벗기고 찍어주세요.
            </p>
          </div>
        </section>

        {/* ── 06 사진 인증 ── 입력이 아니라 절차다. 순서가 있는 세 동작으로 보여준다. */}
        <section id="step-6" className="mt-14 scroll-mt-24">
          <StepHead
            n={6}
            title="사진 인증"
            lead="사진만 퍼온 매물을 걸러내는 단계예요. 정품 여부가 아니라, 지금 그 포카를 실제로 갖고 있는지만 확인해요."
          />

          <ol className="mt-5 grid gap-5 border-t border-border pt-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:[&>*+*]:pl-6 sm:[&>*:not(:last-child)]:pr-6">
            <li>
              <p className="text-[12.5px] font-extrabold text-text-1">화면의 코드를 확인해요</p>
              <div
                aria-hidden="true"
                className="mt-2.5 inline-flex items-baseline gap-2 rounded-[3px] border border-current px-3 py-2 text-text-1"
              >
                <span className="text-[10px] font-bold text-text-3">예시</span>
                <span className="font-display text-[17px] font-extrabold tabular-nums tracking-[0.14em]">
                  7F2K93
                </span>
              </div>
            </li>
            <li>
              <p className="text-[12.5px] font-extrabold text-text-1">종이에 그대로 적어요</p>
              <p className="mt-2 text-[12.5px] leading-[1.7] text-text-2">
                손글씨로 또박또박 적으면 충분해요.
              </p>
            </li>
            <li>
              <p className="text-[12.5px] font-extrabold text-text-1">포카와 함께 한 장에 담아요</p>
              <p className="mt-2 text-[12.5px] leading-[1.7] text-text-2">
                코드와 실물이 한 프레임에 같이 보여야 해요. 코드는 발급 시각부터 3분 뒤 만료되고,
                사진 분석을 통과해도 시간이 연장되지 않으니 그 안에 판매 등록까지 완료해야 해요.
              </p>
            </li>
          </ol>
        </section>
      </div>

      {/* ── 등록 이후 ── 입력이 끝난 뒤의 이야기라 지면을 바꿔 넘긴다. */}
      <section className="border-t border-border bg-surface-2" aria-labelledby="after-heading">
        <div className="mx-auto max-w-[820px] px-5 py-12 sm:py-14">
          <h2
            id="after-heading"
            className="font-display text-[19px] font-extrabold tracking-[-0.03em] text-text-1"
          >
            등록하고 나면
          </h2>
          <p className="mt-1.5 text-[12.5px] text-text-3">
            노출부터 정산까지, 이후 흐름도 미리 알아두면 좋아요.
          </p>

          <ol className="mt-6">
            {AFTER.map(({ k, v }, i) => (
              <li
                key={k}
                className="flex gap-4 border-t border-border-2/60 py-4 last:border-b last:border-border-2/60"
              >
                <span
                  aria-hidden="true"
                  className="mt-[3px] font-display text-[11px] font-extrabold tabular-nums text-text-3"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-extrabold tracking-[-0.02em] text-text-1">{k}</p>
                  <p className="mt-1 text-[12.5px] leading-[1.75] text-text-2">{v}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto flex max-w-[820px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-10">
        <Link
          href="/auctions/new"
          className={`inline-flex h-12 items-center rounded-[4px] bg-primary px-8 text-[14px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
        >
          판매 등록 시작하기
        </Link>
        <Link
          href="/guide#seller"
          className={`text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:text-text-1 hover:decoration-text-1 ${FOCUS_RING}`}
        >
          전체 이용 가이드
        </Link>
      </div>
    </>
  );
}
