export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  errorCode: string | null;
  message: string | null;
};

export type MemberResponse = {
  id: string;
  // OAuth 가입 회원은 이메일을 저장하지 않는다(§13 최소수집) — null 가능.
  email: string | null;
  nickname: string;
  role: string;
  // GET /api/members/me 만 내려주는 프로필 보강 필드(내 정보 탭 표시용) —
  // 가입/로그인·닉네임 변경 응답에는 없어서 옵션으로 둔다.
  provider?: string;
  createdAt?: string;
  // 다음 닉네임 변경 가능 시각(#118). null/미포함이면 지금 변경 가능. GET /me 에서만 채워진다.
  nicknameChangeableAt?: string | null;
};

// GET/POST/PATCH /api/members/me/delivery-addresses — 마이페이지 배송지 관리.
export type DeliveryAddress = {
  id: number;
  label: string | null;
  recipientName: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
};

export type TokenResponse = {
  accessToken: string;
  expiresInSeconds: number;
};

// ─── 어드민 콘솔 ───

export type MemberStatus = "ACTIVE" | "SUSPENDED" | "WITHDRAWN";

// GET /api/admin/members 항목 — 가입방식(provider)은 "EMAIL"|"KAKAO"|"NAVER"|"GOOGLE".
export type AdminMemberSummary = {
  id: string;
  email: string | null;
  nickname: string;
  provider: string;
  status: MemberStatus;
  role: string;
  createdAt: string;
  suspensionReason: string | null;
};

