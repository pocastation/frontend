import { apiFetch, ApiError } from "./api";
import type { TokenResponse } from "./types";

const LOCK_NAME = "pocastation:auth-cookie";
const CHANGE_KEY = "pocastation:session-change";
const REQUEST_TIMEOUT_MS = 5_000;
const LOCK_WAIT_MS = 15_000;
let fallbackQueue: Promise<unknown> = Promise.resolve();

// 영구 저장소에는 토큰·회원 정보 없이 쿠키 변경 세대만 기록한다.
export function sessionRevision(): string | null {
  try { return localStorage.getItem(CHANGE_KEY); } catch { return null; }
}

export function announceSessionChange(): void {
  try { localStorage.setItem(CHANGE_KEY, crypto.randomUUID()); } catch { /* 저장소 차단 시 서버 검증 유지 */ }
}

export function onSessionChange(callback: () => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key === CHANGE_KEY) callback();
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

/** 쿠키를 바꾸는 요청을 동일 출처 탭끼리 직렬화. 탭 종료 시 브라우저가 잠금을 해제한다. */
export async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) {
    const result = fallbackQueue.then(action);
    fallbackQueue = result.catch(() => {});
    return result;
  }
  const waiting = new AbortController();
  const timeout = setTimeout(() => waiting.abort(), LOCK_WAIT_MS);
  try {
    return await navigator.locks.request(LOCK_NAME, { signal: waiting.signal }, async () => {
      clearTimeout(timeout);
      return action();
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sessionRequest<T>(path: string, body?: unknown): Promise<T> {
  const request = new AbortController();
  const timeout = setTimeout(() => request.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await apiFetch<T>(path, { method: "POST", body, signal: request.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// 미지원 브라우저에서도 같은 탭의 요청은 공유한다. 탭·출처 간 경합은 서버 유예로 보완한다.
let inFlight: Promise<TokenResponse | null> | null = null;

export function coordinatedRefresh(): Promise<TokenResponse | null> {
  if (inFlight) return inFlight;
  const revision = sessionRevision();
  inFlight = withSessionLock(async () => {
    if (sessionRevision() !== revision) return null;
    for (let attempt = 0; ; attempt++) {
      try {
        const tokens = await sessionRequest<TokenResponse>("/api/auth/refresh");
        return sessionRevision() === revision ? tokens : null;
      } catch (error) {
        // 통신 실패·성공 응답 본문 유실만 한 번 재시도한다. 401/403/429는 재시도하지 않는다.
        const networkFailure = error instanceof TypeError
          || (error instanceof DOMException && error.name === "AbortError")
          || (error instanceof ApiError && error.errorCode === null && error.status >= 200 && error.status < 300);
        if (!networkFailure || attempt > 0 || sessionRevision() !== revision) throw error;
      }
    }
  }).finally(() => { inFlight = null; });
  return inFlight;
}
