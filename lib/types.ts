export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  errorCode: string | null;
  message: string | null;
};

// 회원 배지(BE #264). 라벨·설명을 서버가 내려준다 — 프론트가 문구를 따로 두면 두 레포가 갈라진다.
export type BadgeView = {
  code: string;
  label: string;
  description: string;
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
  // 신뢰 레벨 진행도(§12.7, #166) — GET /me 에서만 채워진다.
  // 신뢰점수(0~100) 숫자는 BE가 본인에게도 내려주지 않는다(산식 역산·미세변동 문의 방지).
  trustLevel?: number;
  trustLevelLabel?: string;
  tradeCount?: number;
  nextLevelLabel?: string | null; // 최고 레벨이면 null
  tradesToNextLevel?: number;
  // 거래 요건은 채웠지만 신뢰도가 낮아 레벨이 상한에 걸린 상태.
  // true면 "거래를 더 하세요"가 아니라 "후기를 쌓으세요"로 안내해야 한다.
  levelCappedByTrust?: boolean;
  // 이메일 인증(#244, BE #224) — GET /me 에서만 채워진다.
  // 소셜 가입 회원은 대상이 아니라 항상 true다(배너를 띄우면 안 된다).
  emailVerified?: boolean;
  // 서버의 거래 차단 게이트가 켜져 있는지. 배너 문구를 "인증해 주세요"와 "인증해야 거래할 수
  // 있어요" 중에 고르는 데 쓴다 — 켜지지도 않은 제한을 예고하면 거짓 안내가 된다.
  emailVerificationRequired?: boolean;
  // 본인인증(BE #244) — GET /me 에서만 채워진다.
  // 이메일 인증과 달리 소셜/이메일 구분이 없다 — 사람 한 명당 한 번이다.
  identityVerified?: boolean;
  // 서버 게이트가 켜져 있는지. AuthProvider가 이 값으로 미인증 회원을 인증 화면으로 보낸다.
  // 켜지지 않았는데 프론트가 먼저 막으면, 인증을 완료할 수단이 없는 채로 갇힌다.
  identityVerificationRequired?: boolean;
  // 배지(BE #264) — GET /me 에서만 채워진다. 없으면 빈 배열이다.
  badges?: BadgeView[];
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

// GET/POST/PATCH/DELETE /api/members/me/payment-methods — 마이페이지 결제수단 관리(#152).
// 회원당 최대 3장, 기본카드(isDefault) 1개. cardName/cardNumber는 PG가 내려준 표시용 값
// (카드번호 원문은 서버·프론트 어디에도 없음).
export type PaymentMethod = {
  id: number;
  cardName: string | null;
  cardNumber: string | null;
  isDefault: boolean;
  registeredAt: string;
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
  // null이면 미인증. 인증 후 가입 전환(BE #252) 이후로는 새로 생기지 않는 상태라,
  // 비어 있는 회원은 전환 이전 잔여분이다. 소셜 회원은 인증 개념이 없어 항상 null이므로
  // "미인증"으로 읽지 않는다 — provider로 구분한다.
  emailVerifiedAt: string | null;
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

// GET /api/admin/email-suppressions — 하드바운스·스팸신고로 발송이 막힌 주소 목록(BE #250).
export type AdminEmailSuppression = {
  id: number;
  email: string;
  reason: "HARD_BOUNCE" | "COMPLAINT" | "MANUAL";
  detail: string | null;
  suppressedAt: string;
};

export type AdminEmailSuppressionListResponse = {
  content: AdminEmailSuppression[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
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
  featured: boolean;
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
  | "MATCHED"
  | "ENDED_SOLD"
  | "ENDED_NO_BIDS"
  | "ENDED_NOT_SELECTED"
  | "CANCELLED";

export type AuctionSaleType = "AUCTION" | "INSTANT";

// 검수 승인 거절 / 강제 취소 사유 템플릿 — 백엔드 enum(AuctionRejectionReason·
// AuctionCancellationReason)과 1:1로 맞춘다. 판매자 노출 문구는 서버가 만들어 저장하므로
// 프론트는 관리자에게 보여줄 짧은 라벨만 갖는다(lib/labels.ts).
export type AuctionRejectionReasonCode =
  | "CODE_MISMATCH"
  | "CODE_UNREADABLE"
  | "ITEM_MISMATCH"
  | "IMAGE_QUALITY"
  | "LOW_RESOLUTION"
  | "SUSPECTED_EDIT"
  | "THIRD_PARTY_IMAGE"
  | "INFO_MISMATCH"
  | "PROHIBITED_ITEM";

export type AuctionCancellationReasonCode =
  | "REPORTED_FAKE"
  | "REPORT_CONFIRMED"
  | "PROHIBITED_ITEM"
  | "INFO_MISMATCH"
  | "LOW_RESOLUTION"
  | "DUPLICATE_LISTING"
  | "SELLER_REQUEST"
  | "POLICY_VIOLATION"
  | "SUSPECTED_ABUSE";

// 🔴 거래 개편 §1.7 — currentPrice(=최고 제안가)가 응답에서 빠졌다. 목록에 실려 있으면
// 상세를 열지 않고도 호가를 훑을 수 있다. 종료 목록의 최종 성사가도 같은 이유로 함께 사라졌다
// (이 타입이 진행·종료 공용이고, §9.4가 개별 거래가를 노출하지 않기로 확정했다).
export type AuctionResponse = {
  id: number;
  title: string;
  artistName: string | null;
  representativeThumbnailUrl: string | null;
  saleType: AuctionSaleType;
  startPrice: number;
  buyNowPrice: number | null;
  status: AuctionStatus;
  endAt: string | null;
  bidCount: number;
  viewCount: number;
};

// 판매자 본인의 목록에만 포함되는 운영 사유. 공개 경매 응답에는 노출되지 않는다.
export type MySellingAuctionResponse = AuctionResponse & {
  cancellationReason: string | null;
  reviewReason: string | null;
  /**
   * 다음 연장에서 더할 일수 — 첫 연장 7일, 마지막 3일. 다 썼으면 null이다(§1.3).
   *
   * 🔴 서버가 알려준다. 화면이 `{7, 3}`을 복제해 세면 상한을 고칠 때 한쪽만 바뀌어
   * 「7일 늘어요」를 눌렀는데 3일이 느는 상태가 된다.
   */
  nextExtensionDays: number | null;
  /** 연장 버튼이 열리는 시각(종료 1일 전). 「종료 1일 전」을 화면이 다시 계산하지 않는다. */
  extendableFrom: string | null;
  /**
   * 🔴 살아 있는 제안 인원수 — 최소가가 잠겼는지의 근거(§1.1).
   *
   * `bidCount`(누적 건수)와 다르다. 저건 취소·대체분까지 세서 전부 거둬들인 매물도
   * 「3명이 제안했어요」로 보이고, 서버 판정(살아 있는 제안 0건 → 수정 가능)과 갈린다.
   */
  offerCount: number;
};

export type MySellingAuctionListResponse = Omit<AuctionListResponse, "content"> & {
  content: MySellingAuctionResponse[];
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
  sellerId: string;
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
  buyNowPrice: number | null;
  durationDays: number | null;
  status: AuctionStatus;
  startAt: string | null;
  endAt: string | null;
  // 취소를 뺀 distinct 제안자 수(§2.9). 제안 "건수"(bidCount)와 다르다 —
  // 한 사람이 금액을 여러 번 바꿔도 1이고, 화면의 「N명이 제안했어요」는 이 값이다.
  offerCount: number;
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

// 검수영상이 FAILED가 된 이유(backend #266). 전환 이전 FAILED 행은 사유를 소급할 수 없어 null이다.
export type VideoFailureReason = "TRANSCODE_FAILED" | "DURATION_OUT_OF_RANGE";

export type VideoStatusResponse = {
  videoId: string;
  status: VideoStatus;
  url: string | null; // READY일 때 재생용 MP4
  posterUrl: string | null; // READY일 때 정지컷(없을 수 있음)
  failureReason: VideoFailureReason | null; // FAILED일 때만
};

export type VerificationStatus =
  | "ISSUED"
  | "QUEUED"
  | "ANALYZING"
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
  | "CARD_NOT_FOUND"
  | "ANALYSIS_UNAVAILABLE";

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
  queuePosition: number | null;
  queuedAt: string | null;
};

export type AdminAuctionVerificationResponse = {
  verificationId: string;
  auctionId: number;
  status: VerificationStatus;
  issuedCode: string;
  detectedCode: string | null;
  codeRegionDetected: boolean | null;
  codeRegionScore: number | null;
  codeCornersValid: boolean | null;
  codeExact: boolean | null;
  ocrConfident: boolean | null;
  ocrMeanTokenNll: number | null;
  ocrConfidenceScore: number | null;
  ocrTokenConfidences: { token: string; confidence: number }[] | null;
  cardPresent: boolean | null;
  cardScore: number | null;
  cardModelScore: number | null;
  geometryScore: number | null;
  qualityPassed: boolean | null;
  failureReason: VerificationFailureReason | null;
  modelVersion: string | null;
  attemptCount: number;
  expiresAt: string;
  analyzedAt: string | null;
  imageAvailable: boolean;
};

// POST /api/auctions/{id}/bids 응답.
// 🔴 currentPrice를 뺐다(§1.7) — 본인이 방금 낸 금액은 본인이 알고 있고, 여기에 최고가를 실으면
// **제안을 한 번 내보는 것만으로 남의 호가를 알아낼 수 있는 구멍**이 된다.
// extended(안티스나이핑 연장)도 함께 폐기됐다(§2.3 — 연장 자체가 없어졌다).
export type BidResponse = {
  auctionId: number;
  bidCount: number;
  endAt: string;
};

// GET /api/auctions/{id}/bids 항목 — 🔴 판매자 전용 응답이다(§1.7).
// 구매자가 부르면 403(NOT_AUCTION_SELLER)이다. 판매자 선택 화면(Stage 3)이 쓴다.
export type BidHistoryItem = {
  id: number;
  bidderNicknameMasked: string;
  amount: number;
  createdAt: string;
  // 🔴 판매자가 상대를 심사할 재료(BE #378). 닉네임과 금액만으로는 할 수 있는 판단이
  // 「최고가 고르기」뿐이라, 자동 낙찰을 손으로 하는 것과 다르지 않다(§2.8 C1).
  trustLevel: number;
  tradeCount: number;
};

// POST /api/auctions/{id}/offers/{bidId}/accept 및 판매자 전용 선택 결과 조회 응답.
// 공개 상세에는 넣지 않는다 — 성사 금액과 상대는 판매자 본인만 볼 수 있다.
export type OfferSelectionResponse = {
  auctionId: number;
  bidId: number;
  buyerNicknameMasked: string;
  amount: number;
  payoutAmount: number;
};

// 마이페이지 "가격 제안" 탭 항목 — 목록 조회 항목에 **내가 낸 금액**이 더해진다.
// 🔴 currentPrice·isTopBidder를 뺐다(§1.7, BE #362). 설계 문서가 누출 경로로 다섯 곳을 적어
// 뒀는데 이 응답이 빠져 있었다 — 제안 한 번만 내면 마이페이지에서 남의 호가를 계속 볼 수 있었고,
// isTopBidder는 「아무도 나보다 높게 내지 않았다」는 남의 제안 상태 그 자체였다.
// myBidAmount는 남는다 — 본인 정보라 §1.7이 명시적으로 허용한다.
export type MyBiddingResponse = {
  id: number;
  title: string;
  artistName: string | null;
  representativeThumbnailUrl: string | null;
  startPrice: number;
  status: AuctionStatus;
  endAt: string;
  bidCount: number;
  viewCount: number;
  // 🔴 「내가 지금 걸어 둔 금액」이다. 예전 서버는 max(amount)를 내려줬는데, 하향 수정이
  // 열리면서 거짓이 됐다(BE #389) — 5만원을 3만원으로 낮춘 사람에게 계속 5만원이 보였다.
  // 제안을 전부 거둬들였으면 셋 다 null이다.
  myBidAmount: number | null;
  // 취소 버튼이 어느 제안을 지목할지, 그리고 그게 취소되는 제안인지.
  // ACCEPTED는 선택돼 계약이 성립한 제안이라 구매자도 취소할 수 없다(§9.1).
  myOfferId: number | null;
  myOfferStatus: BidStatus | null;
};

// 가격 제안의 생애 상태(§2.1). SUPERSEDED는 「금액을 바꿔 대체된 옛 제안」이라 CANCELLED와
// 다르다 — 목록에 남는 것은 언제나 ACTIVE 아니면 ACCEPTED다.
export type BidStatus = "ACTIVE" | "CANCELLED" | "SUPERSEDED" | "ACCEPTED";

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

// SSE(/api/auctions/{id}/bids/stream)로 밀어주는 실시간 이벤트.
// 🔴 실을 수 있는 것이 인원수 하나로 줄었다(§1.7). 예전에는 현재가·최고제안자 닉네임·연장 여부를
// 함께 보냈는데, 이 스트림은 **인증 없이 구독할 수 있어**(EventSource가 Authorization 헤더를
// 실을 수 없다) 화면에서 지운 값이 그대로 새어나가는 경로였다.
export type BidStreamEvent = {
  auctionId: number;
  offerCount: number;
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
  | "AUCTION_REJECTED" // 검수 승인 거절 — 판매자에게 보완 사유 안내
  | "AUCTION_CANCELLED" // 관리자 강제 취소 — 판매자에게 사유 안내
  | "PAYMENT_COMPLETED" // 결제 완료 — 구매자(청구 확인)·판매자(발송 준비)
  | "PAYMENT_FAILED" // 결제 실패 — 결제수단 확인·자동 재시도 안내
  | "ORDER_DEFAULTED" // 미결제 확정 — 주문 취소(구매자)·재등록 안내(판매자)
  | "AUCTION_SUCCEEDED" // 차순위 승계 — 구매 기회 제안(차순위)·구매자 변경(판매자)
  | "ORDER_SHIPPED" // 발송 — 구매자에게 운송장 안내
  | "ORDER_CONFIRMED" // 구매확정 — 판매자에게 정산 대기 안내
  | "DELIVERY_ADDRESS_REQUIRED" // 배송지 미입력 — 구매자에게. 결제는 됐는데 보낼 곳이 없어 거래가 멈춘 상태
  | "SHIPPING_OVERDUE" // 발송기한 초과 — 판매자에게 발송 독촉
  | "SETTLEMENT_COMPLETED" // 정산 완료 — 판매자에게 실입금 예정 안내(실입금은 PG 사이클 시차)
  | "INQUIRY_ANSWERED"; // 1:1 문의 답변 완료

// ─── 주문/결제 상태 ───

// backend OrderStatus와 1:1. PAYMENT_FAILED는 예약값(현재 전이 없음)이지만 과거 행 호환으로 포함.
export type OrderStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "PAYMENT_RETRYING"
  | "PAYMENT_FAILED"
  | "PAYMENT_DEFAULTED"
  | "SECOND_CHANCE_OFFERED"
  // 환불(#173) — PAID의 역방향 종착. 구매확정 전에만 진입한다.
  | "REFUNDING"
  | "REFUNDED";

// 반품·분쟁(#175). 결제·배송·정산과 직교하는 축 — 분쟁이 열려 있으면 자동 구매확정이 멈춘다.
export type DisputeStatus =
  | "NONE"
  | "RETURN_REQUESTED"
  | "RETURN_ACCEPTED"
  | "RETURN_SHIPPED"
  | "UNDER_MEDIATION"
  | "RESOLVED_REFUND"
  | "RESOLVED_DISMISSED";

export type ReturnReason =
  | "COUNTERFEIT_SUSPECTED"
  | "CONDITION_MISMATCH"
  | "WRONG_ITEM"
  | "DAMAGED_IN_TRANSIT"
  | "ETC";

export type RefundReason =
  | "BUYER_CANCELLED"
  | "SHIPPING_OVERDUE"
  | "SELLER_CANCELLED"
  | "RETURN_COMPLETED"
  | "ADMIN_DECISION";

// GET /api/members/me/orders/status?auctionIds= — 구매내역 주문 상태 배치 채움(wishlist 하트 패턴).
/**
 * 배송·구매확정 상태. 🔴 `PREPARING`은 <b>구매자 취소가 잠긴 뒤</b>다(§1.5, BE #393).
 *
 * 발송 전 구간이 둘(`AWAITING_SHIPMENT`·`PREPARING`)로 갈렸으므로, 「아직 발송 전인가」를
 * 물을 때는 상태를 하나씩 비교하지 말고 `isBeforeShipment()`를 쓴다 — 서버도 같은 이유로
 * 같은 이름의 판정을 둔다(빠뜨리면 발송 타이머에서 새는 사고가 T2였다).
 */
export type FulfillmentStatus = "AWAITING_SHIPMENT" | "PREPARING" | "SHIPPED" | "CONFIRMED";

export function isBeforeShipment(status: FulfillmentStatus | null | undefined): boolean {
  return status === "AWAITING_SHIPMENT" || status === "PREPARING";
}

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
  // 환불(#173) — 환불 절차에 진입한 주문에만 채워진다.
  refundReason: RefundReason | null;
  refundAmount: number | null;
  refundedAt: string | null;
  // 반품·분쟁(#175). disputeDueAt은 현재 단계의 기한 — 단계마다 의미가 다르다.
  disputeStatus: DisputeStatus;
  returnReason: ReturnReason | null;
  returnDetail: string | null;
  disputeNote: string | null;
  returnCarrier: string | null;
  returnTrackingNumber: string | null;
  disputeDueAt: string | null;
  // 가능 여부는 서버가 판정한다(#177) — 조건이 4개 축에 걸쳐 있어 화면에서 재구현하면 어긋난다.
  cancellable: boolean;
  returnable: boolean;
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
  // 환불로 종료된 거래를 발송 UI에서 걸러내기 위해 함께 내려온다(#177).
  orderStatus: OrderStatus;
  // 반품·분쟁(#175) — 판매자가 수락·거절·수령확인 중 무엇을 해야 하는지 판정하는 근거.
  disputeStatus: DisputeStatus;
  returnReason: ReturnReason | null;
  returnDetail: string | null;
  returnCarrier: string | null;
  returnTrackingNumber: string | null;
  disputeDueAt: string | null;
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


// ─── 1:1 문의 ───

export type InquiryStatus = "RECEIVED" | "CHECKING" | "ANSWERED";
export type InquiryCategory = "ACCOUNT" | "AUCTION" | "PAYMENT" | "DELIVERY" | "ETC";

export type InquiryResponse = {
  id: number;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  answer: string | null;
  createdAt: string;
  updatedAt: string;
  answeredAt: string | null;
};

export type InquiryListResponse = {
  content: InquiryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AdminInquiryResponse = InquiryResponse & {
  memberId: string;
  memberNickname: string | null;
};

export type AdminInquiryListResponse = {
  content: AdminInquiryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
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

// ─── 거래 리뷰·별점(§12.6, #156/#201) ───

// BE가 코드와 한국어 라벨을 함께 내려줌 — FE는 자산 없이 렌더.
export type ReviewTagView = { code: string; label: string };

export type ReviewReportReason = "ABUSE" | "FALSE_INFO" | "PRIVACY" | "SPAM" | "ETC";

// 판매자 리뷰 목록 항목(공개). 작성자는 닉네임으로만 노출.
export type ReviewResponse = {
  id: number;
  rating: number;
  body: string | null;
  tags: ReviewTagView[];
  reviewerNickname: string | null;
  createdAt: string;
};

export type SellerReviewListResponse = {
  content: ReviewResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// GET /api/sellers/{sellerId}/rating — 판매자 집계(평균·건수·받은 태그) + 신뢰 레벨(§12.7).
// 신뢰점수(0~100) 자체는 내부 지표라 BE가 내려주지 않는다 — 레벨·레벨명·거래수만 노출.
export type SellerRatingResponse = {
  // 판매자 표시명(#168). 탈퇴 회원은 가명("탈퇴회원_...")으로 내려온다.
  nickname: string | null;
  averageRating: number | null; // 리뷰 0건이면 null
  reviewCount: number;
  tags: { code: string; label: string; count: number }[];
  trustLevel: number; // 1~10
  trustLevelLabel: string; // "덕린이 🌱" 등 — BE가 라벨까지 내려준다
  tradeCount: number; // 완료(구매확정) 거래 건수, 판매+구매 합산
  badges: BadgeView[];
};

// GET /api/sellers/popular — 인기(신뢰) 판매자 랭킹. 신뢰점수 숫자는 내려오지 않는다(§9.2-4).
export type PopularSellerResponse = {
  sellerId: string;
  nickname: string;
  trustLevel: number;
  trustLevelLabel: string;
  tradeCount: number;
  averageRating: number | null; // 리뷰 0건이면 null
  reviewCount: number;
  // BE #273. 배포 이전 응답에는 이 필드가 없어 옵셔널로 둔다 — 프론트가 먼저 나가도 화면이 깨지지 않는다.
  badges?: BadgeView[];
};

// GET /api/reviews/reviewable — 내 구매확정 주문 중 미작성 리뷰 대상.
export type ReviewableOrderResponse = {
  orderId: number;
  auctionId: number;
  title: string;
  sellerNickname: string | null;
  confirmedAt: string;
  writableUntil: string;
};

// GET /api/admin/reviews/reports — 관리자 신고 대기열 항목.
export type AdminReviewReportResponse = {
  reviewId: number;
  rating: number;
  body: string | null;
  reviewStatus: "VISIBLE" | "BLINDED" | "DELETED";
  reviewerNickname: string | null;
  sellerNickname: string | null;
  reviewCreatedAt: string;
  reports: { reasonCode: ReviewReportReason; detail: string | null; createdAt: string }[];
};

// ─── 관리자 분쟁 중재(#175) ───

export type AdminDisputeResponse = {
  orderId: number;
  auctionId: number;
  title: string;
  buyerId: string;
  sellerId: string;
  chargeAmount: number;
  disputeStatus: DisputeStatus;
  returnReason: ReturnReason | null;
  returnDetail: string | null;
  disputeNote: string | null;
  returnCarrier: string | null;
  returnTrackingNumber: string | null;
  returnRequestedAt: string | null;
  disputeDueAt: string | null;
  disputeResolvedAt: string | null;
};

export type AdminDisputeListResponse = {
  content: AdminDisputeResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// 판매자 정산계좌(BE #258). 서버는 뒤 4자리만 내려준다 — 평문 계좌번호는 응답에 없다.
/**
 * 계좌 응답 — 정산계좌(#258)와 환불계좌(#390)가 같은 모양이다.
 *
 * 🔴 `maskedAccountNumber`는 뒤 4자리뿐이다. 평문 계좌번호는 어떤 응답에도 실리지 않는다.
 */
export type BankAccount = {
  bank: string;
  bankName: string;
  maskedAccountNumber: string;
  holderName: string;
  verified: boolean;
};

export type BankOption = {
  code: string;
  name: string;
};

// 결제창(가상계좌·실시간 계좌이체) 경로(BE #326, FE #333 — A안).
// 카드 빌링키(PaymentMethod)와 별개 축이다. 카드는 보류 상태라 코드만 남아 있다.
export type PaymentWindowPreparation = {
  paymentId: string;
  orderName: string;
  // 서버가 정한 청구액. 프론트가 계산하거나 바꾸지 않는다 — 위조 차단의 핵심.
  amount: number;
  // 가상계좌 입금 기한(시간). 갤럭시아는 결제창 호출 시 필수 파라미터이며, 우리 결제 기한과
  // 반드시 같아야 한다 — 어긋나면 「계좌는 살아 있는데 낙찰은 취소된」 구간이 생긴다.
  virtualAccountValidHours: number;
  // PG에 넘기는 구매자 식별자. 갤럭시아 상한이 20자라 서버가 회원 UUID를 줄여서 내려준다.
  customerId: string;
  customerName: string;
  customerEmail: string | null;
};

// 결제 상태 + 발급된 가상계좌. status가 PAYMENT_PENDING이면서 계좌가 있으면 "입금 대기"다
// (가상계좌 발급은 결제 완료가 아니다 — 입금 확정은 입금통보 웹훅의 몫이며 미구현).
export type PaymentWindowResult = {
  status: OrderStatus;
  orderName: string;
  // 서버가 계산한 청구액(구매자 수수료 포함). 프론트가 낙찰가로 다시 계산하지 않는다.
  amount: number;
  paymentMethod: "VIRTUAL_ACCOUNT" | "TRANSFER" | "CARD" | null;
  bank: string | null;
  accountNumber: string | null;
  holder: string | null;
  expiresAt: string | null;
  // 🔴 실패 **사유 문자열**은 내려받지 않는다 — PG 원문에 내부 파라미터 구조가 담겨 있어
  // 화면에 안 그려도 개발자도구에서 보인다(BE #328 전수점검). 여부만 있으면 충분하다.
  previousAttemptFailed: boolean;
};
