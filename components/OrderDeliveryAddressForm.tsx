"use client";

import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loadPostcodeScript } from "@/lib/postcode";
import { FOCUS_RING, INPUT_CLASS } from "@/lib/ui";

// 배송지 미확정 주문에 구매자가 배송지를 입력하는 인라인 폼(#119). 주소록(DeliveryAddressBook)과 달리
// 저장이 아니라 이 주문에만 붙는 스냅샷이라 label·기본지정 없이 배송에 필요한 필드만 받는다.
export default function OrderDeliveryAddressForm({
  auctionId,
  onDone,
}: {
  auctionId: number;
  onDone: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const postcodeBoxRef = useRef<HTMLDivElement>(null);
  const [postcodeOpen, setPostcodeOpen] = useState(false);

  async function openPostcode() {
    setError(null);
    try {
      await loadPostcodeScript();
      setPostcodeOpen(true);
      // 임베드 박스가 렌더된 다음 프레임에 부착.
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
    if (!recipientName.trim() || !postalCode || !address1.trim()) {
      setError("우편번호 찾기로 주소를 선택하고 받는 분·연락처를 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetchWithAuth<void>(`/api/members/me/orders/${auctionId}/delivery-address`, {
        method: "POST",
        body: { recipientName: recipientName.trim(), phone, postalCode, address1: address1.trim(), address2: address2.trim() },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배송지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2 rounded-r2 border border-border bg-surface p-3">
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
          onChange={(e) => setPhone(e.target.value)}
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
      {error && <p role="alert" className="text-[12px] font-semibold text-accent">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className={`self-end rounded-r2 bg-text-1 px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-text-2 disabled:opacity-60 ${FOCUS_RING}`}
      >
        배송지 저장
      </button>
    </div>
  );
}
