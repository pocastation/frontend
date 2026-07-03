import type { PhotocardGrade, PhotocardSource } from "./types";

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
