"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuClipboardList, LuCircleUserRound } from "react-icons/lu";
import { FaUserCircle, FaStar } from "react-icons/fa";
import Skeleton from "react-loading-skeleton";
import { useAuth } from "../../hooks/useAuth";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading, login, logout } = useAuth();

  return (
    <aside className="hidden w-64 border-l border-gray-200 bg-gray-50 p-4 lg:block">
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
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt={user.nickname}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <LuCircleUserRound className="text-2xl text-gray-400" />
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
            <div className="space-y-2">
              <div className="text-sm text-gray-600">로그인이 필요합니다</div>
              <button
                onClick={login}
                className="w-full rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-500 cursor-pointer"
              >
                카카오로 로그인
              </button>
              <Link
                href="/auth/login"
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                로그인
              </Link>
              <div className="flex gap-2">
                <Link
                  href="/auth/signup"
                  className="flex-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-center text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  회원가입
                </Link>
                <Link
                  href="/auth/find-id"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ID/PW 찾기
                </Link>
              </div>
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
