import type {
  SuggestionKind,
  SuggestionStatus,
  ArtistStatus,
  ArtistType,
  AuctionSaleType,
  AuctionStatus,
  AuditAction,
  AuditTargetType,
  MemberRole,
  MemberStatus,
  PhotocardGrade,
  PhotocardSource,
  ReportReason,
  ReportStatus,
  ResolutionAction,
  ReviewReportReason,
  DisputeStatus,
  RefundReason,
  ReturnReason,
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

// 어드민 화면과 판매자 마이페이지가 공유하는 경매 상태 라벨.
export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  DRAFT: "임시저장",
  PENDING_REVIEW: "승인 대기중",
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

export const AUCTION_SALE_TYPE_LABEL: Record<AuctionSaleType, string> = {
  AUCTION: "경매판매",
  INSTANT: "즉시판매",
};

export const AUCTION_SALE_TYPE_BADGE_CLASS: Record<AuctionSaleType, string> = {
  AUCTION: "bg-primary-soft text-primary",
  INSTANT: "bg-ok-soft text-ok",
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

// 감사 로그 조치 8종 — 색은 계열별로 구분(정지·취소 계열=경고, 해제·처리완료 계열=ok,
// 탈퇴·반려=중립 회색, 역할변경은 승격/회수를 서로 다른 톤으로).
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  MEMBER_SUSPENDED: "회원 정지",
  MEMBER_UNSUSPENDED: "회원 정지해제",
  MEMBER_WITHDRAWN: "회원 탈퇴처리",
  AUCTION_CANCELLED: "경매 강제취소",
  REPORT_RESOLVED: "신고 처리(매물취소)",
  REPORT_REJECTED: "신고 반려",
  MEMBER_ROLE_GRANTED: "관리자 승격",
  MEMBER_ROLE_REVOKED: "관리자 권한회수",
  AUCTION_APPROVED: "인증 경매 승인",
  AUCTION_REJECTED: "인증 경매 반려",
};

export const AUDIT_ACTION_OPTIONS: AuditAction[] = [
  "MEMBER_SUSPENDED",
  "MEMBER_UNSUSPENDED",
  "MEMBER_WITHDRAWN",
  "AUCTION_CANCELLED",
  "REPORT_RESOLVED",
  "REPORT_REJECTED",
  "MEMBER_ROLE_GRANTED",
  "MEMBER_ROLE_REVOKED",
  "AUCTION_APPROVED",
  "AUCTION_REJECTED",
];

export const AUDIT_ACTION_BADGE_CLASS: Record<AuditAction, string> = {
  MEMBER_SUSPENDED: "bg-accent-soft text-accent",
  MEMBER_UNSUSPENDED: "bg-ok-soft text-ok",
  MEMBER_WITHDRAWN: "bg-surface-2 text-text-2",
  AUCTION_CANCELLED: "bg-accent-soft text-accent",
  REPORT_RESOLVED: "bg-ok-soft text-ok",
  REPORT_REJECTED: "bg-surface-2 text-text-2",
  MEMBER_ROLE_GRANTED: "bg-primary-soft text-primary",
  MEMBER_ROLE_REVOKED: "bg-[#fff7ed] text-[#b45309]",
  AUCTION_APPROVED: "bg-ok-soft text-ok",
  AUCTION_REJECTED: "bg-accent-soft text-accent",
};

export const AUDIT_TARGET_TYPE_LABEL: Record<AuditTargetType, string> = {
  MEMBER: "회원",
  AUCTION: "경매",
};

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  ADMIN: "관리자",
  USER: "일반",
};

// ─── 건의(suggestion) ───

export const SUGGESTION_KIND_LABEL: Record<SuggestionKind, string> = {
  ARTIST: "스타",
  AGENCY: "기획사",
  MEMBER: "멤버",
};

export const SUGGESTION_KIND_OPTIONS: SuggestionKind[] = ["ARTIST", "AGENCY", "MEMBER"];

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  RECEIVED: "접수",
  ACCEPTED: "반영",
  REJECTED: "반려",
};

