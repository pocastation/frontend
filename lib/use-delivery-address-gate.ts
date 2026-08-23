"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DeliveryAddress } from "@/lib/types";

/** 서버 관문(backend #269)이 배송지 없는 구매자를 거부할 때 쓰는 코드. */
export const BUYER_DELIVERY_ADDRESS_REQUIRED = "BUYER_DELIVERY_ADDRESS_REQUIRED";

/**
 * 첫 거래 전 배송지 보유 여부(#283). 가격 제안·즉시구매가 공유한다.
 *
 * <p>버튼을 누른 뒤가 아니라 <b>화면에 들어올 때</b> 조회하는 이유는 두 가지다. ① 금액까지 다
 * 정하고 눌렀는데 막히는 좌절을 없앤다 ② 제안판매는 마감이 걸려 있어, 3분 전에 알게 되면 등록할
 * 시간이 없다.
 *
 * <p>비로그인이면 조회하지 않는다 — 그쪽은 로그인 CTA가 먼저 막는다.
 */
export function useDeliveryAddressGate() {
  const { accessToken, fetchWithAuth } = useAuth();
  // null = 아직 모름(로딩 중이거나 조회 실패). 모르는 동안에는 안내를 띄우지 않는다 —
  // 깜빡였다가 사라지는 문구가 없는 것보다 나쁘다.
  const [fetched, setFetched] = useState<boolean | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchWithAuth<DeliveryAddress[]>("/api/members/me/delivery-addresses");
        if (!cancelled) setFetched(list.length > 0);
      } catch {
        // 조회 실패로 게이트를 띄우지 않는다. 서버가 진짜 방어선이라 여기서 틀려도 거래는 막힌다.
        if (!cancelled) setFetched(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, fetchWithAuth]);

  // 비로그인은 상태를 건드리지 않고 파생으로 처리한다 — effect 본문에서 동기로 setState 하면
  // 연쇄 렌더가 되고 린트도 막는다. 계정을 바꾼 직후 앞 계정 값이 잠깐 남을 수 있으나,
  // 그 창에서 잘못 통과해도 서버 관문이 거부한다(`isGateRejection`이 모달로 이어 붙인다).
  const hasAddress = accessToken ? fetched : null;

  /** 등록 직후 호출 — 다시 조회하지 않고 낙관적으로 반영한다(방금 201을 받았다). */
  const markRegistered = useCallback(() => setFetched(true), []);

  /** 화면 게이트를 우회했거나 다른 탭에서 지운 경우 서버가 돌려주는 거부를 알아본다. */
  const isGateRejection = useCallback(
    (err: unknown) => err instanceof ApiError && err.errorCode === BUYER_DELIVERY_ADDRESS_REQUIRED,
    [],
  );

  return { hasAddress, needsAddress: hasAddress === false, markRegistered, isGateRejection };
}
