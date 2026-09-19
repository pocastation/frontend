import Link from "next/link";
import { isClosingSoon, itemDetail, itemName, slotLabel } from "@/lib/exchange-labels";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { ExchangeFeedItem } from "@/lib/types";

/**
 * 피드 행 하나.
 *
 * <p>「보유 / 희망」 라벨을 매 행에 반복하지 않는다. 라벨을 두 줄로 세우면 목록이 표처럼 읽히고,
 * 스무 건을 훑는 화면에서 같은 글자가 마흔 번 반복된다. 방향은 화살표가 말하고 색은
 * <b>내가 받을 쪽</b>에만 쓴다.
 *
 * <p>썸네일은 여러 장일 때 겹쳐 쌓아 장수를 함께 알린다 — 숫자만 적으면 사진이 더 있다는 것이
 * 눈에 안 들어온다.
 */
export default function ExchangeFeedRow({ item }: { item: ExchangeFeedItem }) {
  const soon = isClosingSoon(item.expiresAt);
  const firstSlot = item.slots[0];

  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/exchanges/${item.id}`}
        className={`flex gap-2.5 py-3 ${FOCUS_RING}`}
      >
        <span className="relative block h-[62px] w-[52px] shrink-0">
          {item.photoCount > 1 && (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-[5px] -translate-y-[3px] rotate-[5deg] rounded-r1 border border-border bg-surface-2"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-[2px] -translate-y-[1px] rotate-[2deg] rounded-r1 border border-border bg-surface-2"
              />
            </>
          )}
          <span className="absolute inset-0 overflow-hidden rounded-r1 border border-border bg-surface-2">
            {item.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
              <img
                src={mediaUrl(item.thumbnailUrl)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </span>
          {item.photoCount > 1 && (
            <span className="absolute -bottom-0.5 -right-0.5 rounded-[2px] bg-text-1 px-[3.5px] font-display text-[9.5px] font-extrabold text-white">
              {item.photoCount}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.018em] text-text-1">
            <span className="truncate">{itemName(item.have)}</span>
            <span aria-label="교환" className="shrink-0 text-xs font-semibold text-text-3">→</span>
            <span className="truncate text-primary">
              {item.wants.map(itemName).join(" · ") || "—"}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-text-3">{itemDetail(item.have)}</span>
          <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-text-2">
            {soon && (
              <span className="rounded-[2px] border border-[#f0d9ae] px-1 text-[10px] font-extrabold text-warn">
                마감 임박
              </span>
            )}
            {firstSlot && <span className="shrink-0">{slotLabel(firstSlot)}</span>}
            {firstSlot && <i aria-hidden="true" className="h-[2px] w-[2px] shrink-0 rounded-full bg-border-2" />}
            <span className="truncate">{item.place}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
