import Link from "next/link";
import { mediaUrl } from "@/lib/api";
import { ARTIST_STATUS_BADGE_CLASS, ARTIST_STATUS_LABEL, ARTIST_TYPE_LABEL } from "@/lib/labels";
import { FOCUS_RING } from "@/lib/ui";
import type { ArtistResponse } from "@/lib/types";

export default function ArtistCard({ artist }: { artist: ArtistResponse }) {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className={`relative flex flex-col items-center rounded-r4 border border-border bg-surface p-4 pt-5 text-center shadow-card transition-all hover:-translate-y-[3px] hover:border-primary ${FOCUS_RING}`}
    >
      <span
        className={`absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${ARTIST_STATUS_BADGE_CLASS[artist.status]}`}
      >
        {ARTIST_STATUS_LABEL[artist.status]}
      </span>

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
