import Link from "next/link";
import { PRIMARY_BUTTON_CLASS } from "@/lib/ui";

type Props = {
  title: string;
  description?: string;
};

// 아직 콘텐츠가 없는 라우트를 위한 공용 "준비 중" 화면. 죽은 링크(href="/")를 실제
// 라우트로 바꾸되, 기능/문서가 준비될 때까지 이 스텁으로 정직하게 안내한다.
export default function ComingSoon({ title, description }: Props) {
  return (
    <div className="pg flex flex-col items-center py-24 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-2xl text-primary">
        ★
      </span>
      <span className="mb-3 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-text-3">
        준비 중
      </span>
      <h1 className="font-display text-2xl font-extrabold text-text-1">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-text-3">
        {description ?? "이 페이지는 아직 준비 중이에요. 곧 찾아뵐게요."}
      </p>
      <Link href="/" className={`mt-6 flex h-11 items-center justify-center px-6 ${PRIMARY_BUTTON_CLASS}`}>
        매물 둘러보기
      </Link>
    </div>
  );
}
