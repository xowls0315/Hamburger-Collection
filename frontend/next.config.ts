import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 외부 이미지 도메인 허용
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mcdonalds.co.kr" },
      { protocol: "https", hostname: "mob-prd.burgerking.co.kr" },
      { protocol: "https", hostname: "www.lotteeatz.com" },
      { protocol: "https", hostname: "img.lotteeatz.com" },
      { protocol: "https", hostname: "*.lotteeatz.com" }, // 모든 롯데리아 서브도메인 허용
      { protocol: "https", hostname: "momstouch.co.kr" },
      { protocol: "https", hostname: "www.shinsegaefood.com" },
      { protocol: "https", hostname: "frankburger.co.kr" },
      { protocol: "https", hostname: "kfcapi.inicis.com" },
      { protocol: "https", hostname: "k.kakaocdn.net" },
      { protocol: "https", hostname: "*.kakaocdn.net" }, // 모든 카카오 CDN 서브도메인 허용
    ],
  },
};

export default nextConfig;
