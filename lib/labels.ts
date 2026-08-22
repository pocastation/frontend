import type { StatusTone } from "@/components/StatusBadge";
import type {
  SuggestionKind,
  SuggestionStatus,
  ArtistStatus,
  ArtistType,
  AuctionCancellationReasonCode,
  AuctionRejectionReasonCode,
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

export const ARTIST_STATUS_TONE: Record<ArtistStatus, StatusTone> = {
  ACTIVE: "ok",
  HIATUS: "warn",
  DISBANDED: "muted",
};

// 어드민 회원 상태 — 실제 상태를 그대로 반영(정지/탈퇴를 감추지 않음).
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "활동",
  SUSPENDED: "정지",
  WITHDRAWN: "탈퇴",
};

export const MEMBER_STATUS_TONE: Record<MemberStatus, StatusTone> = {
  ACTIVE: "ok",
  SUSPENDED: "danger",
  WITHDRAWN: "muted",
};

// 가입 방식 표시 — 소셜은 provider 그대로, 그 외는 이메일.
export const PROVIDER_LABEL: Record<string, string> = {
  EMAIL: "이메일",
  KAKAO: "카카오",
  NAVER: "네이버",
  GOOGLE: "구글",
};

// ─── 용어 정본 (2026-08-22 확정) ───
//
// PG 심사가 **경매 구조**를 문제 삼아 화면에서 경매 어휘를 걷어낸다. 코드 식별자·API 필드는
// 그대로 둔다 — 서버 계약이 `auction`·`bid`라 이름을 바꾸면 매핑이 두 겹이 된다. **바꾸는 건
// 사람이 읽는 문자열뿐**이고, 그 단일 진실원이 이 파일이다.
//
//   입찰        → 가격 제안 · 제안        낙찰    → 거래 성사
//   유찰        → 제안 없음               호가    → 제안 단위
//   최고 입찰자 → 최고가 제안자           시작가  → 시작 제안가
//   경매        → 문맥에 따라 **매물**(목록·관리) · **판매**(판매자 화면) · **제안판매**(판매 방식)
//
// 「거래」를 경매의 대체어로 쓰지 않는다. 하단탭의 「거래」는 제안판매 + 즉시판매를 **묶는 상위
// 개념**이라, 경매를 거래로 바꾸면 층위가 무너진다(거래 탭 안에 거래와 즉시판매가 생긴다).
// 즉시판매·즉시구매는 경매 함의가 없어 그대로 둔다 — 「제안판매 ↔ 즉시판매」로 짝이 맞는다.

// 어드민 화면 기준 매물 상태 라벨.
// REJECTED는 보는 사람에 따라 문구를 달리한다 — 관리자에게는 자기가 내린 조치가 명확해야 하고
// (승인 거절), 판매자에게는 "고쳐서 다시 올리면 된다"가 읽혀야 한다(보완 필요, 아래 SELLER_ 맵).
// 상태값 자체(REJECTED)는 그대로 두고 표시 문구만 나눈다.
//
// ENDED_NO_BIDS를 「제안 없이 종료」가 아니라 **「제안 없음」**으로 둔 건 이 값이 카드 좌상단
// 칩처럼 좁은 자리에 들어가기 때문이다 — 문장이 필요한 지면에서는 각 화면이 풀어 쓴다.
export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  DRAFT: "임시저장",
  PENDING_REVIEW: "승인 대기중",
  APPROVED: "승인",
  REJECTED: "승인 거절",
  SCHEDULED: "시작 예정",
  LIVE: "진행 중",
  ENDED_SOLD: "거래 성사",
  ENDED_NO_BIDS: "제안 없음",
  CANCELLED: "취소됨",
};

// 판매자(마이페이지)에게 보여줄 매물 상태 문구 — 위 맵과 다른 항목만 덮어쓴다.
export const SELLER_AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  ...AUCTION_STATUS_LABEL,
  REJECTED: "보완 필요",
};

