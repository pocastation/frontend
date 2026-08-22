"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loadPostcodeScript } from "@/lib/postcode";
import { formatPhoneInput } from "@/lib/phone";
import { FOCUS_RING, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/lib/ui";

/**
 * 첫 거래 전 배송지 등록 모달(#283) — 서버 관문(backend #269)의 짝이다.
 *
 * <p>거래 성사 후 배송지를 확정하는 {@code DeliveryAddressModal}과 목적이 다르다. 저건 이미 성립한
 * 주문에 주소를 박는 것이고, 이건 <b>거래가 성립하기 전에</b> 주소록을 하나 만드는 것이다.
 * 그래서 저장된 배송지를 고르는 선택지가 없다 — 하나도 없어서 여기까지 온 것이다.
 *
 * <p><b>저장해도 제안을 대신 눌러주지 않는다.</b> 약관 §13조의2 ②상 가격 제안은 청약이고 취소할 수
 * 없다. 사용자가 누른 것은 「저장하고 계속」이지 「가격 제안」이 아니라, 자동으로 이어 붙이면 동의한 적
 * 없는 의사표시가 나간다. 호출부는 {@code onSaved}에서 모달만 닫고 원래 버튼을 되살린다.
 */
export default function DeliveryAddressGateModal({
  action,
  onClose,
  onSaved,
}: {
  /** "가격 제안" · "구매" — 안내 문구에 그대로 들어간다. */
  action: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeBoxRef = useRef<HTMLDivElement>(null);

  async function openPostcode() {
    setError(null);
    try {
      await loadPostcodeScript();
      setPostcodeOpen(true);
      requestAnimationFrame(() => {
        const box = postcodeBoxRef.current;
        if (!box || !window.daum?.Postcode) return;
        box.innerHTML = "";
        new window.daum.Postcode({
          oncomplete: (data) => {
            setPostalCode(data.zonecode);
            setAddress1(data.roadAddress || data.jibunAddress);
            setPostcodeOpen(false);
          },
          width: "100%",
          height: "100%",
        }).embed(box);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "우편번호 서비스를 불러오지 못했습니다.");
    }
  }

  async function submit() {
    if (saving) return;
    setError(null);
    if (!recipientName.trim() || !phone || !postalCode || !address1.trim()) {
      setError("우편번호 찾기로 주소를 선택하고 받는 분·연락처를 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      // 첫 배송지는 서버가 자동으로 기본 배송지로 잡는다 — 그래야 다음 거래부터 자동 확정된다.
      await fetchWithAuth<unknown>("/api/members/me/delivery-addresses", {
        method: "POST",
        body: {
          label: "기본 배송지",
          recipientName: recipientName.trim(),
          phone,
          postalCode,
          address1: address1.trim(),
          address2: address2.trim(),
          isDefault: true,
        },
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "배송지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
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
        aria-label={`${action} 전 배송지 등록`}
      >
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-primary">{action} 전 한 가지</p>
        <p className="mt-1.5 font-display text-[17px] font-extrabold tracking-[-0.03em] text-text-1">
          받을 주소를 먼저 등록해 주세요
        </p>
        <p className="mt-2 text-[12.5px] leading-[1.7] text-text-3">
          거래가 성사되면 판매자가 바로 보낼 수 있게 주소가 필요해요.{" "}
          <b className="font-bold text-text-2">한 번만 등록하면 다음부터는 물어보지 않아요.</b>
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className={`${INPUT_CLASS} flex-1`}
              placeholder="받는 분"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
            <input
              className={`${INPUT_CLASS} flex-1`}
              placeholder="연락처 (010-0000-0000)"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            />
          </div>
          <div className="flex gap-2">
            <input className={`${INPUT_CLASS} w-28`} placeholder="우편번호" value={postalCode} readOnly />
            <button
              type="button"
              onClick={openPostcode}
              className={`shrink-0 rounded-r2 border border-border-2 bg-surface px-3 text-xs font-bold text-text-2 transition-colors hover:border-text-3 hover:text-text-1 ${FOCUS_RING}`}
            >
              우편번호 찾기
            </button>
          </div>
          {postcodeOpen && (
            <div ref={postcodeBoxRef} className="h-72 w-full overflow-hidden rounded-r2 border border-border" />
          )}
          <input className={INPUT_CLASS} placeholder="기본 주소" value={address1} readOnly />
          <input
            className={INPUT_CLASS}
            placeholder="상세 주소 (동·호수 등)"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs font-semibold text-accent">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 ${SECONDARY_BUTTON_CLASS}`}
          >
            나중에 하기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`flex-1 py-2.5 disabled:opacity-50 ${PRIMARY_BUTTON_CLASS}`}
          >
            {saving ? "저장 중..." : "저장하고 계속"}
          </button>
        </div>
      </div>
    </div>
  );
}