export type AdminMemberListResponse = {
  content: AdminMemberSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET /api/admin/members/{id} — 기본정보 + 활동 요약(판매/입찰 건수).
export type AdminMemberDetailResponse = AdminMemberSummary & {
  sellingCount: number;
  biddingCount: number;
};

export type MemberStatusAction = "SUSPEND" | "UNSUSPEND" | "WITHDRAW";

// GET /api/admin/dashboard — 실제로 셀 수 있는 운영 지표만(결제 도메인 전이라 매출·정산 지표 없음).
export type AdminDashboardResponse = {
  totalMembers: number;
  todaySignups: number;
  liveAuctions: number;
  pendingReportCount: number;
  pendingSuggestionCount: number;
  recentMembers: AdminMemberSummary[];
  recentAuctions: AuctionResponse[];
};

// ─── 신고(report) ───

export type ReportReason =
  | "BANNED_ITEM"
  | "PHOTO_THEFT"
  | "HARMFUL_CONTENT"
  | "FRAUD_SUSPECTED"
  | "ABUSE"
  | "ETC";

export type ReportStatus = "RECEIVED" | "RESOLVED" | "REJECTED";

export type ResolutionAction = "AUCTION_CANCELLED" | "NONE";

// GET /api/admin/reports 항목 — 같은 경매(대상)에 대한 신고를 신고자 수로 묶어 보여준다.
export type AdminReportSummary = {
  auctionId: number;
  auctionTitle: string | null;
  artistName: string | null;
  representativeThumbnailUrl: string | null;
  representativeReason: ReportReason;
  reporterCount: number;
  latestReportedAt: string;
  status: ReportStatus;
};

export type AdminReportListResponse = {
  content: AdminReportSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET /api/admin/reports/{auctionId} 신고자 항목 — 어드민 화면이라 닉네임은 마스킹하지 않는다.
export type AdminReportItem = {
  reportId: number;
  reporterNickname: string;
  reasonCode: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
};

export type AdminReportDetailResponse = {
  auctionId: number;
  auctionTitle: string | null;
  artistName: string | null;
  sellerNickname: string;
  reports: AdminReportItem[];
  actionable: boolean;
  resolutionAction: ResolutionAction | null;
  handledByNickname: string | null;
  handledAt: string | null;
  resolutionNote: string | null;
};

// GET /api/admin/auctions 항목 — 공개 목록(AuctionResponse)에 판매자 닉네임·취소사유를 더한 것.
export type AdminAuctionSummary = {
  id: number;
  title: string;
  sellerNickname: string | null;
  artistName: string | null;
  representativeThumbnailUrl: string | null;
  saleType: AuctionSaleType;
  currentPrice: number;
  bidCount: number;
  status: AuctionStatus;
  endAt: string | null;
  cancellationReason: string | null;
  reviewReason: string | null;
  reviewedAt: string | null;
};

export type AdminAuctionListResponse = {
  content: AdminAuctionSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AuctionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "LIVE"
  | "ENDED_SOLD"
  | "ENDED_NO_BIDS"
  | "CANCELLED";

export type AuctionSaleType = "AUCTION" | "INSTANT";

export type AuctionResponse = {
  id: number;
  title: string;
  artistName: string | null;
  representativeThumbnailUrl: string | null;
  saleType: AuctionSaleType;
  startPrice: number;
  currentPrice: number;
  buyNowPrice: number | null;
  status: AuctionStatus;
  endAt: string | null;
  bidCount: number;
  viewCount: number;
};

export type AuctionListResponse = {
  content: AuctionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PhotocardSource =
  | "ALBUM"
  | "POB"
  | "LUCKY_DRAW"
  | "FANSIGN"
  | "BROADCAST"
  | "SEASON_GREETING"
  | "WEVERSE"
  | "MD"
  | "COLLAB"
  | "ETC";

export type PhotocardGrade = "S" | "A" | "B" | "C";

export type AuctionImageResponse = {
  url: string;
  // 상세 기본(1200px). 다중 크기 도입 전 업로드분은 null → url(master)로 폴백(#128).
  displayUrl: string | null;
  thumbnailUrl: string;
  displayOrder: number;
};

export type AuctionDetailResponse = {
  id: number;
  sellerNickname: string;
  artistId: number;
  artistName: string | null;
  idolId: number | null;
  idolName: string | null;
  title: string;
  description: string | null;
  source: PhotocardSource;
  sourceDetail: string | null;
  albumName: string | null;
  grade: PhotocardGrade;
  unopened: boolean;
  conditionNote: string | null;
  saleType: AuctionSaleType;
  startPrice: number;
  currentPrice: number;
  buyNowPrice: number | null;
  durationDays: number | null;
  status: AuctionStatus;
  startAt: string | null;
  endAt: string | null;
  maxEndAt: string | null;
  bidCount: number;
  viewCount: number;
  images: AuctionImageResponse[];
  // 검수영상(개봉·틸팅 등, 경매당 최대 1개). 영상 없이 등록된 경매는 null/미존재.
  video?: AuctionVideoResponse | null;
};

export type AuctionVideoResponse = {
  url: string; // 재생용 MP4
  posterUrl: string | null; // 정지컷 포스터(없을 수 있음)
};

export type AuctionRegisterRequest = {
  artistId: number;
  idolId?: number | null;
  title: string;
  description?: string;
  source: PhotocardSource;
  sourceDetail?: string;
  albumName?: string;
  grade: PhotocardGrade;
  unopened: boolean;
  conditionNote?: string;
  saleType?: AuctionSaleType;
  startPrice: number;
  buyNowPrice?: number;
  durationDays?: number;
  images: { url: string; thumbnailUrl: string }[];
  verificationId?: string;
};

export type AuctionPurchaseResponse = {
  id: number;
  finalPrice: number;
  status: AuctionStatus;
};

export type MediaUploadResponse = {
  url: string; // master(확대, 2560)
  displayUrl: string; // 상세 기본(1200)
  thumbnailUrl: string; // 목록(480)
};

export type VideoStatus = "PROCESSING" | "READY" | "FAILED";

export type VideoUploadResponse = {
  videoId: string;
  status: VideoStatus; // 업로드 직후엔 PROCESSING
};

export type VideoStatusResponse = {
  videoId: string;
  status: VideoStatus;
  url: string | null; // READY일 때 재생용 MP4
  posterUrl: string | null; // READY일 때 정지컷(없을 수 있음)
};

export type VerificationStatus =
  | "ISSUED"
  | "RETAKE_REQUIRED"
  | "PASSED"
  | "CONSUMED"
  | "EXPIRED";

export type VerificationFailureReason =
  | "QUALITY_REJECTED"
  | "CODE_REGION_NOT_FOUND"
  | "INVALID_CODE_FORMAT"
  | "CODE_MISMATCH"
  | "OCR_LOW_CONFIDENCE"
  | "CARD_NOT_FOUND";

export type VerificationChallengeResponse = {
  id: string;
  code: string;
  status: VerificationStatus;
  expiresAt: string;
};

export type VerificationAnalysisResponse = {
  id: string;
  status: VerificationStatus;
  passed: boolean;
  failureReason: VerificationFailureReason | null;
  detectedCode: string | null;
  expiresAt: string;
};

export type AdminAuctionVerificationResponse = {
  verificationId: string;
  auctionId: number;
  status: VerificationStatus;
  issuedCode: string;
  detectedCode: string | null;
  codeRegionDetected: boolean | null;
  codeRegionScore: number | null;
  codeExact: boolean | null;
  ocrConfident: boolean | null;
  ocrMeanTokenNll: number | null;
  cardPresent: boolean | null;
  cardScore: number | null;
  qualityPassed: boolean | null;
  failureReason: VerificationFailureReason | null;
  modelVersion: string | null;
  attemptCount: number;
  expiresAt: string;
  analyzedAt: string | null;
  imageAvailable: boolean;
};

// POST /api/auctions/{id}/bids 응답 — 입찰 직후 갱신된 경매 상태.
export type BidResponse = {
  auctionId: number;
  currentPrice: number;
  bidCount: number;
  endAt: string;
  extended: boolean;
};

// GET /api/auctions/{id}/bids 항목 — 입찰자 닉네임은 마스킹되어 내려온다.
export type BidHistoryItem = {
  id: number;
  bidderNicknameMasked: string;
  amount: number;
  createdAt: string;
};

// 마이페이지 "입찰" 탭 항목 — 목록 조회 항목에 내 최고 입찰액·현재 최고가 여부가 더해진다.
export type MyBiddingResponse = {
  id: number;
  title: string;
  artistName: string | null;
  representativeThumbnailUrl: string | null;
  startPrice: number;
  currentPrice: number;
  status: AuctionStatus;
  endAt: string;
  bidCount: number;
  viewCount: number;
  myBidAmount: number;
  isTopBidder: boolean;
};

export type MyBiddingListResponse = {
  content: MyBiddingResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// 마이페이지 "관심목록" 탭 — GET /api/members/me/wishlist. 목록 조회(AuctionResponse)와
// 동일한 항목 모양을 그대로 재사용한다(찜 여부 자체가 이 목록에 있다는 사실이라 별도 필드 불필요).
export type WishlistListResponse = {
  content: AuctionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type BidListResponse = {
  content: BidHistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// SSE(/api/auctions/{id}/bids/stream)로 밀어주는 실시간 호가 이벤트.
export type BidStreamEvent = {
  auctionId: number;
  currentPrice: number;
  bidCount: number;
  topBidderNicknameMasked: string;
  endAt: string;
  extended: boolean;
};

export type ArtistType = "GROUP" | "SOLO" | "UNIT";
export type ArtistStatus = "ACTIVE" | "HIATUS" | "DISBANDED";
export type ParentAgency = "SM" | "JYP" | "YG" | "HYBE";

export type ArtistResponse = {
  id: number;
  name: string;
  nameEn: string | null;
  type: ArtistType;
  agency: string | null;
  fandomName: string | null;
  debutDate: string | null;
  status: ArtistStatus;
  imageUrl: string | null;
  visible: boolean;
  parentAgency: ParentAgency | null;
};

export type ArtistListResponse = {
  content: ArtistResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET /api/artists/{id} — 아티스트 상세(멤버 목록 포함).
export type ArtistDetailResponse = {
  id: number;
  name: string;
  nameEn: string | null;
  type: ArtistType;
  agency: string | null;
  fandomName: string | null;
  debutDate: string | null;
  status: ArtistStatus;
  parentArtistId: number | null;
  imageUrl: string | null;
  members: ArtistMemberResponse[];
};

export type ArtistMemberResponse = {
  idolId: number;
  stageName: string;
  stageNameEn: string | null;
  imageUrl: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  active: boolean;
};

// ─── 감사 로그 ───

export type AuditAction =
  | "MEMBER_SUSPENDED"
  | "MEMBER_UNSUSPENDED"
  | "MEMBER_WITHDRAWN"
  | "AUCTION_CANCELLED"
  | "REPORT_RESOLVED"
  | "REPORT_REJECTED"
  | "MEMBER_ROLE_GRANTED"
  | "MEMBER_ROLE_REVOKED"
  | "AUCTION_APPROVED"
  | "AUCTION_REJECTED";

export type AuditTargetType = "MEMBER" | "AUCTION";

// GET /api/admin/audit-logs 항목 — targetLabel은 대상이 회원이면 닉네임, 경매면 제목.
export type AdminAuditLogResponse = {
  id: number;
  actorNickname: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string | null;
  reason: string | null;
  detail: string | null;
  createdAt: string;
};

export type AdminAuditLogListResponse = {
  content: AdminAuditLogResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// PATCH /api/admin/members/{id}/role 요청 바디의 role 값.
export type MemberRole = "ADMIN" | "USER";

// ─── 인앱 알림 ───

export type NotificationType =
  | "OUTBID"
  | "AUCTION_WON"
  | "AUCTION_LOST"
  | "AUCTION_ENDED_NO_BIDS"
  | "PAYMENT_COMPLETED" // 결제 완료 — 구매자(청구 확인)·판매자(발송 준비)
  | "PAYMENT_FAILED" // 결제 실패 — 결제수단 확인·자동 재시도 안내
  | "ORDER_DEFAULTED" // 미결제 확정 — 주문 취소(구매자)·재등록 안내(판매자)
  | "AUCTION_SUCCEEDED" // 차순위 승계 — 구매 기회 제안(차순위)·낙찰자 변경(판매자)
  | "ORDER_SHIPPED" // 발송 — 구매자에게 운송장 안내
  | "ORDER_CONFIRMED" // 구매확정 — 판매자에게 정산 대기 안내
  | "SHIPPING_OVERDUE" // 발송기한 초과 — 판매자에게 발송 독촉
  | "SETTLEMENT_COMPLETED"; // 정산 완료 — 판매자에게 실입금 예정 안내(실입금은 PG 사이클 시차)

// GET /api/members/me/succession-offers/{auctionId} — 제안 대상자 본인에게만 200(타인 404).
export type SuccessionOfferResponse = {
  auctionId: number;
  amount: number;
  status: "OFFERED" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  expiresAt: string;
};

// ─── 주문/결제 상태 ───

// backend OrderStatus와 1:1. PAYMENT_FAILED는 예약값(현재 전이 없음)이지만 과거 행 호환으로 포함.
export type OrderStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "PAYMENT_RETRYING"
  | "PAYMENT_FAILED"
  | "PAYMENT_DEFAULTED"
  | "SECOND_CHANCE_OFFERED";

// GET /api/members/me/orders/status?auctionIds= — 구매내역 주문 상태 배치 채움(wishlist 하트 패턴).
export type FulfillmentStatus = "AWAITING_SHIPMENT" | "SHIPPED" | "CONFIRMED";

export type MyOrderStatusResponse = {
  auctionId: number;
  status: OrderStatus;
  chargeAmount: number;
  nextActionAt: string | null;
  paidAt: string | null;
  // 결제 완료(PAID) 후에만 채워진다(그 전엔 null) — #108.
  fulfillmentStatus: FulfillmentStatus | null;
  hasDeliveryAddress: boolean;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  // 배송추적으로 감지된 실배송완료 시각(#134). null이면 미도착/미연동.
  deliveredAt: string | null;
  confirmedAt: string | null;
};

// GET /api/members/me/sold-orders/status — 판매자용(#110). 발송 UI가 소비, 배송지(발송용) 포함.
export type SoldOrderResponse = {
  auctionId: number;
  fulfillmentStatus: FulfillmentStatus | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  confirmedAt: string | null;
  payoutAmount: number;
  settlementStatus: "NONE" | "PENDING_SETTLEMENT" | "SETTLED";
  deliveryAddress: {
    recipientName: string;
    phone: string;
    postalCode: string;
    address1: string;
    address2: string | null;
  } | null;
};

export type NotificationResponse = {
  id: number;
  type: NotificationType;
  auctionId: number | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListResponse = {
  content: NotificationResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET/PATCH /api/members/me/notification-settings — 마이페이지 알림 설정.
export type NotificationSettings = {
  outbidEnabled: boolean;
};

// ─── 건의(catalog suggestion) ───

export type SuggestionKind = "ARTIST" | "AGENCY" | "MEMBER";
export type SuggestionStatus = "RECEIVED" | "ACCEPTED" | "REJECTED";

// GET /api/members/me/suggestions 항목(제출자 본인용).
export type SuggestionResponse = {
  id: number;
  kind: SuggestionKind;
  name: string;
  note: string | null;
  status: SuggestionStatus;
  createdAt: string;
};

export type SuggestionListResponse = {
  content: SuggestionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET /api/admin/catalog/suggestions 항목 — 제출자 닉네임 포함.
export type AdminSuggestionResponse = {
  id: number;
  kind: SuggestionKind;
  name: string;
  note: string | null;
  status: SuggestionStatus;
  submitterNickname: string | null;
  createdAt: string;
  handledAt: string | null;
};

export type AdminSuggestionListResponse = {
  content: AdminSuggestionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
