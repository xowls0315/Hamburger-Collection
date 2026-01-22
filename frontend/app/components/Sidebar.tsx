"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuClipboardList } from "react-icons/lu";
import { FaUserCircle, FaStar } from "react-icons/fa";
import Skeleton from "react-loading-skeleton";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading, login, logout } = useAuth();

  return (
    <aside className="hidden w-64 border-l border-gray-200 bg-gray-50 p-4 md:block">
      <div className="space-y-4">
        {/* 로그인 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton circle height={32} width={32} />
                <Skeleton height={16} width={96} />
              </div>
              <Skeleton height={40} width="100%" />
            </div>
          ) : user ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                {user.profileImage && (
                  <Image
                    src={user.profileImage}
                    alt={user.nickname}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <div className="text-sm font-medium text-gray-800">
                  {user.nickname}
                </div>
              </div>
              <button
                onClick={logout}
                className="mt-2 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div>
              <div className="text-sm text-gray-600">로그인이 필요합니다</div>
              <button
                onClick={login}
                className="mt-2 w-full rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-500 cursor-pointer"
              >
                카카오로 로그인
              </button>
            </div>
          )}
        </div>

        {/* 네비게이션 */}
        <nav className="space-y-2">
          <Link
            href="/board"
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              pathname?.startsWith("/board")
                ? "bg-orange-100 text-orange-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <LuClipboardList className="text-lg" />
            게시판
          </Link>
          {user && (
            <>
              <Link
                href="/favorites"
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === "/favorites"
                    ? "bg-orange-100 text-orange-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FaStar className="text-lg" />
                즐겨찾기
              </Link>
              <Link
                href="/mypage"
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === "/mypage"
                    ? "bg-orange-100 text-orange-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FaUserCircle className="text-lg" />
                내 정보
              </Link>
            </>
          )}
        </nav>
        
      </div>
    </aside>
  );
}
