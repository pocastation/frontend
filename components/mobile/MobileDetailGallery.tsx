"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MediaZoomViewer from "@/components/MediaZoomViewer";
import { mediaUrl } from "@/lib/api";
import { FOCUS_RING } from "@/lib/ui";
import type { AuctionImageResponse, AuctionVideoResponse } from "@/lib/types";

/**
 * 모바일 상세 상단 갤러리 — 좌우로 넘겨 보는 4:5 슬라이드.
 *
 * <p>**검수(틸팅) 영상이 마지막 슬라이드로 들어간다.** 데스크탑은 본문 아래 별도 블록으로 두지만,
 * 모바일에서 아래에 따로 두면 스크롤을 한참 내려야 나와 "영상이 있다"는 사실 자체를 놓친다.
 * 사진 다음 차례에 두면 사진을 넘기다 자연스럽게 만난다.
 *
 * <p>🔴 넘김은 **네이티브 가로 스크롤 스냅**이다(#478). JS로 터치 시작/끝 좌표를 재던 시절엔
 * ① 스와이프 중에도 브라우저가 세로 스크롤을 같이 처리해 화면이 위아래로 흔들렸고(축 잠금 없음)
 * ② 영상 위 스와이프를 통째로 막아 놔서 영상에 한 번 들어가면 사진으로 돌아올 수 없었다.
 * 네이티브 스크롤은 첫 제스처의 축을 브라우저가 잠그고, 영상 위 가로 팬도 스크롤로 처리한다
 * (컨트롤은 탭이라 충돌하지 않는다).
 *
 * <p>뒤로가기·공유·찜·신고 오버레이는 사진과 검수영상에서 같은 위치를 유지한다. 마지막 영상까지
 * 넘긴 뒤에도 상세를 나가거나 매물 작업을 이어갈 수 있어야 한다.
 *
 * <p>사진은 사용자 업로드라 세로·가로가 섞여 있다. 목록 카드는 `object-cover`로 채우지만
 * 상세는 **`object-contain` 레터박스**다 — 상세까지 잘라 버리면 확인하러 들어온 사람이
 * 확인을 못 한다(이 서비스의 핵심 가치가 확인이다).
 */

type Slide = { kind: "image"; src: string } | { kind: "video"; src: string; poster: string | null };

