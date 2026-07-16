import type { ApiResponse, MediaUploadResponse } from "./types";

// 이 fetch는 서버 컴포넌트(Node)에서도 실행될 수 있는데, 그 환경은 브라우저 쿠키를
// 실을 수 없어 NEXT_PUBLIC_API_URL 누락을 눈치채기 어렵다 — 프로덕션에서는 로컬호스트로
// 조용히 폴백하는 대신 실제로 요청이 나가는 시점에 크게 실패시킨다.
function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL이 설정되지 않았습니다. 프로덕션 배포 시 반드시 지정해야 합니다.");
  }
  return "http://localhost:8080";
}

// 백엔드가 반환하는 /media/** 등은 상대경로라 프론트(3000)가 아니라 백엔드(8080) 기준으로
// 절대 URL을 조합해야 <img src>가 실제 파일을 찾는다.
export function mediaUrl(path: string): string {
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

// multipart 업로드는 apiFetch의 JSON 직렬화·Content-Type과 안 맞아 별도 함수로 분리.
export async function uploadMediaImage(file: File, accessToken: string): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${resolveApiUrl()}/api/media/images`, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  let json: ApiResponse<MediaUploadResponse>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.", null, response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(json.message ?? "이미지 업로드에 실패했습니다.", json.errorCode, response.status);
  }

  return json.data as MediaUploadResponse;
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
