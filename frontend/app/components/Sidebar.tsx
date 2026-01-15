"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-l border-gray-200 bg-gray-50 p-4 md:block">
      <div className="space-y-4">
        {/* 로그인 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">로그인이 필요합니다</div>
          <button className="mt-2 w-full rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-500">
            카카오로 로그인
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="space-y-2">
          <Link
            href="/board"
            className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              pathname?.startsWith("/board")
                ? "bg-orange-100 text-orange-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            📝 게시판
          </Link>
          <Link
            href="/mypage"
            className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              pathname === "/mypage"
                ? "bg-orange-100 text-orange-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            👤 내 정보
          </Link>
        </nav>

        {/* 옵션 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">
            최근 본 메뉴
          </h3>
          <p className="text-xs text-gray-500">준비 중입니다</p>
        </div>
      </div>
    </aside>
  );
}
