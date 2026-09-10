"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ORDER_INQUIRY_TOPIC_LABEL, ORDER_INQUIRY_TOPICS } from "@/lib/inquiries";
import { FOCUS_RING, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";
import type { OrderInquiryTopic } from "@/lib/types";

/**
 * 거래 참조 문의 모달(#633, BE #490).
 *
 * <p>배송완료가 잡히지 않아 구매확정이 열리지 않는 거래에서 당사자가 쓸 수 있는 유일한 경로다 —
 * 반품·주문취소·중재 요청은 모두 상태 조건이 걸려 그 상황에서는 눌리지 않는다.
 *
 * <p>주문을 고르는 칸이 없다. 서버가 판매글의 최신 주문 1건을 잡는다(재선택으로 주문이 여럿
 * 쌓인 판매글에서 사용자가 보고 있는 거래는 언제나 최신이다).
 */
export default function OrderInquiryModal({
  auctionId,
  title,
  role,
  onClose,
}: {
  auctionId: number;
  title: string;
  role: "BUYER" | "SELLER";
  onClose: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [topic, setTopic] = useState<OrderInquiryTopic | null>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 접수 후에는 폼을 접고 확인 화면만 남긴다 — 같은 문의를 두 번 넣는 일이 흔하다.
  const [doneId, setDoneId] = useState<number | null>(null);

  async function submit() {
    if (saving) return;
    if (!topic) {
      setError("무엇을 문의하시는지 골라 주세요.");
      return;
    }
    if (!subject.trim() || !content.trim()) {
      setError("제목과 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await fetchWithAuth<{ id: number }>(`/api/auctions/${auctionId}/order/inquiry`, {
        method: "POST",
        body: { topic, title: subject.trim(), content: content.trim() },
      });
      setDoneId(created.id);
    } catch (err) {
      /*
        404는 「주문이 없다」다 — 판매글은 있는데 아직 성사되지 않았거나, 성사 전에 화면이 오래
        열려 있던 경우다. 서버 문구("주문을 찾을 수 없습니다")로는 무엇을 해야 할지 알 수 없어
        일반 문의로 보낸다. 403은 서버 문구가 이미 정확하다("이 거래의 구매자·판매자만…").
      */
      setError(
        err instanceof ApiError && err.status === 404
          ? "아직 거래가 성사되지 않아 거래 문의를 넣을 수 없어요. 일반 문의를 이용해 주세요."
          : err instanceof ApiError
            ? err.message
            : "문의를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-r3 border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="거래 문의"
      >
        {doneId !== null ? (
          <>
            <p className="text-sm font-bold text-text-1">문의를 접수했어요</p>
            <p className="mt-1.5 text-xs leading-relaxed text-text-2">
              운영팀이 이 거래의 결제·배송 기록을 함께 보고 답변해요. 답변이 등록되면 알림으로
              알려드려요.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onClose} className={`h-10 flex-1 ${SECONDARY_BUTTON_CLASS}`}>
                닫기
              </button>
              <Link
                href={`/inquiries/${doneId}`}
                className={`flex h-10 flex-1 items-center justify-center ${PRIMARY_BUTTON_CLASS}`}
              >
                문의 보기
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-text-1">이 거래로 문의하기</p>
            <p className="mt-1 text-xs text-text-3">
              <b className="font-bold text-text-2">{title}</b> 거래예요 ·{" "}
              {role === "BUYER" ? "구매자" : "판매자"}로 접수돼요
            </p>

            <fieldset className="mt-4">
              <legend className="text-xs font-bold text-text-2">무엇을 문의하시나요?</legend>
              <div className="mt-2 divide-y divide-border rounded-r3 border border-border">
                {ORDER_INQUIRY_TOPICS.map((code) => (
                  <label
                    key={code}
                    className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm ${
                      topic === code ? "font-bold text-text-1" : "font-semibold text-text-2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="order-inquiry-topic"
                      value={code}
                      checked={topic === code}
                      onChange={() => setTopic(code)}
                      className={`h-3.5 w-3.5 shrink-0 accent-primary ${FOCUS_RING}`}
                    />
                    <span>{ORDER_INQUIRY_TOPIC_LABEL[code]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 block">
              <span className="text-xs font-bold text-text-2">제목</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                placeholder="발송 12일째인데 배송 조회가 멈춰 있어요"
                className={`mt-1.5 h-12 w-full rounded-r3 border border-border bg-surface px-3 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
              />
            </label>

            <label className="mt-3.5 block">
              <span className="text-xs font-bold text-text-2">자세한 내용</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 3000))}
                rows={4}
                placeholder="언제부터 어떤 상태인지, 택배사에 확인한 내용이 있으면 함께 적어주세요."
                className={`mt-1.5 w-full resize-none rounded-r3 border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder:text-text-3 ${FOCUS_RING}`}
              />
              <span className="mt-1 block text-right text-[11px] text-text-3">{content.length}/3000</span>
            </label>

            <div className="mt-3 rounded-r3 border border-border bg-surface-2 px-3.5 py-2.5 text-[11px] leading-relaxed text-text-2">
              운영팀이 <b className="font-bold text-text-1">이 거래의 결제·배송 기록을 함께 보고</b>{" "}
              답변해요. 답변은 알림과 <b className="font-bold text-text-1">문의 내역</b>에서 확인할 수
              있어요. 하루에 접수할 수 있는 문의는 10건이에요.
            </div>

            {error && <p className="mt-3 text-xs font-semibold text-accent">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onClose} className={`h-10 flex-1 ${SECONDARY_BUTTON_CLASS}`}>
                닫기
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className={`h-10 flex-1 disabled:opacity-60 ${PRIMARY_BUTTON_CLASS}`}
              >
                {saving ? "접수 중…" : "문의 접수"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
