/**
 * 매물 상세의 참여 수 — 제안자 수와 관심 수를 아이콘 + 숫자로 보여준다(거래 개편 §2.9).
 *
 * <p>**데스크탑(`BidSection`)과 모바일(`MobileAuctionDetail`)이 이 컴포넌트 하나를 공유한다.**
 * 상세는 지면이 갈려 트리가 두 벌인데, 표시 규칙을 각자 선언하면 한쪽만 고쳐져 두 화면이 다른
 * 말을 한다 — 「모두 읽음」 버튼을 데스크탑 헤더와 모바일 앱바가 같은 엘리먼트로 공유하는 것과
 * 같은 이유다.
 *
 * <p>🔴 **제안이 0건이면 사람 아이콘 줄이 통째로 빠진다.** 「0명」을 쓰면 §2.9 D1이 막으려던
 * 「아무도 안 원하는 물건」이 그대로 돌아온다. 그 자리는 호출부가 {@link OFFER_EMPTY_HINT}로
 * 채운다 — 아이콘 줄에 문장을 넣으면 줄 높이가 튀어서 자리를 옮겼다.
 *
 * <p>**관심은 0이어도 그대로 쓴다.** 관심 0은 「아직 안 알려졌다」에 가깝지 「아무도 안 원한다」로는
 * 덜 읽힌다는 판단이다(2026-08-26 확정). 덕분에 아이콘 줄이 통째로 비지 않아 레이아웃도
 * 흔들리지 않는다.
 *
 * <p>⚠️ {@code offerCount}는 제안 **건수**가 아니라 **취소를 뺀 distinct 제안자 수**다. 한 사람이
 * 금액을 여러 번 바꿔도 1이다 — 그래서 단위가 「회」가 아니라 **「명」**이다. 건수는 {@code bidCount}
 * 라는 별도 필드이고 §1.7로 화면에서 뺐다.
 */
export default function OfferCounts({
  offerCount,
  wishlistCount,
  size = "sm",
}: {
  offerCount: number;
  wishlistCount: number;
  /** 데스크탑은 아이콘을 1px 키운다. 그 외 규칙은 두 지면이 같다. */
  size?: "sm" | "md";
}) {
  const icon = size === "md" ? 15 : 14;

  return (
    <span className="flex shrink-0 items-center gap-3.5 text-text-2">
      {offerCount > 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tabular-nums">
          <PeopleIcon size={icon} />
          {offerCount}명
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 text-xs font-bold tabular-nums">
        <HeartIcon size={icon} />
        {wishlistCount}
      </span>
    </span>
  );
}

// 선(stroke) 아이콘만 쓴다 — 원형 숫자 배지·채운 아이콘·이모지는 디자인 절이 금지한다.
// 장식이 아니라 「무엇을 세는가」를 나르는 아이콘이라 남긴다.

function PeopleIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-3"
      aria-label="가격을 제안한 사람"
      role="img"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function HeartIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-3"
      aria-label="관심"
      role="img"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
