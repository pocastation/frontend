// Daum(카카오) 우편번호 서비스(키 불요·무료·국내 표준) 로더. 배송지 입력이 필요한 여러 곳에서
// 재사용한다(주소록·주문 배송지 입력). 공식 타입이 없어 필요한 표면만 선언한다.
const POSTCODE_SCRIPT = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

export type DaumPostcodeData = { zonecode: string; roadAddress: string; jibunAddress: string };

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void; width?: string; height?: string }) => {
        embed: (element: HTMLElement) => void;
      };
    };
  }
}

let postcodeScriptPromise: Promise<void> | null = null;

export function loadPostcodeScript(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve();
  if (!postcodeScriptPromise) {
    postcodeScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = POSTCODE_SCRIPT;
      script.onload = () => resolve();
      script.onerror = () => {
        postcodeScriptPromise = null;
        reject(new Error("우편번호 서비스를 불러오지 못했습니다."));
      };
      document.head.appendChild(script);
    });
  }
  return postcodeScriptPromise;
}
