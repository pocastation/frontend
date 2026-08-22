import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileChromeGate from "@/components/MobileChromeGate";
import PreProductionBar from "@/components/PreProductionBar";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import ServiceWorkerRegistrar from "@/components/pwa/ServiceWorkerRegistrar";
import { AuthProvider } from "@/lib/auth-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { NotificationProvider } from "@/lib/notification-context";
import { ToastProvider } from "@/lib/toast-context";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, X_HANDLE } from "@/lib/site";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // 정규 URL. 없으면 크롤러가 쿼리·추적 파라미터가 붙은 주소를 별개 페이지로 볼 수 있다.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    // og:url이 빠져 있었다 — 일부 크롤러(특히 카카오)는 이걸로 정규 주소를 잡는다.
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    // 핸들이 있을 때만 넣는다 — 빈 문자열을 내보내면 카드가 깨진 계정을 가리킨다(#287).
    ...(X_HANDLE ? { site: X_HANDLE } : {}),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // PWA — 매니페스트는 app/manifest.ts가 만든다.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // iOS에서 «홈 화면에 추가»로 열었을 때 주소창 없이 뜨게 한다(안드로이드는 매니페스트가 맡는다).
    capable: true,
    title: "포카스테이션",
    // 상태바를 흰 지면 위에 얹는다. black-translucent는 콘텐츠가 상태바 아래로 파고들어
    // 우리 상단바 48px과 겹친다.
    statusBarStyle: "default",
  },
  other: {
    // Next 16은 `capable: true`에 대해 표준 이름(`mobile-web-app-capable`)만 내보낸다. 구형 iOS는
    // 애플 접두어 메타만 읽기 때문에, 이게 없으면 홈 화면에서 열어도 주소창이 남는 기기가 생긴다.
    // 최신 iOS는 매니페스트의 display를 보므로 둘을 같이 두면 전 구간이 덮인다.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // 상태바 색. 모바일 상단바가 흰색이라 보라로 두면 화면 위쪽에만 보라 띠가 생긴다.
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
      className={`${notoSansKr.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <NotificationProvider>
            <WishlistProvider>
              <ToastProvider>
                {/* 상용에서는 아무것도 렌더하지 않는다. staging·로컬에서만 맨 위에 띠가 붙는다. */}
                <PreProductionBar />
                <Header />
                {/* 이메일 미인증 안내(#244) — 스스로 조건을 판단해 해당 없으면 아무것도 렌더하지 않는다. */}
                <EmailVerificationBanner />
                <main className="flex-1">{children}</main>
                {/* 모바일 화면을 갖춘 라우트(홈·목록·경매 상세)에서는 모바일 폭에서만 접힌다. */}
                <MobileChromeGate>
                  <Footer />
                </MobileChromeGate>
              </ToastProvider>
            </WishlistProvider>
          </NotificationProvider>
        </AuthProvider>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
