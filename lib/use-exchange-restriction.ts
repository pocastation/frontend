"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { MyExchangeRestriction } from "@/lib/types";

/**
 * 내 교환 제한 상태(#824, backend#612). 노쇼가 90일 안에 2번이면 30일간 교환글 등록·신청이 막힌다.
 *
 * <p>등록·신청 화면이 폼을 채우기 전에 막혀 있음을 알리려고 부른다. 서버도 제출을 거절하지만, 다 쓰고 나서
 * 거절을 보면 쓴 내용이 헛수고가 된다. 조회가 실패하면 null로 두고 폼을 그대로 연다(제출에서 서버가 막는다).
 */
export function useExchangeRestriction(): MyExchangeRestriction | null {
  const { member, fetchWithAuth } = useAuth();
  const [restriction, setRestriction] = useState<MyExchangeRestriction | null>(null);

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    fetchWithAuth<MyExchangeRestriction>("/api/members/me/exchange-restriction")
      .then((res) => {
        if (!cancelled) setRestriction(res);
      })
      .catch(() => {
        // 조회 실패는 막지 않는다. 제출 단계에서 서버가 판단한다.
      });
    return () => {
      cancelled = true;
    };
  }, [member, fetchWithAuth]);

  return restriction;
}
