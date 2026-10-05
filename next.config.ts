import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "https://api.pay1oad.com";
const WS_ORIGIN = process.env.NEXT_PUBLIC_WS_URL ?? "wss://api.pay1oad.com";

/** 폰트를 받아오는 CDN (app/layout.tsx 에서 stylesheet 로 불러온다) */
const FONT_CDN = "https://cdn.jsdelivr.net";

/** 구글 로그인 버튼이 붙이는 스크립트와 그 안의 iframe */
const GOOGLE = "https://accounts.google.com";

/**
 * Content-Security-Policy.
 *
 * script-src 에 'unsafe-inline' 이 들어 있다. Next.js App Router 가 하이드레이션용
 * 인라인 스크립트를 넣기 때문인데, 이걸 없애려면 요청마다 nonce 를 발급하는
 * 미들웨어가 필요하고 잘못 걸면 사이트 전체가 하얗게 뜬다. 지금은 브라우저에서
 * 확인할 수 없어 무리하지 않았다.
 *
 * 그래서 CSP 의 XSS 차단 효과는 제한적이다. 대신 공짜로 확실히 막히는 것들은
 * 전부 조였다 — 특히 connect-src 는 스크립트가 주입되더라도 <b>훔친 데이터를
 * 외부로 보낼 곳</b>을 우리 API 로 묶는다.
 *
 * img-src 에 https: 를 열어둔 이유: 게시글 본문에 외부 이미지 주소를 붙여넣은
 * 글들이 이미 있어서, 좁히면 기존 글이 깨진다.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${GOOGLE}`,
  // React 인라인 style={{...}} 이 전부 style 속성이라 'unsafe-inline' 이 필요하다
  `style-src 'self' 'unsafe-inline' ${FONT_CDN} ${GOOGLE}`,
  `font-src 'self' data: ${FONT_CDN}`,
  `img-src 'self' data: blob: https: ${API_ORIGIN}`,
  `connect-src 'self' ${API_ORIGIN} ${WS_ORIGIN} ${GOOGLE}`,
  `frame-src ${GOOGLE}`,
  // 아래 넷은 앱 동작에 영향이 없으면서 실제 공격을 막는다
  "frame-ancestors 'none'", // 클릭재킹
  "base-uri 'self'", // <base> 주입으로 상대경로 스크립트 탈취
  "form-action 'self'", // 폼 전송지 바꿔치기로 비밀번호 빼내기
  "object-src 'none'", // 플러그인 기반 스크립트 실행
  // API 가 https 일 때만 켠다. 로컬에서 프로덕션 빌드를 띄우면
  // http://localhost:8000 호출까지 https 로 바꾸려 들 수 있다.
  ...(API_ORIGIN.startsWith("https:") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // 한 번 https 로 들어온 브라우저는 이후 http 로 접속하지 않는다.
  // preload 는 넣지 않았다 — 등록하면 되돌리기 어렵고, 서브도메인 전부가 https 여야 한다.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // frame-ancestors 를 이해하지 못하는 구형 브라우저용
  { key: "X-Frame-Options", value: "DENY" },
  // 외부로 나갈 때 경로·쿼리를 흘리지 않는다 (초대 토큰이 URL 에 실린다)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/uploads/**",
      },
    ],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async redirects() {
    return [
      // 초대 링크가 한동안 /signup 으로 발급됐다. 이미 사람들에게 뿌려진 링크가
      // 404 로 죽지 않도록 회원가입 페이지로 넘긴다 (쿼리스트링은 그대로 따라간다).
      { source: "/signup", destination: "/register", permanent: false },
    ];
  },
};

export default nextConfig;
