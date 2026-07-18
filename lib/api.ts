import type { ApiResponse, MediaUploadResponse, VideoStatusResponse, VideoUploadResponse } from "./types";

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

// 검수영상 업로드 — 원본을 올리면 서버가 트랜스코딩 잡을 걸고 PROCESSING을 반환한다.
export async function uploadMediaVideo(file: File, accessToken: string): Promise<VideoUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${resolveApiUrl()}/api/media/videos`, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  let json: ApiResponse<VideoUploadResponse>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.", null, response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(json.message ?? "영상 업로드에 실패했습니다.", json.errorCode, response.status);
  }
  return json.data as VideoUploadResponse;
}

// 트랜스코딩 상태 지연 폴링 — 프론트가 주기적으로 호출해 READY/FAILED를 감지한다.
export async function getVideoStatus(videoId: string, accessToken: string): Promise<VideoStatusResponse> {
  const response = await fetch(`${resolveApiUrl()}/api/media/videos/${videoId}`, {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let json: ApiResponse<VideoStatusResponse>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.", null, response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(json.message ?? "영상 상태 조회에 실패했습니다.", json.errorCode, response.status);
  }
  return json.data as VideoStatusResponse;
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
