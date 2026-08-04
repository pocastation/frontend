import Link from "next/link";
import GuidePageHeader from "@/components/GuidePageHeader";
import { FOCUS_RING } from "@/lib/ui";

export const metadata = {
  title: "판매 등록 가이드 — Pocastation",
  description:
    "판매 방식 선택부터 사진 인증까지 — 포카스테이션 판매 등록 7단계를 항목별로 상세히 안내합니다.",
};

// 등록 화면(app/auctions/new)의 실제 스텝 순서와 1:1로 맞춘다.
// 스텝이 바뀌면 이 배열도 함께 고쳐야 한다 — 화면과 가이드가 어긋나면 가이드가 오히려 혼란을 준다.
const STEPS = [
  { id: "step-1", label: "판매 방식" },
  { id: "step-2", label: "카테고리 · 소개" },
  { id: "step-3", label: "상품 정보" },
  { id: "step-4", label: "가격 · 기간" },
  { id: "step-5", label: "사진" },
  { id: "step-6", label: "영상" },
  { id: "step-7", label: "사진 인증" },
];

/**
 * 단계 하나. 카드가 아니다.
 *
 * 이전에는 단계마다 테두리 + radius + 그림자 카드를 둘러 7장이 똑같이 반복됐다.
 * 단계는 서로 떨어진 별개 콘텐츠가 아니라 한 폼의 진행 순서라, 구분은 위쪽 굵은 규칙선과
 * 여백이 맡는 게 맞다. 번호도 원형 배지 대신 조판용 숫자로 눕힌다.
 *
 * 안쪽 내용의 형식은 단계마다 다르다(선택지 · 입력 목업 · 표 · 슬롯 · 산문).
 * 형식이 곧 그 단계에서 사용자가 할 일의 성격이다.
 */
function Step({
  id,
  n,
  title,
  lead,
  children,
}: {
  id: string;
  n: number;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-text-1/20 pt-5">
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden="true"
          className="font-display text-[12px] font-extrabold tabular-nums text-text-3"
        >
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.03em] text-text-1">
          <span className="sr-only">{n}단계. </span>
          {title}
        </h2>
      </div>
      {lead && <p className="mt-2 max-w-[36rem] text-[13px] leading-[1.75] text-text-2">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// 항목 이름 — 입력 UI 위에 얹는 작은 라벨. 값(입력 UI)보다 확실히 조용해야 한다.
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="text-[12px] font-extrabold tracking-[-0.01em] text-text-1">{children}</span>
      {required && <span className="text-[11px] font-bold text-accent">필수</span>}
    </p>
  );
}

// 입력 항목 아래 붙는 보조 설명. 본문보다 한 단 작고 흐리다.
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[12px] leading-[1.7] text-text-3">{children}</p>;
}

/**
 * 진짜 주의사항. 페이지 전체에서 두 번만 쓴다.
 *
 * 이전에는 모든 부연이 테두리 박스(callout)여서, 다섯 개가 전부 같은 무게로 소리쳤다.
 * 다 강조하면 아무것도 강조되지 않는다. 배경도 테두리도 없이 왼쪽 규칙선 하나만 세운다.
 */
function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 border-l-2 border-accent pl-3.5 text-[12.5px] leading-[1.75] text-text-2">
      {children}
    </p>
  );
}

const SOURCES = ["앨범 포함", "예약 특전", "팬사인회", "럭키드로우", "기타"];
const GRADES = [
  { g: "S", d: "미사용 수준" },
  { g: "A", d: "미세한 흔적" },
  { g: "B", d: "눈에 띄는 사용감" },
  { g: "C", d: "뚜렷한 하자" },
];

const AFTER = [
  {
    k: "노출",
    v: (
      <>
        등록을 마치면 경매 목록과 검색에 바로 올라가요. 사진 인증 결과에 따라 관리자 확인을 거치는
        경우가 있고, 그때는 검수가 끝난 뒤 노출돼요.
      </>
    ),
  },
  {
    k: "입찰",
    v: (
      <>
        마감 3분 안에 입찰이 들어오면 3분씩 자동 연장돼요(최대 3회). 마감 시각에 최고 입찰자에게
        낙찰돼요.
      </>
    ),
  },
  {
    k: "결제",
    v: <>구매자가 미리 등록한 카드로 자동 결제되고, 배송지가 확정되면 발송을 준비하면 돼요.</>,
  },
  {
    k: "발송",
    v: <>운송장 번호를 입력해요. 3영업일까지 발송하지 않으면 주문이 자동 취소돼요.</>,
  },
  { k: "정산", v: <>구매자가 구매 확정을 누르면 수수료를 뺀 금액이 등록된 계좌로 입금돼요.</> },
];

