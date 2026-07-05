export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  errorCode: string | null;
  message: string | null;
};

export type MemberResponse = {
  id: string;
  email: string;
  nickname: string;
  role: string;
};

export type TokenResponse = {
  accessToken: string;
  expiresInSeconds: number;
};

export type AuctionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "LIVE"
  | "ENDED_SOLD"
  | "ENDED_NO_BIDS";

export type AuctionResponse = {
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
  startPrice: number;
  currentPrice: number;
  durationDays: number;
  status: AuctionStatus;
  startAt: string | null;
  endAt: string;
  maxEndAt: string;
  bidCount: number;
  viewCount: number;
  images: AuctionImageResponse[];
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
  startPrice: number;
  durationDays: number;
  images: { url: string; thumbnailUrl: string }[];
};

export type MediaUploadResponse = {
  url: string;
  thumbnailUrl: string;
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

export type ArtistResponse = {
  id: number;
  name: string;
  nameEn: string | null;
  type: ArtistType;
  agency: string | null;
  fandomName: string | null;
  status: ArtistStatus;
  imageUrl: string | null;
};

export type ArtistListResponse = {
  content: ArtistResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
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
