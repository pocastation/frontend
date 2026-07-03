import type { ApiResponse } from "./types";

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
