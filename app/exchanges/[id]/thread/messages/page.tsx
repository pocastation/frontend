"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MobilePageHead from "@/components/mobile/MobilePageHead";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTimeKST } from "@/lib/format";
import { useNotifications } from "@/lib/notification-context";
import type { ExchangeThreadResponse } from "@/lib/types";

export default function ExchangeMessagesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { member, fetchWithAuth, isLoading } = useAuth();
  const { refresh: refreshBell } = useNotifications();
  const [thread, setThread] = useState<ExchangeThreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const notificationId = new URLSearchParams(window.location.search).get("notificationId");
    if (!member) {
      const destination = window.location.pathname + window.location.search;
      router.replace(`/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }

    let current = true;
    async function loadMessages() {
      try {
        const response = await fetchWithAuth<ExchangeThreadResponse>(`/api/exchanges/${id}/thread?latestMessages=true`);
        if (!current) return;
        setThread(response);
        setError(null);
        if (notificationId && /^\d+$/.test(notificationId)) {
          void fetchWithAuth<void>(`/api/members/me/notifications/${notificationId}/read`, { method: "PATCH" })
            .then(refreshBell)
            .catch(() => {});
        }
      } catch (err) {
        if (current) setError(err instanceof ApiError ? err.message : "교환 대화를 불러오지 못했어요.");
      }
    }

    function refreshWhenVisible() {
      if (!document.hidden) void loadMessages();
    }
    void loadMessages();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      current = false;
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [fetchWithAuth, id, isLoading, member, refreshBell, router]);

  return (
    <>
      <MobilePageHead title="교환 대화" />
      <main className="mx-auto max-w-xl px-gutter pb-footer pt-page">
        <h1 className="hidden text-title font-extrabold text-text-1 sm:block">교환 대화</h1>
        {error ? (
          <p role="alert" className="mt-head text-body text-danger">{error}</p>
        ) : !thread ? (
          <p className="mt-head text-body text-text-3">대화를 불러오는 중이에요.</p>
        ) : thread.messages.length === 0 ? (
          <p className="mt-head text-body text-text-3">아직 주고받은 메시지가 없어요.</p>
        ) : (
          <ol className="mt-card divide-y divide-border border-y border-border">
            {[...thread.messages].reverse().map((message) => (
              <li key={message.id} className="py-row">
                <div className="flex justify-between gap-tight text-label">
                  <span className="font-bold text-text-1">
                    {message.mine ? "나" : thread.counterpartNickname ?? "교환 상대"}
                  </span>
                  <time dateTime={message.createdAt} className="text-text-3">{formatDateTimeKST(message.createdAt)}</time>
                </div>
                <p className="mt-tight whitespace-pre-wrap break-words text-body text-text-1">{message.body}</p>
              </li>
            ))}
          </ol>
        )}
        <Link href={`/exchanges/${id}/thread`} className="mt-card inline-block text-body-s font-bold underline underline-offset-2">
          교환 확정 화면 보기
        </Link>
      </main>
    </>
  );
}
