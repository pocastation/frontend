"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { mediaUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notification-context";

type Message = { title: string; message: string; photoUrls?: string[] };

export default function CampaignMessage() {
  const { id } = useParams<{ id: string }>();
  const { member } = useAuth();
  return <MessageDetail key={id + "/" + (member?.id ?? "")} id={id} />;
}

function MessageDetail({ id }: { id: string }) {
  const { fetchWithAuth, accessToken, isLoading } = useAuth();
  const { refresh } = useNotifications();
  const router = useRouter();
  const [content, setContent] = useState<Message | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!accessToken) {
      router.replace("/login?redirect=" + encodeURIComponent("/notifications/campaigns/" + id));
      return;
    }
    let active = true;
    fetchWithAuth<Message>("/api/notification-campaigns/" + id + "/open", { method: "POST" })
      .then(data => { if (active) { setContent(data); refresh(); } })
      .catch(() => { if (active) setError("알림을 열 수 없어요. 수신한 계정으로 로그인했는지 확인해 주세요."); });
    return () => { active = false; };
  }, [accessToken, fetchWithAuth, id, isLoading, refresh, router]);

  return <main className="mx-auto max-w-xl px-gutter py-section">
    <Link href="/notifications" className="text-body-s text-text-2 underline">알림함</Link>
    {content && !error ? <>
      <h1 className="mt-group break-words text-title font-bold">{content.title}</h1>
      <p className="mt-row whitespace-pre-wrap break-words text-body">{content.message}</p>
      {content.photoUrls?.map((url, i) =>
        // eslint-disable-next-line @next/next/no-img-element -- Media URLs already point to the resized display variant.
        <img key={url} src={mediaUrl(url)} alt={`알림 첨부 사진 ${i + 1}`} className="mt-row h-auto max-w-full rounded-card" />
      )}
    </> : <p className="mt-group" role="status">{error || "알림을 여는 중이에요."}</p>}
  </main>;
}
