import type { ReactNode } from "react";

/**
 * 관리자 화면의 알림·경고 한 줄(#294).
 *
 * <p>예전에는 성공·실패·안내를 모두 <b>같은 파스텔 필 박스</b>로 띄웠다. 레포 디자인 규칙은
 * <i>진짜 경고만 강조(좌측 규칙선), 일반 안내는 helper text로 녹인다</i>인데 아홉 페이지가
 * 이 규칙 밖에 있었다.
 *
 * <p>배경 필을 걷어내고 <b>좌측 규칙선</b>만 남긴다. 성공/실패 구분은 그 선과 글자색이 지므로
 * 정보는 그대로이고, 지면에서 차지하는 색 면적만 줄어든다.
 */
export default function AdminNotice({
  kind,
  children,
  className = "",
}: {
  kind: "success" | "error" | "info";
  children: ReactNode;
  className?: string;
}) {
  const tone =
    kind === "error"
      ? "border-accent text-accent"
      : kind === "success"
        ? "border-ok text-ok"
        : "border-border-2 text-text-2";
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`border-l-2 py-1 pl-3 text-[13px] font-semibold ${tone} ${className}`}
    >
      {children}
    </p>
  );
}
