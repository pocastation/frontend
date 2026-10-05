"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ToggleSwitch from "@/components/ToggleSwitch";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { ConsentPreference, OptionalConsentType } from "@/lib/types";
import { FOCUS_RING } from "@/lib/ui";

/**
 * 마이 「수신 동의」(#784). 가입 때 받은 선택 동의 2개를 나중에 확인하고 켜거나 끈다.
 *
 * <p>항목 이름은 가입 화면(ConsentFields)과 같게 둔다 — 동의한 문구와 철회하는 문구가 다르면 무엇을
 * 철회하는지 헷갈린다. 바꾸면 처리 결과와 일시를 토스트로 알린다(마케팅 수신 철회의 처리 결과 고지,
 * 정보통신망법 §50 — 별도 발송이 필요한지는 법무 확인 중이고 백엔드 #558 TODO에 남아 있다).
 *
 * <p>필수 동의가 비어 있는 회원도 「끄기」는 된다(백엔드가 철회만 열어 둔다). 「켜기」는 403으로 막히고
 * 그 안내를 그대로 보여준다.
 */
const ITEMS: { type: OptionalConsentType; title: string; description: string }[] = [
  {
    type: "PERSONAL_INFO_OPTIONAL",
    title: "맞춤형 서비스를 위한 개인정보 수집·이용",
    description: "추천·개인화처럼 거래에 꼭 필요하지 않은 처리에 쓰는 정보예요. 꺼도 거래는 그대로 돼요.",
  },
  {
    type: "MARKETING",
    title: "이메일·알림톡 수신",
    description: "이벤트·혜택 같은 광고성 정보를 이메일과 카카오 알림톡으로 받아요.",
  },
];

const SHORT_TITLE: Record<OptionalConsentType, string> = {
  PERSONAL_INFO_OPTIONAL: "맞춤형 서비스 개인정보 수집·이용",
  MARKETING: "이메일·알림톡 수신",
};

function stamp(iso: string, withTime = false): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const date = `${get("year")}.${get("month")}.${get("day")}`;
  return withTime ? `${date} ${get("hour")}:${get("minute")}` : date;
}

export default function ConsentPreferencesTab() {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = useState<ConsentPreference[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<OptionalConsentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth<ConsentPreference[]>("/api/members/me/consent-preferences")
      .then((data) => {
        if (!cancelled) setPrefs(data);
      })
      .catch(() => {
        if (!cancelled) setError("동의 상태를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchWithAuth]);

  async function change(type: OptionalConsentType, agreed: boolean) {
    setSaving(type);
    setError(null);
    try {
      const next = await fetchWithAuth<ConsentPreference>("/api/members/me/consent-preferences", {
        method: "PUT",
        body: { type, agreed },
      });
      setPrefs((prev) => prev?.map((p) => (p.type === type ? next : p)) ?? prev);
      toast.show({
        variant: "success",
        text: `${SHORT_TITLE[type]} 동의를 ${agreed ? "했어요" : "철회했어요"}`,
        sub: next.changedAt ? stamp(next.changedAt, true) : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(null);
    }
  }

  if (!prefs && !error) return <p className="py-empty text-center text-body-s text-text-3">불러오는 중...</p>;

  return (
    <div className="max-w-xl">
      {error && (
        <p role="alert" className="mb-4 rounded-card bg-surface-2 px-4 py-3 text-body-s font-semibold text-danger">
          {error}
        </p>
      )}
      {prefs && (
        <ul>
          {ITEMS.map((item) => {
            const pref = prefs.find((p) => p.type === item.type);
            const agreed = pref?.agreed ?? false;
            return (
              <li key={item.type} className="border-b border-border py-row">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-l font-bold text-text-1">{item.title}</p>
                    <p className="mt-1 text-body-s text-text-2">
                      {item.description} <span className="text-text-3">(선택)</span>
                    </p>
                  </div>
                  <div className="pt-1">
                    <ToggleSwitch
                      checked={agreed}
                      disabled={saving !== null}
                      onChange={(next) => change(item.type, next)}
                      label={item.title}
                    />
                  </div>
                </div>
                <p className="mt-tight text-label text-text-3">
                  {pref?.changedAt ? `${stamp(pref.changedAt)} ${agreed ? "동의" : "동의 안 함"}` : "아직 선택하지 않았어요"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-row text-label text-text-3">
        거래 진행에 꼭 필요한 알림(제안·결제·배송)은 동의와 관계없이 보내요. 필수 동의는 회원 탈퇴로만 철회할 수 있어요.{" "}
        <Link href="/privacy" className={`text-text-2 underline underline-offset-2 ${FOCUS_RING}`}>
          개인정보 처리방침
        </Link>
      </p>
    </div>
  );
}