// SCHEDULED에서 보라를 뺐다(#289) — 보라는 CTA·선택 상태에만 쓴다는 규칙을 어기고 있었고,
// 「예정」은 판단이 없는 중립 상태라 색으로 강조할 이유도 없다.
export const AUCTION_STATUS_TONE: Record<AuctionStatus, StatusTone> = {
  DRAFT: "muted",
  PENDING_REVIEW: "warn",
  APPROVED: "ok",
  REJECTED: "danger",
  SCHEDULED: "neutral",
  LIVE: "ok",
  ENDED_SOLD: "muted",
  ENDED_NO_BIDS: "muted",
  CANCELLED: "danger",
};

export const AUCTION_SALE_TYPE_LABEL: Record<AuctionSaleType, string> = {
  AUCTION: "제안판매",
  INSTANT: "즉시판매",
};

// 판매 유형은 **상태가 아니라 분류**다(#289). 좋고 나쁨이 없는 값에 색을 주면 상태 배지와
// 뒤섞여 "어느 색이 무슨 뜻인지"가 흐려진다 — 둘 다 중립으로 두고 글자로 구분한다.
export const AUCTION_SALE_TYPE_TONE: Record<AuctionSaleType, StatusTone> = {
  AUCTION: "neutral",
  INSTANT: "neutral",
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

// 신고 사유도 분류지만 **심각도가 실제로 다르다**(#289). 예전에는 6종에 분홍·주황·보라를 흩뿌려
// 색이 우선순위를 말해주지 못했다. 즉시 확인해야 하는 둘만 danger 로 두고 나머지는 중립으로 둔다
// — 색이 둘뿐이면 그 둘이 눈에 들어온다.
export const REPORT_REASON_TONE: Record<ReportReason, StatusTone> = {
  BANNED_ITEM: "neutral",
  PHOTO_THEFT: "neutral",
  HARMFUL_CONTENT: "danger",
  FRAUD_SUSPECTED: "danger",
  ABUSE: "neutral",
  ETC: "muted",
};

// 접수/처리완료/반려 — 처리완료·반려를 감추지 않고 그대로 보여준다(§1 신뢰 원칙).
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  RECEIVED: "접수",
  RESOLVED: "처리완료",
  REJECTED: "반려",
};

// REJECTED를 danger에서 muted로 내렸다(#289) — 반려는 사고가 아니라 **처리가 끝난 상태**다.
// 붉게 두면 미처리 건과 같은 무게로 보여 관리자가 다시 들여다보게 된다.
export const REPORT_STATUS_TONE: Record<ReportStatus, StatusTone> = {
  RECEIVED: "warn",
  RESOLVED: "ok",
  REJECTED: "muted",
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
  AUCTION_CANCELLED: "매물 강제취소",
  REPORT_RESOLVED: "신고 처리(매물취소)",
  REPORT_REJECTED: "신고 반려",
  MEMBER_ROLE_GRANTED: "관리자 승격",
  MEMBER_ROLE_REVOKED: "관리자 권한회수",
  AUCTION_APPROVED: "인증 매물 승인",
  AUCTION_REJECTED: "인증 매물 반려",
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

// 권한 부여를 warn 으로 올렸다(#289). 예전에는 보라였는데, **관리자 권한이 늘어나는 조치**는
// 감사 로그에서 가장 먼저 눈에 띄어야 하는 항목이다 — 색이 아니라 뜻으로 정한다.
export const AUDIT_ACTION_TONE: Record<AuditAction, StatusTone> = {
  MEMBER_SUSPENDED: "danger",
  MEMBER_UNSUSPENDED: "ok",
  MEMBER_WITHDRAWN: "muted",
  AUCTION_CANCELLED: "danger",
  REPORT_RESOLVED: "ok",
  REPORT_REJECTED: "muted",
  MEMBER_ROLE_GRANTED: "warn",
  MEMBER_ROLE_REVOKED: "neutral",
  AUCTION_APPROVED: "ok",
  AUCTION_REJECTED: "danger",
};

export const AUDIT_TARGET_TYPE_LABEL: Record<AuditTargetType, string> = {
  MEMBER: "회원",
  AUCTION: "매물",
};

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  ADMIN: "관리자",
  USER: "일반",
};

