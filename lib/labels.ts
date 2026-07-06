import type {
  ArtistStatus,
  ArtistType,
  AuctionStatus,
  MemberStatus,
  PhotocardGrade,
  PhotocardSource,
  ReportReason,
  ReportStatus,
  ResolutionAction,
} from "./types";

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

// 어드민 회원 상태 — 실제 상태를 그대로 반영(정지/탈퇴를 감추지 않음).
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "활동",
  SUSPENDED: "정지",
  WITHDRAWN: "탈퇴",
};

export const MEMBER_STATUS_BADGE_CLASS: Record<MemberStatus, string> = {
  ACTIVE: "bg-ok-soft text-ok",
  SUSPENDED: "bg-accent-soft text-accent",
  WITHDRAWN: "bg-surface-2 text-text-3",
};

// 가입 방식 표시 — 소셜은 provider 그대로, 그 외는 이메일.
export const PROVIDER_LABEL: Record<string, string> = {
  EMAIL: "이메일",
  KAKAO: "카카오",
  NAVER: "네이버",
  GOOGLE: "구글",
};

// 어드민 화면(카탈로그 관리·경매 관리)이 공유하는 경매 상태 라벨. MVP는 자동승인이라
// DRAFT/PENDING_REVIEW/APPROVED/REJECTED/SCHEDULED는 실제로는 거의 안 보이지만, 상태기계
// 자체엔 남아있어 라벨은 준비해둔다.
export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  DRAFT: "임시저장",
  PENDING_REVIEW: "검수 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  SCHEDULED: "시작 예정",
  LIVE: "진행 중",
  ENDED_SOLD: "낙찰 종료",
  ENDED_NO_BIDS: "유찰",
  CANCELLED: "취소됨",
};

export const AUCTION_STATUS_BADGE_CLASS: Record<AuctionStatus, string> = {
  DRAFT: "bg-surface-2 text-text-3",
  PENDING_REVIEW: "bg-[#fff7ed] text-[#b45309]",
  APPROVED: "bg-ok-soft text-ok",
  REJECTED: "bg-accent-soft text-accent",
  SCHEDULED: "bg-primary-soft text-primary",
  LIVE: "bg-ok-soft text-ok",
  ENDED_SOLD: "bg-surface-2 text-text-3",
  ENDED_NO_BIDS: "bg-surface-2 text-text-3",
  CANCELLED: "bg-accent-soft text-accent",
};

// 신고 사유 6종 — 신고 모달의 선택지 순서와 어드민 목록의 배지 순서가 이 배열을 공유한다.
export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  BANNED_ITEM: "금지품목",
  PHOTO_THEFT: "도용 사진",
  HARMFUL_CONTENT: "유해물·불법촬영물",
  FRAUD_SUSPECTED: "사기 의심",
  ABUSE: "욕설·비방",
  ETC: "기타",
};

export const REPORT_REASON_OPTIONS: ReportReason[] = [
  "BANNED_ITEM",
  "PHOTO_THEFT",
  "HARMFUL_CONTENT",
  "FRAUD_SUSPECTED",
  "ABUSE",
  "ETC",
];

export const REPORT_REASON_BADGE_CLASS: Record<ReportReason, string> = {
  BANNED_ITEM: "bg-surface-2 text-text-2",
  PHOTO_THEFT: "bg-[#fbe7f0] text-[#d63a7e]",
  HARMFUL_CONTENT: "bg-[#fbe7f0] text-[#d63a7e]",
  FRAUD_SUSPECTED: "bg-[#fdf1de] text-[#e08a1e]",
  ABUSE: "bg-[#f1ebfe] text-[#8b5cf6]",
  ETC: "bg-surface-2 text-text-2",
};

// 접수/처리완료/반려 — 처리완료·반려를 감추지 않고 그대로 보여준다(§1 신뢰 원칙).
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  RECEIVED: "접수",
  RESOLVED: "처리완료",
  REJECTED: "반려",
};

export const REPORT_STATUS_BADGE_CLASS: Record<ReportStatus, string> = {
  RECEIVED: "bg-[#fff7ed] text-[#b45309]",
  RESOLVED: "bg-ok-soft text-ok",
  REJECTED: "bg-accent-soft text-accent",
};

export const RESOLUTION_ACTION_LABEL: Record<ResolutionAction, string> = {
  AUCTION_CANCELLED: "매물 취소",
  NONE: "조치 없음(반려)",
};
