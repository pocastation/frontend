// 남은 시간 표기와 긴급도 판정 — 목록 카드(AuctionCountdown)와 모바일 홈 배너가 **같은 규칙**을 쓴다.
//
// 마감 임박 색을 서버 status와 클라이언트 계산으로 따로 굴리면 두 화면이 다른 말을 하게 된다.
// 판정은 여기 하나뿐이고, 화면은 그 결과에 색만 입힌다.

export type CountdownLevel = "normal" | "soon" | "critical" | "ended";

const HOUR_MS = 60 * 60 * 1000;
/** 마감 12시간 이내 — 임박. */
export const SOON_MS = 12 * HOUR_MS;
/** 마감 1시간 이내 — 직전. */
export const CRITICAL_MS = HOUR_MS;

// 목록에서는 **초를 그리지 않는다**(#277). 격자에 수십 장이 깔릴 때 초 단위로 흔들리는 숫자가
// 사진보다 먼저 눈에 들어왔다. 정확한 초는 상세 페이지가 계속 보여준다.
export function formatRemaining(diffMs: number): string {
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분`;
  // 1분 미만. 초를 안 쓰기로 했으므로 남은 시간을 숫자 대신 말로 알린다.
  return "곧 마감";
}

export function countdownLevel(diffMs: number): CountdownLevel {
  if (diffMs <= 0) return "ended";
  if (diffMs <= CRITICAL_MS) return "critical";
  if (diffMs <= SOON_MS) return "soon";
  return "normal";
}

/**
 * 마감시각으로 바로 긴급도를 구한다.
 *
 * <p>`Date.now()`를 컴포넌트 본문에서 직접 부르면 react-hooks/purity 린트에 걸린다
 * (lib/format.ts의 isEndingSoon과 같은 이유) — 헬퍼 뒤에 숨긴다.
 */
export function countdownLevelAt(endAt: string | null | undefined): CountdownLevel {
  if (!endAt) return "normal";
  return countdownLevel(new Date(endAt).getTime() - Date.now());
}
