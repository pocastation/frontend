import { apiFetch, ApiError } from "./api";
import type { TokenResponse } from "./types";

export type AdminTotpChallenge = {
  challengeToken: string;
  nextStep: "TOTP_REQUIRED" | "PASS_REQUIRED" | "TOTP_ENROLLMENT_REQUIRED";
  identityVerificationId: string;
  expiresAt: string;
};
export type LoginResponse =
  | TokenResponse
  | { challenge: AdminTotpChallenge; expiresInSeconds: number };
export type TotpEnrollment = {
  challenge: AdminTotpChallenge;
  secret: string;
  otpauthUri: string;
};
export type TotpEnrollmentCompleted = TokenResponse & {
  recoveryCodes: string[];
};

// 인증 API는 일반 fetchWithAuth의 401 갱신·재시도를 적용하지 않는다. 챌린지는 Bearer가 아니다.
export function totpRequest<T>(action: string, body?: unknown): Promise<T> {
  return apiFetch<T>(`/api/auth/admin/totp/${action}`, {
    method: body === undefined ? "GET" : "POST",
    body,
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
}

export function totpError(error: unknown): {
  message: string;
  restart: boolean;
} {
  if (error instanceof ApiError) {
    if (error.errorCode === "ADMIN_TOTP_CHALLENGE_INVALID")
      return {
        message:
          "인증 시간이 만료됐거나 인증 상태가 변경됐어요. 다시 로그인해 주세요.",
        restart: true,
      };
    if (error.errorCode === "ADMIN_TOTP_INVALID")
      return {
        message:
          "인증번호가 일치하지 않거나 이미 사용됐어요. 앱의 새 번호를 입력해 주세요.",
        restart: false,
      };
    if (error.errorCode === "ADMIN_TOTP_IDENTITY_MISMATCH")
      return {
        message:
          "가입 시 본인인증 정보와 일치하지 않아요. 본인 명의로 다시 인증해 주세요. 계속 실패하면 본인인증 기록을 확인해 주세요.",
        restart: false,
      };
    if (error.status === 429)
      return {
        message:
          "인증 시도가 많아 잠시 제한됐어요. 잠시 후 다시 시도해 주세요.",
        restart: false,
      };
    if (error.status === 503)
      return {
        message: "지금은 인증을 진행할 수 없어요. 잠시 후 다시 시도해 주세요.",
        restart: false,
      };
  }
  return {
    message: "인증을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
    restart: false,
  };
}

export function totpDestination(raw: string | null): string {
  // 백슬래시·제어문자 및 인증 화면 재진입을 막는다.
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(raw)
  )
    return "/admin";
  try {
    const url = new URL(raw, "https://pocastation.invalid");
    if (
      url.origin !== "https://pocastation.invalid" ||
      /^\/(auth|login|signup)(\/|$)/.test(url.pathname)
    )
      return "/admin";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/admin";
  }
}
