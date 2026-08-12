import type { ApiResponse } from "./types";

// 이 fetch는 서버 컴포넌트(Node)에서도 실행될 수 있는데, 그 환경은 브라우저 쿠키를
// 실을 수 없어 NEXT_PUBLIC_API_URL 누락을 눈치채기 어렵다 — 프로덕션에서는 로컬호스트로
// 조용히 폴백하는 대신 실제로 요청이 나가는 시점에 크게 실패시킨다.
export function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL이 설정되지 않았습니다. 프로덕션 배포 시 반드시 지정해야 합니다.");
  }
  // ⚠️ 서버(RSC·라우트 핸들러)에서는 상대 경로로 fetch할 수 없다 — Node fetch는 절대 URL만
  // 받고 `/api/...`는 ERR_INVALID_URL로 죽는다. 실제로 `/sellers/[sellerId]`의 SSR이 이걸로
  // 깨졌다. 프록시는 브라우저를 위한 장치이고(쿠키·CORS), 서버는 애초에 그 문제가 없으므로
  // 백엔드로 곧장 나가면 된다.
  if (typeof window === "undefined") {
    return process.env.LOCAL_BACKEND_ORIGIN ?? "http://localhost:8080";
  }
  // 브라우저에서는 **빈 문자열** — 같은 출처로 호출하고 next.config의 rewrite가 백엔드로 넘긴다.
  // 브라우저가 보는 출처가 하나가 되어 쿠키가 1st-party가 되고 CORS도 발생하지 않는다.
  // staging에 붙여 보려면 NEXT_PUBLIC_API_URL을 명시하면 이 분기를 지나가지 않는다.
  return "";
}

// 저장 방식에 따라 미디어 경로 형태가 다르다:
//  - S3StorageClient(배포): 절대 URL(https://{cloudfront}/photos/…)을 통째로 저장 → 그대로 쓴다.
//  - LocalStorageClient(로컬): /media/** 상대경로 → 프론트(3000)가 아니라 백엔드(8080) 기준으로 조합.
// 절대 URL에 API 주소를 덧붙이면 "https://api…https://cloudfront…"로 깨지므로 반드시 분기한다.
export function mediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${resolveApiUrl()}${path}`;
}

// SSE는 EventSource가 fetch 래퍼(apiFetch)를 안 거치므로 절대 URL을 직접 조합해준다.
export function apiStreamUrl(path: string): string {
  return `${resolveApiUrl()}${path}`;
}

export class ApiError extends Error {
  errorCode: string | null;
  status: number;

  constructor(message: string, errorCode: string | null, status: number) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  accessToken?: string | null;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;

  const response = await fetch(`${resolveApiUrl()}${path}`, {
    ...rest,
    // 서버 컴포넌트에서 실행되는 fetch는 브라우저 쿠키를 실을 수 없다 — 인증이 필요한
    // 데이터를 서버에서 가져오려면 next/headers로 쿠키를 명시적으로 전달해야 한다.
    credentials: typeof window !== "undefined" ? "include" : undefined,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.", null, response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(json.message ?? "요청에 실패했습니다.", json.errorCode, response.status);
  }

  return json.data as T;
}

// 가입 폼·온보딩이 기본값으로 채우는 서비스 생성 닉네임(공개, 가입 전).
export async function fetchNicknameSuggestion(): Promise<string> {
  const res = await apiFetch<{ nickname: string }>("/api/members/nickname/suggestion");
  return res.nickname;
}

/**
 * 가입에 필요한 관문을 묻는다(#323). 가입 화면은 비로그인이라
 * `/api/members/me/identity-verification`(로그인 필요)을 쓸 수 없다.
 *
 * 이 값을 프론트 환경변수로 두지 않는 이유: 게이트의 진실은 서버 설정 하나여야 한다.
 * 두 곳에 두면 서버는 요구하는데 화면은 안 받는(또는 그 반대) 상태가 조용히 생긴다.
 */
export async function fetchSignupRequirements(): Promise<{ identityVerificationRequired: boolean }> {
  return apiFetch<{ identityVerificationRequired: boolean }>("/api/members/signup/requirements");
}




export async function apiFetchMultipart<T>(
  path: string,
  formData: FormData,
  accessToken: string | null,
): Promise<T> {
  const response = await fetch(`${resolveApiUrl()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.", null, response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(json.message ?? "사진 분석에 실패했습니다.", json.errorCode, response.status);
  }
  return json.data as T;
}

export async function apiFetchBlob(path: string, accessToken: string | null): Promise<Blob> {
  const response = await fetch(`${resolveApiUrl()}${path}`, {
    method: "GET",
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    cache: "no-store",
  });

  if (response.ok) {
    return response.blob();
  }

  let message = "인증 사진을 불러오지 못했습니다.";
  let errorCode: string | null = null;
  try {
    const json = (await response.json()) as ApiResponse<never>;
    message = json.message ?? message;
    errorCode = json.errorCode;
  } catch {
    // 이미지 API가 JSON 오류 본문을 주지 못한 경우 기본 문구를 사용한다.
  }
  throw new ApiError(message, errorCode, response.status);
}
