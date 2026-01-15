"use client";

import Link from "next/link";
import { useState } from "react";

const brands: Record<string, string> = {
  mcdonalds: "맥도날드",
  burgerking: "버거킹",
  lotte: "롯데리아",
  momstouch: "맘스터치",
  kfc: "KFC",
  nobrand: "노브랜드버거",
  frank: "프랭크버거",
};

export default function StoresPage({
  params,
}: {
  params: { slug: string };
}) {
  const brandName = brands[params.slug] || "브랜드";
  const [showList, setShowList] = useState(true);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/brand/${params.slug}`}
            className="text-sm text-gray-600 hover:text-orange-600"
          >
            ← {brandName} 메뉴로 돌아가기
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {brandName} 매장 찾기
          </h1>
        </div>
        <button
          onClick={() => setShowList(!showList)}
          className="md:hidden rounded-lg border border-gray-300 px-4 py-2 text-sm"
        >
          {showList ? "지도 보기" : "리스트 보기"}
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <button className="w-full rounded-lg bg-orange-500 px-4 py-3 text-white hover:bg-orange-600">
          📍 내 주변 매장 검색
        </button>
        <p className="mt-2 text-xs text-gray-500">
          위치 권한을 허용해주시면 주변 매장을 찾아드립니다
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 지도 영역 */}
        <div
          className={`${
            showList ? "hidden md:block" : "block"
          } rounded-lg border border-gray-200 bg-gray-100`}
        >
          <div className="flex h-[600px] items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="mb-2 text-4xl">🗺️</div>
              <p>카카오 지도가 표시됩니다</p>
            </div>
          </div>
        </div>

        {/* 매장 리스트 */}
        <div
          className={`${
            showList ? "block" : "hidden md:block"
          } space-y-4 overflow-y-auto`}
          style={{ maxHeight: "600px" }}
        >
          {/* 플레이스홀더 매장 카드 */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg"
            >
              <h3 className="mb-2 font-semibold text-gray-800">매장명 {i}</h3>
              <p className="mb-2 text-sm text-gray-600">
                서울시 강남구 테헤란로 123
              </p>
              <div className="mb-2 flex items-center gap-4 text-sm text-gray-500">
                <span>거리: 약 1.{i}km</span>
                <span>전화: 02-1234-567{i}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  카카오맵에서 보기 →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
