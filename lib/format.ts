export function formatKRW(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Date.now()를 컴포넌트 본문에 직접 쓰면 react-hooks/purity 린트에 걸린다 — formatTimeLeft와
// 같은 이유로 헬퍼 뒤에 숨긴다.
export function isEndingSoon(endAt: string | null | undefined, withinMs: number = ONE_DAY_MS): boolean {
  if (!endAt) return false;
  return new Date(endAt).getTime() - Date.now() < withinMs;
}

// 마감시각이 아직 미래인지(경매가 시간상 진행 중인지). 위와 같은 이유로 Date.now()를 헬퍼에 숨긴다.
export function isBeforeEnd(endAt: string | null | undefined): boolean {
  if (!endAt) return false;
  return new Date(endAt).getTime() > Date.now();
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

// 호가창용 라이브 카운트다운 — 1시간 미만이면 mm:ss로 초까지(마감 임박 긴장감), 하루 이상은
// "N일 N시간"으로 요약. Date.now()는 다른 헬퍼와 같은 이유로 함수 뒤에 숨긴다(purity 린트).
export function formatCountdown(endAt: string): string {
  const diffMs = new Date(endAt).getTime() - Date.now();
  if (diffMs <= 0) return "종료";

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

// 입찰 테이프용 상대 시각("방금", "N분 전").
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return "방금";
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}
