// 본인확인 표준창 호출(#323 스텁 → #386 실연동).
//
// 가입 폼과 본인인증 패널이 **같은 함수를 쓴다.** 두 곳에 따로 적으면 대행사를 붙이는 날
// 한쪽만 고쳐진 채로 남고, 그 사실은 인증이 안 되는 화면을 누가 밟아야 드러난다.
//
// 인증기관은 **다날**이고, 연동은 **포트원 V2를 경유**한다. 다날과 직접 계약(CPID)했지만
// 그 CPID를 포트원 콘솔 채널에 등록하는 구조다.

import * as PortOne from "@portone/browser-sdk/v2";
import { envValue } from "@/lib/env";
import { SITE_URL } from "@/lib/site";

const STORE_ID = envValue(process.env.NEXT_PUBLIC_PORTONE_STORE_ID);
// 결제 채널키(NEXT_PUBLIC_PORTONE_CHANNEL_KEY)와 **다른 값**이다. 결제는 갤럭시아, 본인인증은
// 다날이라 같은 스토어 안의 별개 채널이다 — 한 변수로 묶으면 둘 중 하나가 반드시 틀린다.
const CHANNEL_KEY = envValue(process.env.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY);

/**
 * 다날 CPTITLE — 인증창에 표시되는 서비스 경로.
 *
 * 넘기지 않으면 포트원이 「포트원」을 기본값으로 채워, 사용자가 처음 보는 화면에 우리 서비스가
 * 아닌 이름이 뜬다. 포트원 문서도 KISA ePrivacy Clean 연동을 위해 설정을 권장한다.
 * 다날 규격서의 예시가 스킴 없는 호스트(`www.MarketB.co.kr`)라 호스트만 넘긴다.
 */
function cpTitle(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "pocastation.com";
  }
}

/** 채널 설정이 들어와 있는지. 설정 누락을 "인증 실패"로 뭉뚱그리지 않으려고 분리한다. */
export function isIdentityWindowReady(): boolean {
  return Boolean(STORE_ID && CHANNEL_KEY);
}

/**
 * 대행사 표준창을 띄우고 발급 식별자를 받아온다.
 *
 * ⚠️ **인증 결과(CI·생년월일 등)를 여기서 만들어 서버로 보내면 안 된다.** 위조된 인증이 그대로
 * 저장된다. 서버가 이 식별자로 대행사에 다시 조회해 결과를 확정한다(BE #293·#297·#342).
 * 다날 취약점 자체점검 체크리스트 2번(파라미터 변조)이 요구하는 구조가 이것이다.
 *
 * @param redirectUrl 모바일 리다이렉트 방식에서 인증 후 돌아올 주소. 넘기면 그 주소로 돌아오며
 *   이 함수는 반환하지 않는다(페이지가 떠난다) — 복귀 처리는 {@link readRedirectedReceiptId}가 맡는다.
 * @returns 대행사 발급 식별자. 채널 설정이 없으면 null.
 * @throws 인증을 취소했거나 실패했을 때. 메시지를 그대로 사용자에게 보여줄 수 있다.
 */
export async function openIdentityWindow(redirectUrl?: string): Promise<string | null> {
  if (!isIdentityWindowReady()) {
    return null;
  }
  // 이미 완료된 식별자로 다시 요청하면 실패한다 — 매 시도마다 새로 채번한다.
  const identityVerificationId = `identity-${crypto.randomUUID()}`;
  const response = await PortOne.requestIdentityVerification({
    storeId: STORE_ID,
    channelKey: CHANNEL_KEY,
    identityVerificationId,
    redirectUrl,
    bypass: { danal: { CPTITLE: cpTitle() } },
  });

  // 리다이렉트로 빠졌으면 여기까지 오지 않는다. 왔는데 응답이 없으면 창이 열리지 못한 것이다.
  if (!response) {
    throw new Error("본인인증 창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  if (response.code !== undefined) {
    // 사용자가 취소한 경우도 여기로 온다. PG 문구가 이미 사용자용이라 그대로 보여준다.
    throw new Error(response.message || "본인인증이 완료되지 않았어요.");
  }
  return response.identityVerificationId;
}

/** 리다이렉트 복귀에 실려 오는 쿼리 파라미터 이름들. 포트원이 붙여 준다. */
const REDIRECT_ID_PARAM = "identityVerificationId";
const REDIRECT_CODE_PARAM = "code";
const REDIRECT_MESSAGE_PARAM = "message";

export type RedirectedIdentityResult =
  | { kind: "verified"; receiptId: string }
  | { kind: "failed"; message: string };

/**
 * 모바일 리다이렉트로 돌아왔을 때 결과를 읽는다.
 *
 * <b>URL에서 파라미터를 지우는 것은 호출부의 몫</b>이다 — 남겨 두면 새로고침할 때마다 같은
 * 식별자를 다시 서버로 보내고, 그 식별자는 이미 선점돼 있어 "이미 사용된 인증 정보"만 반복된다.
 */
export function readRedirectedIdentityResult(
  search: URLSearchParams,
): RedirectedIdentityResult | null {
  const code = search.get(REDIRECT_CODE_PARAM);
  if (code) {
    return { kind: "failed", message: search.get(REDIRECT_MESSAGE_PARAM) || "본인인증이 완료되지 않았어요." };
  }
  const receiptId = search.get(REDIRECT_ID_PARAM);
  return receiptId ? { kind: "verified", receiptId } : null;
}

/**
 * 복귀 파라미터를 지운 **절대 주소**.
 *
 * ⚠️ 상대 경로를 돌려주면 안 된다 — 포트원이 `redirectUrl`을 URL로 파싱해서
 * "redirectUrl 파라미터가 URL 형식이 아닙니다"로 거부한다(2026-08-24 preview에서 확인).
 * `history.replaceState`는 같은 출처의 절대 주소도 그대로 받는다.
 */
export function stripIdentityRedirectParams(url: URL): string {
  [REDIRECT_ID_PARAM, REDIRECT_CODE_PARAM, REDIRECT_MESSAGE_PARAM, "transactionType", "txId"].forEach(
    (key) => url.searchParams.delete(key),
  );
  return url.toString();
}

/** 채널 설정이 아직 없을 때 사용자에게 보여줄 문구. 두 화면이 같은 말을 하게 한다. */
export const IDENTITY_NOT_READY_MESSAGE =
  "본인인증 기능을 준비하고 있어요. 준비되면 알려드릴게요.";