export default function MobileDetailGallery({
  images,
  video,
  title,
  actions,
}: {
  images: AuctionImageResponse[];
  video: AuctionVideoResponse | null | undefined;
  title: string;
  /** 우상단 오버레이 액션(공유·찜·신고) — 페이지가 넘겨준다. */
  actions?: React.ReactNode;
}) {
  const slides: Slide[] = [
    ...images.map((image) => ({ kind: "image" as const, src: mediaUrl(image.displayUrl ?? image.url) })),
    ...(video ? [{ kind: "video" as const, src: mediaUrl(video.url), poster: video.posterUrl ? mediaUrl(video.posterUrl) : null }] : []),
  ];
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  // 확대 뷰어 — 열려 있으면 보고 있는 **사진** 인덱스, 닫혀 있으면 null(#527).
  // 캐러셀 인덱스(`index`)와 따로 두는 이유: 캐러셀은 영상까지 세지만 뷰어는 사진만 받는다.
  const [zoomAt, setZoomAt] = useState<number | null>(null);

  if (slides.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-surface-2 text-text-3">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  const current = slides[index];
  const onVideo = current.kind === "video";

  return (
    <div className="relative aspect-[4/5] bg-surface-2">
      <div
        ref={trackRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          const next = Math.round(el.scrollLeft / el.clientWidth);
          if (next !== index) setIndex(Math.min(slides.length - 1, Math.max(0, next)));
        }}
      >
        {slides.map((slide, i) =>
          slide.kind === "image" ? (
            /*
              사진을 누르면 확대 뷰어가 열린다(#527). 그 전에는 **크게 볼 방법이 아예 없어**
              브라우저 핀치에만 기대야 했다 — 상태 등급이 분쟁 사유인 서비스에서 하자를 볼
              수단이 브라우저 기능 하나뿐이었다. 슬라이드에서 사진이 영상보다 앞에 오므로
              슬라이드 인덱스가 그대로 사진 인덱스다.
            */
            <button
              key={slide.src}
              type="button"
              onClick={() => setZoomAt(i)}
              aria-label={`${title} 사진 ${i + 1} 크게 보기`}
              className={`h-full w-full flex-shrink-0 snap-center ${FOCUS_RING}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 직접 서빙하는 원본 파일 */}
              <img src={slide.src} alt={`${title} ${i + 1}`} className="h-full w-full object-contain" />
            </button>
          ) : (
            <video
              key={slide.src}
              controls
              playsInline
              preload="metadata"
              poster={slide.poster ?? undefined}
              src={slide.src}
              className="h-full w-full flex-shrink-0 snap-center bg-black object-contain"
            />
          ),
        )}
      </div>

      {/* 갤러리 위 뒤로가기 — 상세에서는 전역 헤더를 접으므로 나가는 길이 여기 하나다(킷과 같은 자리). */}
      <button
        type="button"
        aria-label="뒤로"
        onClick={() => router.back()}
        className={`absolute left-3 top-3 z-[3] flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90 text-text-1 backdrop-blur-[4px] ${FOCUS_RING}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {actions && (
        // 갤러리 위에 아이콘만 얹으면 밝은 미디어에서 묻힌다(연회색 아이콘 + 배경 없음). 공유·찜·신고
        // 컴포넌트를 고치지 않고 여기서만 흰 반투명 원을 깐다 — 데스크탑 액션 줄은 흰 지면 위라
        // 지금 그대로다. `>*>button`은 공유·신고의 트리거만 잡는다(펼친 메뉴는 한 단계 더 깊다).
        <div className="absolute right-3 top-3 z-[3] flex gap-1.5 [&>*>button]:!rounded-full [&>*>button]:!bg-white/90 [&>*>button]:!text-text-1 [&>*>button]:backdrop-blur-[4px] [&>button]:!rounded-full [&>button]:!bg-white/90 [&>button]:!text-text-1 [&>button]:backdrop-blur-[4px]">
          {actions}
        </div>
      )}

      {slides.length > 1 && (
        <>
          {/* 도트 인디케이터(#478) — 사진은 ●, 영상은 ▶. 「3 / 3」 카운터만으로는 마지막 사진이
              끝처럼 읽혀 그 뒤의 영상을 아무도 발견하지 못했다. 영상 존재가 첫 화면부터 보여야 한다. */}
          <div className="absolute bottom-3.5 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-[5px]">
            {slides.map((slide, i) =>
              slide.kind === "image" ? (
                <span
                  key={i}
                  className={`h-[5px] w-[5px] rounded-full ${i === index ? "bg-white" : "bg-white/50"}`}
                  aria-hidden="true"
                />
              ) : (
                <span
                  key={i}
                  className={`h-0 w-0 border-y-[4.5px] border-l-[7px] border-y-transparent ${
                    i === index ? "border-l-white" : "border-l-white/50"
                  }`}
                  aria-hidden="true"
                />
              ),
            )}
          </div>

          {/* 몇 장 중 몇 번째인지는 사진 차례에만 표시한다. 영상은 재생 UI 자체로 구분한다. */}
          {/* 🔴 분모가 `images.length`였다(#519) — 도트는 영상까지 세는데 숫자만 빼고 세서
              사진 3 + 영상 1이면 도트 4개 옆에 「1 / 3」이 떴다. 둘이 같은 수를 말하게 한다. */}
          {!onVideo && (
            <span className="absolute bottom-3 right-3 z-[3] rounded-r1 bg-black/50 px-2 py-0.5 font-display text-[11px] text-white backdrop-blur-[2px]">
              {index + 1} / {slides.length}
            </span>
          )}
        </>
      )}

      {/* 데스크탑 상세와 같은 뷰어를 쓴다 — 핀치·더블탭 확대, 좌우 스와이프, 아래로 당겨 닫기. */}
      <MediaZoomViewer
        open={zoomAt !== null}
        images={images}
        title={title}
        index={zoomAt ?? 0}
        onIndexChange={setZoomAt}
        onClose={() => setZoomAt(null)}
      />
    </div>
  );
}
