import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { ARTIST_STATUS_TONE, ARTIST_STATUS_LABEL, ARTIST_TYPE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ArtistResponse } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function ArtistCard({ artist }: { artist: ArtistResponse }) {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className={`relative flex flex-col items-center rounded-r4 border border-border bg-surface p-4 pt-5 text-center shadow-card transition-all hover:-translate-y-[3px] hover:border-primary ${FOCUS_RING}`}
    >
      {/* 상태 배지는 '활동 중'을 빼고 예외 상태(휴식기·해체)만 노출한다. 대부분이 ACTIVE라
          전 카드에 같은 배지가 붙어 정보량 없이 시선만 끌었다. 해체·휴식기는 계속 감추지 않는다. */}
      {artist.status !== "ACTIVE" && (
        <StatusBadge tone={ARTIST_STATUS_TONE[artist.status]} className="absolute right-2.5 top-2.5">
          {ARTIST_STATUS_LABEL[artist.status]}
        </StatusBadge>
      )}

      <span className="mb-2.5 h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary-soft to-surface-3">
        {artist.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일
          <img src={mediaUrl(artist.imageUrl)} alt="" className="h-full w-full object-cover" />
        )}
      </span>

      <span className="mb-1.5 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
        {ARTIST_TYPE_LABEL[artist.type]}
      </span>
      <p className="text-[14.5px] font-extrabold text-text-1">{artist.name}</p>
      {artist.nameEn && <p className="mt-0.5 text-[11.5px] text-text-3">{artist.nameEn}</p>}
      {artist.agency && (
        <p className="mt-2 w-full border-t border-border pt-2 text-[10.5px] text-text-3">{artist.agency}</p>
      )}
    </Link>
  );
}
