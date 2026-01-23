"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuClipboardList, LuCircleUserRound } from "react-icons/lu";
import { FaUserCircle, FaStar } from "react-icons/fa";
import { FaBook } from "react-icons/fa6";
import { IoCloseSharp } from "react-icons/io5";
import Skeleton from "react-loading-skeleton";
import { useAuth } from "../../hooks/useAuth";
import Image from "next/image";

const brands = [
  { slug: "mcdonalds", name: "맥도날드" },
  { slug: "burgerking", name: "버거킹" },
  { slug: "lotteria", name: "롯데리아" },
  { slug: "momstouch", name: "맘스터치" },
  { slug: "kfc", name: "KFC" },
  { slug: "nobrand", name: "노브랜드버거" },
  { slug: "frank", name: "프랭크버거" },
];

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user, loading, login, logout } = useAuth();

  return (
    <aside
      className={`fixed top-0 right-0 h-full w-[280px] md:w-[320px] bg-white shadow-2xl z-[50] transform transition-transform duration-300 ease-in-out lg:hidden ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="h-full overflow-y-auto p-4">
        {/* 닫기 버튼 */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="메뉴 닫기"
          >
            <IoCloseSharp className="w-6 h-6 text-gray-700 cursor-pointer" />
          </button>
        </div>
        <div className="space-y-4">
          {/* 로그인 영역 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
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
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="mt-2 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div>
                <div className="text-sm text-gray-600">로그인이 필요합니다</div>
                <button
                  onClick={() => {
                    login();
                    onClose();
                  }}
                  className="mt-2 w-full rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-500 cursor-pointer"
                >
                  카카오로 로그인
                </button>
              </div>
            )}
          </div>

          {/* 브랜드 네비게이션 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">브랜드</h3>
            <nav className="space-y-2 text-center">
              {brands.map((brand) => {
                const isActive = pathname?.startsWith(`/brand/${brand.slug}`);
                return (
                  <Link
                    key={brand.slug}
                    href={`/brand/${brand.slug}`}
                    onClick={onClose}
                    className={`block rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-200"
                        : "border-orange-200 bg-white text-orange-600 hover:border-orange-400 hover:bg-orange-50"
                    }`}
                  >
                    {brand.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 네비게이션 */}
          <nav className="space-y-2">
            <Link
              href="/guide"
              onClick={onClose}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === "/guide"
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FaBook className="text-lg" />
              가이드
            </Link>
            <Link
              href="/board"
              onClick={onClose}
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
                  onClick={onClose}
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
                  onClick={onClose}
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
      </div>
    </aside>
  );
}
