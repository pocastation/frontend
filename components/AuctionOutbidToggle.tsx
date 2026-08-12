"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import ToggleSwitch from "@/components/ToggleSwitch";

type Setting = { outbidEnabled: boolean };

// 경매 상세의 "이 경매 추월 알림" 토글(§12.5 경매별 설정). 개인 기본(마이페이지)을 오버라이드한다.
// 비로그인·비LIVE에서는 렌더하지 않고(상위에서 LIVE만 전달), 로그인 확정 후 현재 해석값을 불러온다.
// 판매자 본인(내 경매)에게는 노출하지 않는다 — 본인 경매엔 입찰이 불가해 추월 알림이 무의미하다.
export default function AuctionOutbidToggle({
  auctionId,
  sellerNickname,
}: {
  auctionId: number;
  sellerNickname: string;
}) {
  const { member, accessToken, isLoading, fetchWithAuth } = useAuth();
  const isOwnAuction = member?.nickname != null && member.nickname === sellerNickname;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const path = `/api/members/me/notification-settings/auctions/${auctionId}`;

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth<Setting>(path);
      setEnabled(res.outbidEnabled);
    } catch {
      // 로드 실패 시 토글을 감춘다(null 유지) — 조용히 무시.
    }
  }, [fetchWithAuth, path]);

  useEffect(() => {
    if (isLoading || !accessToken || isOwnAuction) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 인증 확정 후 현재 설정 1회 로드.
    void load();
  }, [accessToken, isLoading, isOwnAuction, load]);

  async function toggle() {
    if (enabled === null || saving) return;
    const next = !enabled;
    setEnabled(next); // 낙관적 반영
    setSaving(true);
    try {
      await fetchWithAuth<Setting>(path, { method: "PATCH", body: { outbidEnabled: next } });
    } catch {
      setEnabled(!next); // 실패 롤백
    } finally {
      setSaving(false);
    }
  }

  // 비로그인·본인 경매·아직 로드 전이면 렌더하지 않는다.
  if (!accessToken || isOwnAuction || enabled === null) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-4 rounded-r2 border border-border bg-surface px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-bold text-text-1">이 경매 추월 알림</p>
        <p className="mt-0.5 text-[11px] text-text-3">더 높은 입찰로 밀리면 알려드려요.</p>
      </div>
      <ToggleSwitch checked={enabled} disabled={saving} onChange={toggle} label="이 경매 추월 알림" />
    </div>
  );
}
