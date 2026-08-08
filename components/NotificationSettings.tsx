"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ToggleSwitch from "@/components/ToggleSwitch";
import type { NotificationSettings as Settings } from "@/lib/types";

// 마이페이지 "알림 설정" 탭 — 1단계는 추월 알림 on/off만. 낙찰·유찰 같은 거래성(정보성) 알림은
// 끌 수 없다(§12.5).
export default function NotificationSettings() {
  const { fetchWithAuth } = useAuth();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSettings(await fetchWithAuth<Settings>("/api/members/me/notification-settings"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "알림 설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 서버 설정을 동기화한다.
    void load();
  }, [load]);

  async function toggleOutbid(next: boolean) {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, outbidEnabled: next }); // 낙관적 반영
    setSaving(true);
    setError(null);
    try {
      const updated = await fetchWithAuth<Settings>("/api/members/me/notification-settings", {
        method: "PATCH",
        body: { outbidEnabled: next },
      });
      setSettings(updated);
    } catch (err) {
      setSettings(prev); // 실패 시 롤백
      setError(err instanceof ApiError ? err.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-text-3">불러오는 중...</p>;
  if (!settings) {
    return (
      <p role="alert" className="rounded-r2 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
        {error ?? "알림 설정을 불러오지 못했습니다."}
      </p>
    );
  }

  return (
    <div className="max-w-xl">
      {error && (
        <p role="alert" className="mb-4 text-xs font-semibold text-accent">
          {error}
        </p>
      )}
      <section className="rounded-r3 border border-border bg-surface p-5">
        <ToggleRow
          title="입찰 추월 알림"
          description="내가 최고 입찰자에서 밀렸을 때 알려드려요."
          checked={settings.outbidEnabled}
          disabled={saving}
          onChange={toggleOutbid}
        />
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm font-bold text-text-2">낙찰·유찰 알림</p>
          <p className="mt-0.5 text-xs text-text-3">
            거래에 꼭 필요한 알림이라 항상 받아요. (끌 수 없어요)
          </p>
        </div>
      </section>
      <p className="mt-3 text-xs text-text-3">알림톡·앱 푸시 등 채널 설정은 준비 중이에요.</p>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-1">{title}</p>
        <p className="mt-0.5 text-xs text-text-3">{description}</p>
      </div>
      <ToggleSwitch checked={checked} disabled={disabled} onChange={onChange} label={title} />
    </div>
  );
}
