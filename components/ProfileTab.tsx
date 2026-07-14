"use client";

import { useId, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/ui";

const PROVIDER_LABEL: Record<string, string> = {
  EMAIL: "이메일",
  KAKAO: "카카오",
  NAVER: "네이버",
  GOOGLE: "구글",
};

// 마이페이지 "내 정보" 탭 — 닉네임 변경(기존 PATCH 재사용) + 계정 기본 정보 표시.
export default function ProfileTab() {
  const { member, updateNickname } = useAuth();
  const nicknameId = useId();

  const [nickname, setNickname] = useState(member?.nickname ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!member) return null;

  const provider = member.provider ? (PROVIDER_LABEL[member.provider] ?? member.provider) : null;
  const joinedAt = member.createdAt
    ? new Date(member.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const trimmed = nickname.trim();
  const unchanged = trimmed === member.nickname;

  // 주 1회 제한(#118) — nicknameChangeableAt이 미래면 잠금. 그 시각까지 변경 불가.
  const changeableAt = member.nicknameChangeableAt ? new Date(member.nicknameChangeableAt) : null;
  const locked = changeableAt !== null && changeableAt.getTime() > Date.now();
  const changeableDate = changeableAt
    ? changeableAt.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || unchanged || locked) return;
    setIsSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await updateNickname(trimmed);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "닉네임을 변경하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <section className="rounded-r3 border border-border bg-surface p-5 shadow-card">
        <h2 className="font-display text-sm font-extrabold text-text-1">닉네임</h2>
        <form onSubmit={handleSubmit} className="mt-3 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={nicknameId} className="sr-only">
              닉네임
            </label>
            <input
              id={nicknameId}
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setSaved(false);
              }}
              required
              maxLength={50}
              disabled={locked}
              className={INPUT_CLASS}
            />
            {error && (
              <p role="alert" className="mt-2 text-xs font-semibold text-accent">
                {error}
              </p>
            )}
            {saved && (
              <p role="status" className="mt-2 text-xs font-semibold text-ok">
                닉네임을 변경했어요.
              </p>
            )}
            {locked ? (
              <p className="mt-2 text-xs text-text-3">
                닉네임은 7일에 한 번만 바꿀 수 있어요. 다음 변경 가능일: {changeableDate}
              </p>
            ) : (
              <p className="mt-2 text-xs text-text-3">닉네임은 변경 후 7일간 다시 바꿀 수 없어요.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !trimmed || unchanged || locked}
            className={`shrink-0 px-4 py-2.5 ${PRIMARY_BUTTON_CLASS}`}
          >
            {isSubmitting ? "변경 중..." : "변경"}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-r3 border border-border bg-surface p-5 shadow-card">
        <h2 className="font-display text-sm font-extrabold text-text-1">계정 정보</h2>
        <dl className="mt-3 flex flex-col divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm font-bold text-text-3">이메일</dt>
            <dd className="min-w-0 truncate text-sm font-semibold text-text-1">
              {member.email ?? <span className="font-normal text-text-3">소셜 로그인 계정이라 이메일이 없어요</span>}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm font-bold text-text-3">가입 수단</dt>
            <dd className="text-sm font-semibold text-text-1">
              {provider ? (
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                  {provider}
                </span>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm font-bold text-text-3">가입일</dt>
            <dd className="text-sm font-semibold text-text-1">{joinedAt ?? "-"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-text-3">
          이메일·가입 수단은 변경할 수 없어요. 비밀번호 변경과 회원 탈퇴는 준비 중이에요.
        </p>
      </section>
    </div>
  );
}