export default function SellGuidePage() {
  return (
    <>
      <div className="mx-auto max-w-[820px] px-5 pt-10 pb-16 sm:pt-14">
        <GuidePageHeader
          kicker="판매자 가이드"
          title="판매 등록, 무엇을 입력하나요"
          lead="등록 화면에 나오는 순서 그대로 정리했어요. 각 단계에서 실제로 무엇을 고르고 적는지 미리 보고 시작하면 훨씬 빨라요."
          meta="총 7단계 · 판매 등록은 로그인 후 헤더의 ‘판매 등록’에서 시작해요"
        />

        {/* 목차 — 알약 링크 대신 밑줄 항목. 문서의 차례처럼 읽힌다. */}
        <nav aria-label="단계 바로가기" className="mt-8 grid grid-cols-2 sm:grid-cols-4">
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

        <div className="mt-14 flex flex-col gap-14">
          {/* 01 — 판매 방식: 두 갈래 선택. 고른 쪽이 이후 단계를 바꾸므로 나란히 놓고 비교하게 한다. */}
          <Step
            id="step-1"
            n={1}
            title="판매 방식"
            lead="여기서 고른 방식에 따라 4단계의 가격 입력 항목이 달라져요."
          >
            <div className="grid border-y border-border-2 sm:grid-cols-2">
              <div className="border-b border-border py-4 pr-6 sm:border-b-0 sm:border-r">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <b className="text-[14px] font-extrabold tracking-[-0.02em] text-text-1">
                    경매판매
                  </b>
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.75] text-text-2">
                  정한 기간 동안 입찰을 받아 판매해요. 희소성 있는 포카라면 시세보다 높게 낙찰될 수
                  있어요.
                </p>
              </div>
              <div className="py-4 sm:pl-6">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-border-2" />
                  <b className="text-[14px] font-extrabold tracking-[-0.02em] text-text-1">
                    즉시판매
                  </b>
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.75] text-text-2">
                  정한 가격으로 바로 구매할 수 있게 올려요. 시세가 안정적인 포카를 빠르게 팔 때
                  좋아요.
                </p>
              </div>
            </div>
          </Step>

          {/* 02 — 카테고리·소개: 실제 입력 필드 모양을 보여준다. 설명은 필드 아래로 물러난다. */}
          <Step
            id="step-2"
            n={2}
            title="카테고리 · 소개"
            lead="어떤 포카인지 구매자가 한눈에 알 수 있게 적어요."
          >
            <div className="flex flex-col gap-6">
              <div>
                <FieldLabel required>스타</FieldLabel>
                <div className="mt-2 flex items-center rounded-[4px] border border-border-2 px-3.5 py-2.5 text-[13px] text-text-3">
                  그룹명을 검색하세요
                </div>
                <Hint>검색 · 필터에 그대로 연결되니 정확하게 골라주세요.</Hint>
              </div>

              <div>
                <FieldLabel>멤버</FieldLabel>
                <div className="mt-2 flex items-center justify-between rounded-[4px] border border-border-2 px-3.5 py-2.5 text-[13px] text-text-3">
                  멤버 선택
                  <span aria-hidden="true" className="text-[10px]">
                    ▾
                  </span>
                </div>
                <Hint>지정하면 그 멤버를 찾는 구매자에게 더 잘 노출돼요.</Hint>
              </div>

              <div>
                <FieldLabel required>제목</FieldLabel>
                <div className="mt-2 rounded-[4px] border border-border-2 px-3.5 py-2.5 text-[13px] text-text-1">
                  정국 Proof 위버스 특전 포카
                </div>
                <Hint>멤버명 · 앨범 · 버전을 담아 구체적으로 적을수록 검색에 유리해요.</Hint>
              </div>

              <div>
                <FieldLabel>설명</FieldLabel>
                <div className="mt-2 h-[74px] rounded-[4px] border border-border-2 px-3.5 py-2.5 text-[13px] text-text-3">
                  구매 경로, 보관 방식, 상태를 적어주세요
                </div>
                <Hint>하자와 상태는 있는 그대로 적는 편이 결국 분쟁을 줄여요.</Hint>
              </div>
            </div>
          </Step>

          {/* 03 — 상품 정보: 전부 선택형이라 고를 수 있는 값 자체를 펼쳐 보인다. */}
          <Step
            id="step-3"
            n={3}
            title="상품 정보"
            lead="출처와 상태는 구매자가 가장 먼저 확인하는 정보예요."
          >
            <div className="flex flex-col gap-7">
              <div>
                <FieldLabel>출처</FieldLabel>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {SOURCES.map((s) => (
                    <span
                      key={s}
                      className="border border-border-2 px-3 py-1.5 text-[12.5px] font-semibold text-text-2"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>상태 등급</FieldLabel>
                <div className="mt-2.5 flex gap-1.5">
                  {GRADES.map(({ g, d }) => (
                    <div key={g} className="flex-1">
                      <div className="flex h-11 items-center justify-center border border-border-2 font-display text-[15px] font-extrabold text-text-1">
                        {g}
                      </div>
                      <p className="mt-1.5 text-center text-[10.5px] leading-tight text-text-3">
                        {d}
                      </p>
                    </div>
                  ))}
                </div>
                <Hint>고른 등급은 상세 페이지에 그대로 표시돼요.</Hint>
              </div>

              <div>
                <FieldLabel>미개봉 여부</FieldLabel>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-[18px] w-[18px] items-center justify-center border border-border-2 text-[11px] text-text-3"
                  />
                  <span className="text-[12.5px] text-text-2">미개봉 상품이에요</span>
                </div>
              </div>
            </div>

            <Warning>
              <b className="font-extrabold text-text-1">하자는 반드시 알려주세요.</b> 고지하지 않은
              하자는 반품 · 분쟁 사유가 되고 판매자에게 불리하게 작용해요. 밝은 곳에서 하자 부위를 근접
              촬영해 사진에도 함께 담아주세요.
            </Warning>
          </Step>

          {/* 04 — 가격: 두 방식의 입력값이 어떻게 갈리는지가 핵심이라 표가 가장 정확하다.
              페이지에서 표는 여기 한 번만 쓴다. */}
          <Step id="step-4" n={4} title="가격 · 경매 기간">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-text-1/25">
                  <th className="w-[86px] pb-2 text-[11px] font-bold text-text-3">항목</th>
                  <th className="pb-2 pr-4 text-[11px] font-bold text-text-3">경매판매</th>
                  <th className="pb-2 text-[11px] font-bold text-text-3">즉시판매</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-border">
                  <th
                    scope="row"
                    className="py-3 pr-3 text-[12.5px] font-extrabold text-text-1"
                  >
                    시작가
                  </th>
                  <td className="py-3 pr-4 text-[12.5px] leading-[1.7] text-text-2">
                    <span className="tabular-nums">5,000원</span>부터{" "}
                    <span className="tabular-nums">1,000원</span> 단위
                  </td>
                  <td className="py-3 text-[12.5px] text-text-3">—</td>
                </tr>
                <tr className="border-b border-border">
                  <th scope="row" className="py-3 pr-3 text-[12.5px] font-extrabold text-text-1">
                    즉시판매가
                  </th>
                  <td className="py-3 pr-4 text-[12.5px] text-text-3">—</td>
                  <td className="py-3 text-[12.5px] leading-[1.7] text-text-2">
                    구매자가 바로 결제하는 확정 가격. 단위 규칙은 같아요.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <th scope="row" className="py-3 pr-3 text-[12.5px] font-extrabold text-text-1">
                    경매 기간
                  </th>
                  <td className="py-3 pr-4 text-[12.5px] leading-[1.7] text-text-2">
                    <span className="tabular-nums">1일</span> · <span className="tabular-nums">3일</span>{" "}
                    · <span className="tabular-nums">7일</span> 중 선택
                  </td>
                  <td className="py-3 text-[12.5px] text-text-3">—</td>
                </tr>
                <tr className="border-b border-border">
                  <th scope="row" className="py-3 pr-3 text-[12.5px] font-extrabold text-text-1">
                    차순위 승계
                  </th>
                  <td className="py-3 pr-4 text-[12.5px] leading-[1.7] text-text-2">
                    낙찰자가 결제하지 않으면 차순위 입찰자에게 기회를 넘겨요(24시간 내 수락,
                    1단계까지).
                  </td>
                  <td className="py-3 text-[12.5px] text-text-3">—</td>
                </tr>
              </tbody>
            </table>
            <Hint>
              시작가가 너무 높으면 유찰될 수 있어 시세보다 살짝 낮게 잡는 편이 유리해요. 배송비는
              판매자 부담이니 감안해서 정해주세요.
            </Hint>
          </Step>

          {/* 05 — 사진: 이 서비스에서 가장 중요한 입력이다. 설명 대신 슬롯 자체를 보여준다. */}
          <Step
            id="step-5"
            n={5}
            title="사진"
            lead="구매자가 가장 오래 보는 정보예요. 최대 12장까지 올릴 수 있고, 첫 장이 목록에 걸리는 대표사진이 돼요."
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`flex h-[58px] w-[58px] shrink-0 items-center justify-center text-[10px] font-bold ${
                    i === 0
                      ? "border border-current bg-surface-2 text-text-1"
                      : "border border-dashed border-border-2 text-text-3"
                  }`}
                >
                  {i === 0 ? "대표" : i + 1}
                </div>
              ))}
            </div>
            <Hint>
              앞 · 뒷면, 모서리 네 곳, 하자 부위 근접샷을 밝은 곳에서 찍으면 문의와 분쟁이 크게 줄어요.
            </Hint>

            <Warning>
              <b className="font-extrabold text-text-1">도용 사진은 등록하지 마세요.</b> 타인의 사진을
              사용한 매물은 신고 대상이며, 확인되면 판매가 제한될 수 있어요. 반드시 직접 촬영한 실물
              사진을 올려주세요.
            </Warning>
          </Step>

          {/* 06 — 영상: 규칙이 아니라 요령이라 목업 없이 산문으로 둔다. 형식을 비우는 것도 리듬이다. */}
          <Step id="step-6" n={6} title="영상">
            <p className="max-w-[36rem] text-[13px] leading-[1.85] text-text-2">
              포카를 손에 들고 앞뒤로 천천히 돌리며 찍어주세요. 홀로그램 · 코팅 상태처럼 사진으로는
              판단하기 어려운 부분이 영상에서 드러나요. 조명 아래에서 각도를 바꿔가며 찍으면 표면
              상태가 잘 보이고, 흔들림이 적을수록 좋아요.
            </p>
          </Step>

          {/* 07 — 사진 인증: 화면에 뜨는 코드를 실제 모양으로 보여주는 게 설명 세 줄보다 빠르다. */}
          <Step
            id="step-7"
            n={7}
            title="사진 인증"
            lead="사진만 퍼온 매물을 걸러내는 단계예요. 정품 여부가 아니라 지금 그 포카를 실제로 갖고 있는지만 확인해요."
          >
            <div className="inline-flex items-center gap-4 border border-current px-5 py-3.5 text-text-1">
              <span className="text-[10.5px] font-bold text-text-3">인증 코드 · 예시</span>
              <span
                aria-hidden="true"
                className="font-display text-[19px] font-extrabold tabular-nums tracking-[0.16em] text-text-1"
              >
                7F2K93
              </span>
            </div>
            <p className="mt-4 max-w-[36rem] text-[13px] leading-[1.85] text-text-2">
              화면에 나온 코드를 종이에 적어, 판매할 포카와 <b className="font-bold text-text-1">함께
              한 장에</b> 담아 촬영해 올려요. 코드가 사진에 실제로 담겨 있는지 확인하는 절차예요.
            </p>
            <Hint>코드는 발급 후 10분 안에 촬영해 올려야 하고, 지나면 새로 받아야 해요.</Hint>
          </Step>
        </div>
      </div>

      {/* ── 등록 이후 ── 본문과 성격이 다른 후일담이라 배경 띠로 넘긴다. */}
      <section className="border-t border-border bg-surface-2" aria-labelledby="after-heading">
        <div className="mx-auto max-w-[820px] px-5 py-12 sm:py-14">
          <h2
            id="after-heading"
            className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-text-1"
          >
            등록하고 나면
          </h2>
          <p className="mt-1.5 text-[12.5px] text-text-3">
            노출부터 정산까지, 이후 흐름도 미리 알아두면 좋아요.
          </p>

          <dl className="mt-7 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {AFTER.map(({ k, v }) => (
              <div key={k} className="flex gap-3.5">
                <dt className="w-[38px] shrink-0 pt-px text-[12px] font-extrabold text-text-1">
                  {k}
                </dt>
                <dd className="text-[12.5px] leading-[1.75] text-text-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-[820px] px-5 py-10">
        <Link
          href="/auctions/new"
          className={`inline-flex h-12 items-center rounded-[3px] bg-primary px-8 text-[14px] font-bold text-white transition-colors hover:bg-primary-dark ${FOCUS_RING}`}
        >
          판매 등록 시작하기
        </Link>
        <Link
          href="/guide#seller"
          className={`ml-5 text-[13px] font-bold text-text-2 underline decoration-border-2 underline-offset-4 transition-colors hover:decoration-text-1 hover:text-text-1 ${FOCUS_RING}`}
        >
          전체 이용 가이드
        </Link>
      </div>
    </>
  );
}
