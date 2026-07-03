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
