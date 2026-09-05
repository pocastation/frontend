"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminNotice from "@/components/AdminNotice";
import { ApiError, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKRW, formatTimeLeft } from "@/lib/format";
import { FOCUS_RING } from "@/lib/ui";
import type { AdminAuctionSummary } from "@/lib/types";

/**
 * 홈 배너 운영(#552, BE #428).
 *
 * <p>배너는 오래 단일 슬롯이었다. 서버가 5건과 노출 순서를 받게 되면서 「몇 번째로 보일지」가
 * 관리자의 결정 사항이 됐는데, 그걸 정할 화면이 없었다.
 *
 * <p>지정 자체는 여기서 하지 않는다 — 매물을 찾으려면 검색·필터가 필요하고 그건 매물 관리의 일이다.
 * 이 화면은 <b>이미 지정된 것들의 순서와 현황</b>만 맡는다.
 */

const MAX_FEATURED = 5;

export default function AdminBannerPage() {
  const { fetchWithAuth } = useAuth();
  const [items, setItems] = useState<AdminAuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchWithAuth<AdminAuctionSummary[]>("/api/admin/auctions/featured"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배너 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 서버 목록을 1회 로드.
    void load();
  }, [load]);

  /*
    순서 변경은 화면을 먼저 바꾸고 서버에 보낸다. 한 칸 이동에 왕복을 기다리게 하면 연속으로
    누를 때 순서가 튄다. 실패하면 서버 상태를 다시 읽어 되돌린다 — 낙관적 갱신을 되돌리는 값을
    직접 만들지 않는 이유는, 그사이 다른 관리자가 바꿨을 수 있어서다.
  */
  async function move(index: number, delta: number) {
    const next = index + delta;
    if (busy || next < 0 || next >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setItems(reordered);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fetchWithAuth<void>("/api/admin/auctions/featured/order", {
        method: "PATCH",
        body: { auctionIds: reordered.map((item) => item.id) },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "순서를 바꾸지 못했습니다.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function drop(item: AdminAuctionSummary) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fetchWithAuth<void>(`/api/admin/auctions/${item.id}/featured`, {
        method: "PATCH",
        body: { featured: false },
      });
      setNotice(`「${item.title}」을 배너에서 내렸어요.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "배너에서 내리지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-1">
        <h1 className="font-display text-xl font-extrabold text-text-1">홈 배너</h1>
        <p className="mt-1 text-sm text-text-3">
          홈 첫 화면에 세울 매물이에요. 위에서부터 차례로 넘어가고, 5초마다 다음 장으로 바뀌어요.
        </p>
      </header>

      <div className="mb-4 flex items-center">
        <span className="ml-auto text-xs tabular-nums text-text-3">
          {items.length} / {MAX_FEATURED} 지정
        </span>
      </div>

      {notice && (
        <AdminNotice kind="success" className="mb-3">
          {notice}
        </AdminNotice>
      )}
      {error && (
        <AdminNotice kind="error" className="mb-3">
          {error}
        </AdminNotice>
      )}

      <div className="overflow-hidden rounded-r3 border border-border bg-surface">
        {loading ? (
          <p className="py-20 text-center text-sm text-text-3">불러오는 중...</p>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm font-bold text-text-2">지정된 매물이 없어요</p>
            <p className="mt-1 text-sm text-text-3">홈에는 브랜드 소개 한 장만 보여요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item, i) => (
              <li key={item.id} className="flex items-center gap-3.5 px-4 py-3.5">
                {/* 1번만 보라다. 순위가 아니라 「지금 첫 화면인 것」을 가리키므로 하나면 충분하다. */}
                <span
                  className={`w-[22px] flex-shrink-0 text-center font-display text-[15px] font-extrabold tabular-nums ${
                    i === 0 ? "text-primary" : "text-text-3"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="h-[45px] w-[34px] flex-shrink-0 overflow-hidden rounded-[4px] bg-surface-2">
                  {item.representativeThumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
                    <img
                      src={mediaUrl(item.representativeThumbnailUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {item.artistName && (
                    <span className="block truncate text-[11px] font-extrabold text-text-3">{item.artistName}</span>
                  )}
                  <Link
                    href={`/auctions/${item.id}`}
                    className={`block truncate text-[13.5px] font-bold text-text-1 hover:text-primary ${FOCUS_RING}`}
                  >
                    {item.title}
                  </Link>
                  <span className="block truncate text-[11.5px] tabular-nums text-text-3">
                    제안 {item.bidCount}회{item.endAt && ` · 마감 ${formatTimeLeft(item.endAt)}`}
                  </span>
                </span>
                <span className="flex-shrink-0 text-right text-[13px]">
                  <b className="block font-display font-extrabold tabular-nums">{formatKRW(item.currentPrice)}</b>
                  <span className="block text-[11px] font-medium text-text-3">최소가</span>
                </span>
                <span className="flex flex-shrink-0 gap-1">
                  <MoveButton dir="up" disabled={busy || i === 0} onClick={() => void move(i, -1)} />
                  <MoveButton dir="down" disabled={busy || i === items.length - 1} onClick={() => void move(i, 1)} />
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void drop(item)}
                  className={`h-[30px] flex-shrink-0 rounded-r2 border border-border-2 px-3 text-xs font-bold text-text-2 transition-colors hover:border-text-1 hover:text-text-1 disabled:opacity-40 ${FOCUS_RING}`}
                >
                  내리기
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-text-3">
        매물을 새로 올리려면{" "}
        <Link href="/admin/auctions?status=LIVE" className={`font-bold text-text-2 hover:text-primary ${FOCUS_RING}`}>
          매물 관리
        </Link>
        에서 찾아 「배너」를 켜세요. 여기서는 순서를 바꾸거나 내릴 수 있어요. 지정한 매물이 팔리거나 취소되면
        배너에서 자동으로 빠져요.
      </p>

      {items.length >= MAX_FEATURED && (
        <p className="mt-4 border-l-2 border-warn py-2 pl-3 text-[12.5px] text-text-2">
          자리가 다 찼어요. 매물 관리에서 「배너」를 켜려 하면 막히고, 먼저 여기서 한 건을 내려야 해요.
        </p>
      )}
    </div>
  );
}

/** 순서 이동 — 위/아래 한 칸. 드래그를 쓰지 않는 이유는 최대 5행이라 얻는 게 없어서다. */
function MoveButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === "up" ? "위로 옮기기" : "아래로 옮기기"}
      className={`flex h-7 w-7 items-center justify-center rounded-[6px] border border-border-2 text-text-2 transition-colors hover:border-text-1 hover:text-text-1 disabled:border-border disabled:text-border-2 disabled:hover:border-border ${FOCUS_RING}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        {dir === "up" ? <path d="m6 15 6-6 6 6" /> : <path d="m6 9 6 6 6-6" />}
      </svg>
    </button>
  );
}