// ─── 매물 모더레이션 사유 템플릿 ───
// 관리자는 자유 텍스트 대신 이 목록에서 하나를 고른다. 판매자에게 나가는 실제 문구는 서버가
// 소유하고(AuctionRejectionReason·AuctionCancellationReason), 여기는 관리자용 요약 라벨과
// 판매자에게 어떤 문구가 나가는지 확인용 미리보기다. 두 목록의 순서·코드는 서버 enum과 맞춘다.
export const AUCTION_REJECTION_REASON_OPTIONS: {
  code: AuctionRejectionReasonCode;
  label: string;
  preview: string;
}[] = [
  { code: "CODE_MISMATCH", label: "인증 코드 불일치", preview: "인증 사진의 코드가 발급된 코드와 달라요. 발급된 코드를 정확히 적어 다시 촬영해 주세요." },
  { code: "CODE_UNREADABLE", label: "코드 판독 불가", preview: "인증 사진에서 코드를 알아볼 수 없어요. 코드가 잘리거나 가려지지 않게 다시 촬영해 주세요." },
  { code: "ITEM_MISMATCH", label: "인증/판매 상품 불일치", preview: "인증 사진의 상품과 판매 사진의 상품이 달라 보여요. 같은 상품으로 다시 촬영해 주세요." },
  { code: "IMAGE_QUALITY", label: "사진 품질 미달", preview: "사진이 흐리거나 어두워 상태를 확인하기 어려워요. 밝은 곳에서 초점을 맞춰 다시 촬영해 주세요." },
  { code: "LOW_RESOLUTION", label: "해상도 미달", preview: "사진 또는 영상의 해상도가 낮아 상태를 확인하기 어려워요. 원본 화질 그대로 다시 올려주세요." },
  { code: "SUSPECTED_EDIT", label: "합성·편집 의심", preview: "사진에 편집·합성이 의심되는 부분이 있어요. 보정 없이 원본 그대로 다시 등록해 주세요." },
  { code: "THIRD_PARTY_IMAGE", label: "사진 도용 의심", preview: "직접 촬영한 사진이 아닌 것으로 보여요. 판매하실 실물을 직접 촬영해 등록해 주세요." },
  { code: "INFO_MISMATCH", label: "상품 정보 불일치", preview: "등록한 상품 정보(스타·등급·개봉 여부 등)가 사진과 맞지 않아요. 정보를 수정해 다시 등록해 주세요." },
  { code: "PROHIBITED_ITEM", label: "거래 불가 상품", preview: "포카스테이션에서 거래할 수 없는 상품이에요. 등록 가능한 상품인지 확인해 주세요." },
];

// REPORT_CONFIRMED는 신고 처리(신고 관리 화면)에서 서버가 자동으로 붙이는 코드라 여기선 뺀다.
export const AUCTION_CANCELLATION_REASON_OPTIONS: {
  code: AuctionCancellationReasonCode;
  label: string;
  preview: string;
}[] = [
  { code: "REPORTED_FAKE", label: "위조품 의심 신고", preview: "위조품 의심 신고가 접수돼 매물을 내렸어요." },
  { code: "PROHIBITED_ITEM", label: "거래 불가 상품", preview: "포카스테이션에서 거래할 수 없는 상품이라 매물을 내렸어요." },
  { code: "INFO_MISMATCH", label: "상품 정보 불일치", preview: "등록한 상품 정보가 실제와 달라 매물을 내렸어요." },
  { code: "LOW_RESOLUTION", label: "해상도 미달", preview: "사진 또는 영상의 해상도가 낮아 상태를 확인하기 어려워 매물을 내렸어요." },
  { code: "DUPLICATE_LISTING", label: "중복 등록", preview: "같은 상품이 중복 등록돼 있어 매물을 내렸어요." },
  { code: "SELLER_REQUEST", label: "판매자 요청", preview: "판매자 요청으로 매물을 내렸어요." },
  { code: "POLICY_VIOLATION", label: "운영 정책 위반", preview: "운영 정책을 위반해 매물을 내렸어요." },
  { code: "SUSPECTED_ABUSE", label: "비정상 거래 정황", preview: "비정상적인 거래 정황이 확인돼 매물을 내렸어요." },
];

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

export const SUGGESTION_STATUS_TONE: Record<SuggestionStatus, StatusTone> = {
  RECEIVED: "neutral",
  ACCEPTED: "ok",
  REJECTED: "muted",
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
