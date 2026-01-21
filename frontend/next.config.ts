import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 외부 이미지 도메인 허용
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mcdonalds.co.kr" },
      { protocol: "https", hostname: "mob-prd.burgerking.co.kr" },
      { protocol: "https", hostname: "www.lotteeatz.com" },
      { protocol: "https", hostname: "momstouch.co.kr" },
      { protocol: "https", hostname: "www.shinsegaefood.com" },
      { protocol: "https", hostname: "frankburger.co.kr" },
      { protocol: "https", hostname: "kfcapi.inicis.com" },
      { protocol: "https", hostname: "k.kakaocdn.net" },
    ],
  },
};

export default nextConfig;
