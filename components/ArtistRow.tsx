import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { ARTIST_STATUS_LABEL, ARTIST_TYPE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ArtistResponse } from "@/lib/types";

/**
 * 스타 목록의 한 줄(#499). 카드 격자를 대체한다.
 *
 * <p><b>왜 카드가 아니라 줄인가.</b> 지금 등록된 스타 대부분이 {@code imageUrl}이 없다. 얼굴로
 * 찾는 격자는 얼굴이 있어야 성립하는데, 이니셜 원만 깔리면 화면이 비어 보인다. 줄은 타입과
 * 소속사를 같은 높이에 실을 수 있어 <b>이미지가 없어도 각 줄이 제 몫의 정보를 갖는다.</b>
 *
 * <p>구 카드(`ArtistCard`)는 그림자·그라디언트 아바타·연보라 타입 배지를 한 벌씩 갖고 있었고,
 * 24장이 깔리면 그 셋이 24개씩 화면을 채웠다 — 이 레포의 디자인 규칙이 전부 금지하는 것들이다.
 *
 * <p>이미지가 채워지면 그때 격자로 옮기는 것도 가능하다. 반대 방향은 어렵다.
 */
export default function ArtistRow({ artist }: { artist: ArtistResponse }) {
  // 이미지가 없을 때 원을 비워 두지 않는다. 괄호·공백을 뺀 앞 두 글자 —
  // 「(여자)아이들」이 「여자」로 읽히게 하는 처리다.
  const initials = artist.name.replace(/[()\s]/g, "").slice(0, 2);

  // 「그룹 · 플레디스 엔터테인먼트」. 소속사가 없으면 타입만 남는다.
  const sub = [ARTIST_TYPE_LABEL[artist.type], artist.agency].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/artists/${artist.id}`}
      className={`flex items-center gap-3 border-b border-border py-3 transition-colors hover:bg-surface-2 ${FOCUS_RING}`}
    >
      <span
        aria-hidden={artist.imageUrl ? undefined : "true"}
        className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 font-display text-[13px] font-extrabold text-text-3"
      >
        {artist.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
          <img src={mediaUrl(artist.imageUrl)} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold text-text-1">{artist.name}</span>
          {/* 상태 배지는 예외 상태(휴식기·해체)만 띄운다 — 대부분이 활동 중이라 전 줄에 같은
              배지가 붙으면 정보량 없이 시선만 끈다. 구 카드에서 확정된 판단을 그대로 잇는다. */}
          {artist.status !== "ACTIVE" && (
            <span className="shrink-0 rounded-r1 border border-border-2 px-1.5 py-px text-[10px] font-bold text-text-3">
              {ARTIST_STATUS_LABEL[artist.status]}
            </span>
          )}
        </span>
        {sub && <span className="mt-0.5 block truncate text-[11.5px] text-text-3">{sub}</span>}
      </span>

      {artist.nameEn && (
        <span className="hidden shrink-0 text-[11.5px] text-text-3 sm:block">{artist.nameEn}</span>
      )}
    </Link>
  );
}