export const SUGGESTION_STATUS_BADGE_CLASS: Record<SuggestionStatus, string> = {
  RECEIVED: "bg-primary-soft text-primary",
  ACCEPTED: "bg-ok-soft text-ok",
  REJECTED: "bg-surface-3 text-text-2",
};

// ─── 거래 리뷰(§12.6) ───

// 당근식 긍정 매너 태그(선택형 칩). BE ReviewMannerTag enum과 코드·라벨을 1:1로 미러링한다
// (BE에 태그 목록 조회 API를 따로 두지 않고 이 고정 셋으로 렌더 — 태그 추가 시 양쪽 동기화).
export const REVIEW_MANNER_TAGS: { code: string; label: string }[] = [
  { code: "PHOTO_MATCHES_ITEM", label: "사진과 실물이 같아요" },
  { code: "AS_DESCRIBED", label: "상태가 설명과 같아요" },
  { code: "WELL_PACKAGED", label: "포장이 꼼꼼해요" },
  { code: "FAST_SHIPPING", label: "발송이 빨라요" },
  { code: "FAST_RESPONSE", label: "응답이 빨라요" },
  { code: "KIND", label: "친절하고 매너가 좋아요" },
  { code: "ON_TIME", label: "약속 시간을 잘 지켜요" },
];

export const REVIEW_REPORT_REASON_LABEL: Record<ReviewReportReason, string> = {
  ABUSE: "욕설·비방",
  FALSE_INFO: "허위 사실",
  PRIVACY: "개인정보 노출",
  SPAM: "광고·도배",
  ETC: "기타",
};

export const REVIEW_REPORT_REASON_OPTIONS: ReviewReportReason[] = [
  "ABUSE",
  "FALSE_INFO",
  "PRIVACY",
  "SPAM",
  "ETC",
];

// ─── 반품·분쟁(#175) ───

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  COUNTERFEIT_SUSPECTED: "가품이 의심돼요",
  CONDITION_MISMATCH: "상태가 설명과 달라요",
  WRONG_ITEM: "다른 물건이 왔어요",
  DAMAGED_IN_TRANSIT: "배송 중 파손됐어요",
  ETC: "기타",
};

export const RETURN_REASON_OPTIONS: ReturnReason[] = [
  "COUNTERFEIT_SUSPECTED",
  "CONDITION_MISMATCH",
  "WRONG_ITEM",
  "DAMAGED_IN_TRANSIT",
  "ETC",
];

// 반송비 안내(2026-07-23 결정) — 정산에 반영하지 않고 문구로만 안내한다.
// 판매자 귀책이 명백한 사유는 판매자 부담으로 안내하고, 그 외는 협의 대상으로 둔다.
export const RETURN_SHIPPING_FEE_NOTE: Record<ReturnReason, string> = {
  COUNTERFEIT_SUSPECTED: "판매자 귀책이라 반송비는 판매자 부담이에요.",
  CONDITION_MISMATCH: "판매자 귀책이라 반송비는 판매자 부담이에요.",
  WRONG_ITEM: "판매자 귀책이라 반송비는 판매자 부담이에요.",
  DAMAGED_IN_TRANSIT: "배송 중 파손은 택배사 보상 대상이라 반송비는 협의가 필요해요.",
  ETC: "반송비 부담은 판매자와 협의해 주세요.",
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  NONE: "",
  RETURN_REQUESTED: "반품 요청",
  RETURN_ACCEPTED: "반품 수락",
  RETURN_SHIPPED: "반송 중",
  UNDER_MEDIATION: "중재 진행",
  RESOLVED_REFUND: "반품 완료",
  RESOLVED_DISMISSED: "반품 기각",
};

export const REFUND_REASON_LABEL: Record<RefundReason, string> = {
  BUYER_CANCELLED: "구매자 취소",
  SHIPPING_OVERDUE: "발송 기한 초과",
  SELLER_CANCELLED: "판매자 취소",
  RETURN_COMPLETED: "반품 완료",
  ADMIN_DECISION: "중재 결정",
};
