import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // radius는 @theme의 역할 토큰(control·card·sheet)만 쓴다(#758). 숫자·임의값이 섞이면
  // 세션마다 새 값이 생겨 같은 요소가 화면마다 달라진다.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["app/intro/PhoneMockup.tsx"], // 기기 일러스트라 실제 기기 곡률을 따른다
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\brounded(-[a-z]{1,2})?-(\\[|r[0-9]\\b|(sm|md|lg|xl|2xl|3xl)\\b)/]",
          message: "radius는 rounded-control·rounded-card·rounded-sheet(원형은 rounded-full)만 씁니다.",
        },
        {
          selector: "TemplateElement[value.raw=/\\brounded(-[a-z]{1,2})?-(\\[|r[0-9]\\b|(sm|md|lg|xl|2xl|3xl)\\b)/]",
          message: "radius는 rounded-control·rounded-card·rounded-sheet(원형은 rounded-full)만 씁니다.",
        },
        // 글자 크기는 타입 토큰 9단계만 쓴다(#769). 0.5px 단위 임의 크기가 30종까지 늘었었다.
        {
          selector: "Literal[value=/(^|[\\s:])text-(\\[[0-9.]+px\\]|(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\\b)/]",
          message: "글자 크기는 text-caption·label·body-s·body·body-l·title-s·title·title-l·display만 씁니다.",
        },
        {
          selector: "TemplateElement[value.raw=/(^|[\\s:])text-(\\[[0-9.]+px\\]|(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\\b)/]",
          message: "글자 크기는 text-caption·label·body-s·body·body-l·title-s·title·title-l·display만 씁니다.",
        },
        // 여백은 역할 토큰(px-gutter·mt-section 등)이나 표준 단계를 쓴다(#776). 임의 px 여백이 화면마다
        // 3·5·7·9·11·13·17·18·25px처럼 새 값을 만들었다. 안전영역(env)·calc 식은 기기 값이라 허용한다.
        {
          selector: "Literal[value=/(^|[\\s:])-?(p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y)-\\[[0-9.]+px\\]/]",
          message: "여백은 역할 토큰(gutter·page·tight·head·row·card·cta·group·section·footer·empty)이나 표준 단계를 씁니다. 임의 px 금지.",
        },
        {
          selector: "TemplateElement[value.raw=/(^|[\\s:])-?(p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y)-\\[[0-9.]+px\\]/]",
          message: "여백은 역할 토큰(gutter·page·tight·head·row·card·cta·group·section·footer·empty)이나 표준 단계를 씁니다. 임의 px 금지.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
