export function formatKRW(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Date.now()를 컴포넌트 본문에 직접 쓰면 react-hooks/purity 린트에 걸린다 — formatTimeLeft와
// 같은 이유로 헬퍼 뒤에 숨긴다.
export function isEndingSoon(endAt: string, withinMs: number = ONE_DAY_MS): boolean {
  return new Date(endAt).getTime() - Date.now() < withinMs;
}

export function formatTimeLeft(endAt: string): string {
  const diffMs = new Date(endAt).getTime() - Date.now();
  if (diffMs <= 0) return "종료";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days}일 ${hours}시간 남음` : `${days}일 남음`;
  }
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`;
  }
  return `${minutes}분 남음`;
}
