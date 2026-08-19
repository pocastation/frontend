import Wordmark from "@/components/Wordmark";
import { BUSINESS_INFO, INTERMEDIARY_NOTICE } from "@/lib/business";

const FOOTER_COLUMNS = [
  {
    title: "서비스",
    links: [
      { label: "경매 둘러보기", href: "/" },
      { label: "이용 방법", href: "/guide" },
    ],
  },
  {
    title: "고객지원",
    links: [
      { label: "공지사항", href: "/notices" },
      { label: "문의하기", href: "/inquiries" },
      { label: "자주 묻는 질문", href: "/faq" },
    ],
  },
  {
    title: "약관",
    links: [
      { label: "이용약관", href: "/terms" },
      // 약관이 위임한 거래 세부 기준. 약관 본문이 "운영정책"이라는 이름으로 8곳에서
      // 참조하므로 라벨도 그 이름을 그대로 쓴다 — 다르게 부르면 참조가 끊긴 것처럼 읽힌다.
      { label: "운영정책", href: "/policy" },
      // 법 §30② — "개인정보 처리방침"이라는 명칭을 그대로 쓰되, 글자 크기·색상으로
      // 다른 고지사항과 구분해 정보주체가 쉽게 확인할 수 있어야 한다.
      { label: "개인정보 처리방침", href: "/privacy", emphasis: true },
    ],
  },
];

// 전상법 §10 표시사항. 아직 확보 못 한 값(유선전화·이메일·통신판매업번호 등)은 줄 자체를 빼서,
// "준비 중" 같은 미충족 표시가 심사 화면에 드러나지 않게 한다.
function businessRows() {
  const rows: { label: string; value: string }[] = [
    { label: "상호", value: BUSINESS_INFO.companyName },
    { label: "대표자", value: BUSINESS_INFO.ceoName },
    { label: "사업자등록번호", value: BUSINESS_INFO.registrationNumber },
    { label: "사업장 주소", value: BUSINESS_INFO.address },
  ];
  if (BUSINESS_INFO.mailOrderNumber) {
    rows.push({ label: "통신판매업 신고번호", value: BUSINESS_INFO.mailOrderNumber });
  }
  if (BUSINESS_INFO.phone) rows.push({ label: "전화", value: BUSINESS_INFO.phone });
  if (BUSINESS_INFO.email) rows.push({ label: "이메일", value: BUSINESS_INFO.email });
  if (BUSINESS_INFO.privacyOfficer) {
    rows.push({ label: "개인정보보호책임자", value: BUSINESS_INFO.privacyOfficer });
  }
  rows.push({ label: "호스팅 제공자", value: BUSINESS_INFO.hostingProvider });
  return rows;
}

export default function Footer() {
  const rows = businessRows();

  return (
    <footer className="bg-text-1 px-4 pb-7 pt-12 text-white/40">
      <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-10 sm:grid-cols-4">
        <div>
          <div className="mb-3">
            <Wordmark tone="inverse" className="text-[22px] leading-none" />
          </div>
          <p className="max-w-[22ch] text-xs leading-relaxed">
            K-pop 포토카드 특화 경매 플랫폼
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h4 className="mb-3 text-[11px] font-extrabold tracking-wide text-white/70">
              {column.title}
            </h4>
            {column.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`block w-fit rounded-r1 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-text-1 ${
                  // 구분은 하되 과하지 않게 — 크기 반 포인트·굵기·명도 세 축을 조금씩만 쓴다.
                  // 푸터에서 혼자 튀면 법 요구를 넘어 디자인을 깨뜨린다.
                  "emphasis" in link && link.emphasis
                    ? "text-[12.5px] font-bold text-white/70 hover:text-white/90"
                    : "text-xs hover:text-white/85"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>
      {/* 전자상거래법 §10 — 사업자정보 상시 노출. root layout에 있어 메인·상세·결제 화면 전부 커버된다. */}
      <address className="mx-auto mt-10 max-w-[1160px] border-t border-white/10 pt-5 text-[11px] not-italic leading-relaxed">
        <dl className="flex flex-wrap gap-x-3 gap-y-1">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-1.5">
              <dt className="text-white/30">{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </address>

      {/* 전자상거래법 §20 — 통신판매중개자 고지. 미고지 시 판매자 채무불이행에 연대책임. */}
      <p className="mx-auto mt-3 max-w-[1160px] text-[11px] leading-relaxed text-white/30">
        {INTERMEDIARY_NOTICE}
      </p>

      <div className="mx-auto mt-4 max-w-[1160px] text-[11px]">
        © {new Date().getFullYear()} Pocastation. All rights reserved.
      </div>
    </footer>
  );
}
