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
