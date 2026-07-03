# frontend

Pocastation(K-pop 포토카드 특화 경매 플랫폼)의 프론트엔드. Next.js(App Router) + TypeScript + Tailwind CSS.

백엔드(`api.pocastation.com` / 로컬 `localhost:8080`)와 별도 저장소로 배포·개발된다. 설계 배경은 `pocastation-design-plan.md` 참고.

## 개발 환경 실행

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL 등 값 확인/수정
npm run dev
```

백엔드(`backend/`)를 `docker-compose up -d` + `./gradlew bootRun`으로 먼저 띄워야 API 호출이 동작한다.

## 디자인 토큰

`app/globals.css`의 `@theme` 블록에 브랜드 컬러·반경·섀도우·폰트를 정의한다(구버전 저장소의 비주얼 아이덴티티를 이식). `bg-primary`, `text-text-2`, `rounded-r4`, `shadow-card`, `font-display` 같은 Tailwind 유틸리티로 바로 사용한다.

## 브랜치 전략

`main` ← `develop` ← `feature/{이슈번호}` (백엔드와 동일 컨벤션).
