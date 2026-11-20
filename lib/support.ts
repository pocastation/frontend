import { ApiError, apiFetch } from "./api";

export const CATEGORY_LABEL = { policy: "약관·정책", service: "서비스", maintenance: "점검" };
export type Notice = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: keyof typeof CATEGORY_LABEL;
  pinned: boolean;
  hidden: boolean;
  publishAt: string;
  revision: number;
  photoIds: string[];
};
export type FaqItem = { id: string; q: string; a: string[] };
export type FaqCategory = { id: string; title: string; lead: string; items: FaqItem[] };
export type Faq = { revision: number; categories: FaqCategory[] };

export const noticeDate = (iso: string) => new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
}).format(new Date(iso));

export async function findPublishedNotice(slug: string) {
  try {
    return await apiFetch<Notice>(`/api/support/notices/${encodeURIComponent(slug)}`, { cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
