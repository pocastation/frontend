import type { ArtistStatus, ArtistType, PhotocardGrade, PhotocardSource } from "./types";

// 등록 폼 select와 상세 페이지 배지 표시가 공유하는 한글 라벨.
export const SOURCE_LABEL: Record<PhotocardSource, string> = {
  ALBUM: "앨범 봉입",
  POB: "예약판매처 특전",
  LUCKY_DRAW: "럭키드로우",
  FANSIGN: "팬사인회",
  BROADCAST: "공개방송",
  SEASON_GREETING: "시즌그리팅",
  WEVERSE: "위버스 특전",
  MD: "공식 MD",
  COLLAB: "콜라보",
  ETC: "기타",
};

export const SOURCE_OPTIONS: PhotocardSource[] = [
  "ALBUM",
  "POB",
  "LUCKY_DRAW",
  "FANSIGN",
  "BROADCAST",
  "SEASON_GREETING",
  "WEVERSE",
  "MD",
  "COLLAB",
  "ETC",
];

export const GRADE_LABEL: Record<PhotocardGrade, string> = {
  S: "S급 (미개봉/신품급)",
  A: "A급 (신품에 가까움)",
  B: "B급 (사용흔적 있음)",
  C: "C급 (손상 있음)",
};

export const GRADE_OPTIONS: PhotocardGrade[] = ["S", "A", "B", "C"];

export const DURATION_OPTIONS = [1, 3, 7] as const;

export const ARTIST_TYPE_LABEL: Record<ArtistType, string> = {
  GROUP: "그룹",
  SOLO: "솔로",
  UNIT: "유닛",
};

export const ARTIST_TYPE_OPTIONS: ArtistType[] = ["GROUP", "SOLO", "UNIT"];

// 배지 색은 실제 상태를 그대로 반영 — 해체/휴식기를 감추지 않는다.
export const ARTIST_STATUS_LABEL: Record<ArtistStatus, string> = {
  ACTIVE: "활동 중",
  HIATUS: "휴식기",
  DISBANDED: "해체",
};

export const ARTIST_STATUS_BADGE_CLASS: Record<ArtistStatus, string> = {
  ACTIVE: "bg-ok-soft text-ok",
  HIATUS: "bg-[#fff7ed] text-[#b45309]",
  DISBANDED: "bg-surface-2 text-text-3",
};
