import Link from "next/link";
import GuideHero from "@/components/GuideHero";
import { InfoIcon } from "@/components/GuideIcons";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";

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

function Field({
  name,
  required,
  optional,
  children,
}: {
  name: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  // 좁은 화면에서 라벨을 고정폭 열로 두면(기존 92px) 설명이 남은 150px 남짓에 갇혀
  // 한 항목이 10줄까지 쪼개졌다. 모바일은 라벨을 위로 올려 설명이 폭을 다 쓰게 하고,
  // 2열 정렬은 폭이 확보되는 sm 이상에서만 한다.
  return (
    <li className="flex flex-col gap-1 px-3.5 py-3 text-[12.5px] leading-relaxed [&+li]:border-t [&+li]:border-border sm:flex-row sm:items-baseline sm:gap-3 sm:py-2.5">
      <span className="font-extrabold whitespace-nowrap text-text-1 sm:w-[104px] sm:shrink-0">
        {name}
        {required && (
          <span aria-hidden="true" className="ml-1 font-extrabold text-accent">
            *
          </span>
        )}
        {optional && (
          <span className="ml-1 align-[1px] text-[10px] font-extrabold text-text-3">선택</span>
        )}
      </span>
      <span className="min-w-0 flex-1 text-text-2">{children}</span>
    </li>
  );
}

// 팁·주의 콜아웃. 원본 시안은 배경색 필이었지만 레포 규칙(파스텔 필 금지)에 맞춰
// 헤어라인 + 좌측 컬러 스트라이프로 바꿨다. 의미(좋음/주의)는 색으로 구분한다.
function Callout({ tone, children }: { tone: "tip" | "warn"; children: React.ReactNode }) {
  const isWarn = tone === "warn";
  return (
    <div
      className={`mt-3.5 flex gap-2 rounded-r2 border border-border bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-text-2 ${
        isWarn ? "border-l-2 border-l-accent" : "border-l-2 border-l-ok"
      }`}
    >
      <span aria-hidden="true" className={`mt-px shrink-0 font-extrabold ${isWarn ? "text-accent" : "text-ok"}`}>
        {isWarn ? "!" : "✓"}
      </span>
      <span>{children}</span>
    </div>
  );
}

// 번호는 카드 바깥 레일이 아니라 카드 헤더 안에 둔다.
// 레일을 세우면 단계 카드만 레일 폭(36px + gap 20px)만큼 안쪽으로 밀려,
// 바로 아래 '등록하고 나면' 섹션과 좌변이 56px 어긋난다(실측).
function Step({
  id,
  index,
  title,
  sub,
  children,
}: {
  id: string;
  index: number;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <li
      id={id}
      className="scroll-mt-20 rounded-r3 border border-border bg-surface p-[18px] shadow-card sm:p-[22px]"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-extrabold text-primary"
        >
          {index}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-extrabold text-text-1">
            <span className="sr-only">{index}단계. </span>
            {title}
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-3">{sub}</p>
        </div>
      </div>
      {children}
    </li>
  );
}

export default function SellGuidePage() {
  return (
    <>
      <GuideHero
        eyebrow="Seller Guide · 판매 등록"
        title="판매 등록, 7단계면 끝나요"
        description="등록 화면의 실제 순서 그대로 안내해 드려요. 단계마다 무엇을 입력하면 되는지 미리 확인해 보세요."
      >
        <nav
          aria-label="등록 단계 바로가기"
          className="mx-auto mt-6 flex max-w-[640px] gap-1.5 overflow-x-auto px-1 pb-1.5 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {STEPS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white/85 transition-colors hover:border-white/50 hover:bg-white/10 ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/90 font-display text-[11px] font-extrabold text-primary"
              >
                {i + 1}
              </span>
              {s.label}
            </a>
          ))}
        </nav>
      </GuideHero>

      <div className="mx-auto max-w-[880px] px-4 py-10 pb-16">
        <p className="flex items-start gap-2.5 rounded-r3 bg-primary-soft px-[18px] py-3.5 text-[13px] leading-relaxed text-text-1 sm:px-[22px]">
          <span aria-hidden="true" className="mt-px shrink-0 text-primary">
            <InfoIcon />
          </span>
          <span>
            판매 등록은 <strong className="font-extrabold">로그인 후</strong> 헤더의{" "}
            <strong className="font-extrabold">‘판매 등록’</strong>에서 시작해요. 한 단계씩 진행하는
            화면이라, 각 단계를 채워야 다음으로 넘어갈 수 있어요.{" "}
            <span aria-hidden="true" className="font-extrabold text-accent">
              *
            </span>{" "}
            표시는 필수 항목이에요.
          </span>
        </p>

        <ol className="mt-8 flex flex-col gap-4">
          {/* 1 — 판매 방식 */}
          <Step
            id="step-1"
            index={1}
            title="판매 방식 선택"
            sub="먼저 어떤 방식으로 판매할지 골라요. 방식에 따라 4단계의 가격 입력이 달라져요."
          >
            <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-r2 border border-primary bg-primary-soft px-3.5 py-3">
                <b className="block text-[13px] font-extrabold text-primary">경매판매</b>
                <span className="mt-1 block text-xs leading-relaxed text-text-2">
                  정한 기간 동안 입찰을 받아 판매해요. 인기 포카라면 시세보다 높게 낙찰될 수 있어요.
                </span>
              </div>
              <div className="rounded-r2 border border-border px-3.5 py-3">
                <b className="block text-[13px] font-extrabold text-text-1">즉시판매</b>
                <span className="mt-1 block text-xs leading-relaxed text-text-2">
                  정한 가격으로 바로 구매할 수 있게 올려요. 빠르게 판매하고 싶을 때 좋아요.
                </span>
              </div>
            </div>
            <Callout tone="tip">
              <b className="font-extrabold text-text-1">어떤 걸 고를지 고민된다면</b> — 희소성 있는
              포카는 경매, 시세가 안정적인 포카는 즉시판매가 유리한 경우가 많아요.
            </Callout>
          </Step>

          {/* 2 — 카테고리 · 소개 */}
          <Step
            id="step-2"
            index={2}
            title="카테고리 · 소개"
            sub="어떤 포카인지 구매자가 한눈에 알 수 있게 적어요."
          >
            <ul className="mt-3.5 overflow-hidden rounded-r2 border border-border">
              <Field name="스타" required>
                그룹명을 검색해 선택해요. 검색·필터에 그대로 연결되니 정확하게 골라주세요.
              </Field>
              <Field name="멤버" optional>
                멤버까지 지정하면 그 멤버를 찾는 구매자에게 더 잘 노출돼요.
              </Field>
              <Field name="제목" required>
                멤버명·앨범·버전을 담아 구체적으로 적을수록 검색에 유리해요. 예: “정국 Proof 위버스
                특전”
              </Field>
              <Field name="설명" optional>
                구매 경로·앨범·보관 방식과 함께, 하자와 상태를 있는 그대로 적어주세요.
              </Field>
            </ul>
          </Step>

          {/* 3 — 상품 정보 */}
          <Step
            id="step-3"
            index={3}
            title="상품 정보"
            sub="출처와 상태를 정확히 알릴수록 분쟁 없이 거래돼요."
          >
            <ul className="mt-3.5 overflow-hidden rounded-r2 border border-border">
              <Field name="출처">
                앨범 포함, 예약 특전, 팬사인회, 럭키드로우 등 포카를 얻은 경로를 선택해요.
              </Field>
              <Field name="상태 등급">
                S · A · B · C 중에서 골라요. 등급은 상세 페이지에 표시돼요.
              </Field>
              <Field name="미개봉 여부">미개봉 상품이면 체크해요. 상세 페이지에 표시돼요.</Field>
            </ul>
            <Callout tone="warn">
              <b className="font-extrabold text-text-1">하자는 반드시 알려주세요.</b> 고지하지 않은
              하자는 반품·분쟁 사유가 되고 판매자에게 불리하게 작용해요. 밝은 곳에서 하자 부위를 근접
              촬영해 사진에도 함께 담아주세요.
            </Callout>
          </Step>

          {/* 4 — 가격 · 경매 기간 */}
          <Step
            id="step-4"
            index={4}
            title="가격 · 경매 기간"
            sub="1단계에서 고른 판매 방식에 따라 입력 항목이 달라져요."
          >
            <ul className="mt-3.5 overflow-hidden rounded-r2 border border-border">
              <Field name="시작가" required>
                <b className="font-bold text-text-1">경매판매</b> — 입찰이 시작되는 가격이에요.{" "}
                <b className="font-bold text-text-1">최저 5,000원부터 1,000원 단위</b>로 입력해요.
                너무 높으면 유찰될 수 있어 시세보다 살짝 낮게 잡는 편이 유리해요.
              </Field>
              <Field name="경매 기간">
                <b className="font-bold text-text-1">경매판매</b> — 1일 · 3일 · 7일 중에 골라요.
                기간이 끝나면 최고 입찰자에게 낙찰돼요.
              </Field>
              <Field name="즉시판매가" required>
                <b className="font-bold text-text-1">즉시판매</b> — 구매자가 바로 결제하는 확정
                가격이에요. 시작가와 같은 단위 규칙이 적용돼요.
              </Field>
              <Field name="차순위 승계" optional>
                <b className="font-bold text-text-1">경매판매</b> — 낙찰자가 결제하지 않으면 차순위
                입찰자에게 구매 기회를 제안해요(24시간 내 수락, 1단계까지만).
              </Field>
            </ul>
            <Callout tone="tip">
              <b className="font-extrabold text-text-1">배송비는 판매자 부담이에요.</b> 배송비를
              감안해 시작가·판매가를 정해주세요.
            </Callout>
          </Step>

          {/* 5 — 사진 */}
          <Step id="step-5" index={5} title="사진" sub="실물 사진이 거래 신뢰도의 핵심이에요.">
            <ul className="mt-3.5 overflow-hidden rounded-r2 border border-border">
              <Field name="장수" required>
                <b className="font-bold text-text-1">1~12장</b>까지 올릴 수 있고,{" "}
                <b className="font-bold text-text-1">첫 번째 사진이 대표사진</b>으로 목록에 노출돼요.
              </Field>
              <Field name="촬영 팁">
                앞·뒷면, 모서리 4곳, 하자 부위 근접샷을 밝은 곳에서 찍으면 문의와 분쟁이 크게 줄어요.
              </Field>
            </ul>
            <Callout tone="warn">
              <b className="font-extrabold text-text-1">도용 사진은 등록하지 마세요.</b> 타인의 사진을
              사용한 매물은 신고 대상이며, 확인되면 판매가 제한될 수 있어요. 반드시 직접 촬영한 실물
              사진을 올려주세요.
            </Callout>
          </Step>

          {/* 6 — 영상 */}
          <Step
            id="step-6"
            index={6}
            title="영상"
            sub="사진만으로 확인하기 어려운 부분을 영상으로 보여줘요."
          >
            <ul className="mt-3.5 overflow-hidden rounded-r2 border border-border">
              <Field name="검수영상">
                포카를 손에 들고 앞뒤로 천천히 돌리며 찍어주세요. 홀로그램·코팅 상태처럼 사진으로는
                판단하기 어려운 부분이 드러나요.
              </Field>
              <Field name="촬영 팁">
                조명 아래에서 각도를 바꿔가며 찍으면 표면 상태가 잘 보여요. 흔들림이 적을수록 좋아요.
              </Field>
            </ul>
          </Step>

          {/* 7 — 사진 인증 */}
          <Step
            id="step-7"
            index={7}
            title="사진 인증"
            sub="사진만 퍼온 매물을 걸러내기 위한 단계예요."
          >
            <p className="mt-3 text-[13px] leading-relaxed text-text-2">
              화면에 <b className="font-bold text-text-1">인증 코드</b>가 나오면, 종이에 그 코드를
              적어 판매할 포카와 <b className="font-bold text-text-1">함께 한 장에 담아</b> 촬영해
              올려요. 코드가 사진에 실제로 담겨 있는지 확인하는 절차예요.
            </p>
            <Callout tone="tip">
              이건 <b className="font-extrabold text-text-1">정품 여부가 아니라 소유 여부</b>를 보는
              절차예요. 지금 그 포카를 실제로 갖고 있다는 것만 확인해요.
            </Callout>
            <Callout tone="warn">
              인증 코드는 <b className="font-extrabold text-text-1">발급 후 10분 안에</b> 촬영해
              올려야 해요. 시간이 지나면 새 코드를 다시 받아야 해요.
            </Callout>
          </Step>
        </ol>

        {/* ── 등록 이후 흐름 ── */}
        <section
          className="mt-9 overflow-hidden rounded-r4 border border-border bg-surface shadow-card"
          aria-labelledby="after-heading"
        >
          <div className="flex items-center gap-3 border-b border-border bg-primary-soft px-[18px] py-4 sm:px-[22px]">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r2 bg-primary text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m8.5 12.5 2.5 2.5 4.5-5" />
              </svg>
            </span>
            <div>
              <h2 id="after-heading" className="font-display text-base font-extrabold text-text-1">
                등록하고 나면 이렇게 진행돼요
              </h2>
              <p className="mt-0.5 text-xs text-text-3">
                노출부터 정산까지, 등록 이후의 흐름도 미리 알아두면 좋아요.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 px-[18px] py-[18px] sm:px-[22px]">
            {[
              <>
                <b className="font-extrabold text-text-1">매물이 노출돼요.</b> 등록을 마치면 경매
                목록과 검색에 바로 올라가요. 사진 인증 결과에 따라 관리자 확인을 거치는 경우가 있고,
                그때는 검수가 끝난 뒤 노출돼요.
              </>,
              <>
                <b className="font-extrabold text-text-1">입찰을 받아요.</b> 마감 3분 안에 입찰이
                들어오면 3분씩 자동 연장돼요(최대 3회). 마감 시각에 최고 입찰자에게 낙찰돼요.
              </>,
              <>
                <b className="font-extrabold text-text-1">낙찰되면 자동 결제돼요.</b> 구매자가 미리
                등록한 카드로 결제가 진행되고, 배송지가 확정되면 발송을 준비하면 돼요.
              </>,
              <>
                <b className="font-extrabold text-text-1">발송하고 운송장을 입력해요.</b> 3영업일까지
                발송하지 않으면 주문이 자동 취소되니 기한을 지켜주세요.
              </>,
              <>
                <b className="font-extrabold text-text-1">구매 확정되면 정산돼요.</b> 수수료를 뺀
                금액이 등록된 계좌로 입금돼요.
              </>,
            ].map((row, i) => (
              <div key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-text-2">
                <span
                  aria-hidden="true"
                  className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-extrabold text-primary"
                >
                  {i + 1}
                </span>
                <span>{row}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link href="/auctions/new" className={`flex h-11 items-center px-7 ${PRIMARY_BUTTON_CLASS}`}>
            판매 등록 시작하기 →
          </Link>
          <Link href="/guide#seller" className={`flex h-11 items-center px-6 ${SECONDARY_BUTTON_CLASS}`}>
            전체 이용 가이드 보기
          </Link>
        </div>
      </div>
    </>
  );
}
