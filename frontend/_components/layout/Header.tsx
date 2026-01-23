"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoCloseSharp } from "react-icons/io5";
import { useAuth } from "../../hooks/useAuth";
import MobileSidebar from "./MobileSidebar";

const brands = [
  { slug: "mcdonalds", name: "맥도날드" },
  { slug: "burgerking", name: "버거킹" },
  { slug: "lotteria", name: "롯데리아" },
  { slug: "momstouch", name: "맘스터치" },
  { slug: "kfc", name: "KFC" },
  { slug: "nobrand", name: "노브랜드버거" },
  { slug: "frank", name: "프랭크버거" },
];

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* 왼쪽: Hamburger-Collection */}
            <Link href="/" className="flex items-center gap-2 text-lg xl:text-xl font-bold text-orange-600 shrink-0" onClick={closeMenu}>
              <Image
                src="/logo.png"
                alt="Hamburger-Collection Logo"
                width={30}
                height={30}
                className="object-contain xl:w-8 xl:h-8"
              />
              <span className="hidden sm:inline whitespace-nowrap">Hamburger-Collection</span>
              <span className="sm:hidden">Hamburger-Collection</span>
            </Link>

            {/* 가운데: 브랜드들 (PC에서만 표시) */}
            <nav className="hidden lg:flex gap-1.5 xl:gap-2 overflow-x-auto justify-center flex-1 min-w-0 mx-4">
              {brands.map((brand) => {
                const isActive = pathname?.startsWith(`/brand/${brand.slug}`);
                return (
                  <Link
                    key={brand.slug}
                    href={`/brand/${brand.slug}`}
                    className={`whitespace-nowrap rounded-lg border-2 px-3 xl:px-4 py-1.5 xl:py-2 text-xs xl:text-sm font-semibold transition-all duration-200 shrink-0 ${
                      isActive
                        ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-200 hover:bg-orange-600"
                        : "border-orange-200 bg-white text-orange-600 hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm"
                    }`}
                  >
                    {brand.name}
                  </Link>
                );
              })}
            </nav>

            {/* 오른쪽: 가이드, 사용자 정보 (PC에서만 표시) */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4 shrink-0">
              <Link
                href="/guide"
                className={`rounded-lg px-3 xl:px-4 py-1.5 xl:py-2 text-xs xl:text-sm font-bold transition-colors whitespace-nowrap ${
                  pathname === "/guide"
                    ? "bg-orange-100 text-orange-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                가이드
              </Link>
              {user && (
                <div className="flex items-center gap-2 text-xs xl:text-sm text-gray-600 whitespace-nowrap">
                  <span className="underline">{user.nickname} 님</span>
                </div>
              )}
            </div>

            {/* 햄버거 메뉴 버튼 (태블릿/모바일에서만 표시) */}
            <button
              onClick={toggleMenu}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors relative z-[60]"
              aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            >
              {isMenuOpen ? (
                <IoCloseSharp className="w-6 h-6 text-gray-700 cursor-pointer" />
              ) : (
                <GiHamburgerMenu className="w-6 h-6 text-gray-700 cursor-pointer" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일/태블릿 사이드바 오버레이 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* 모바일/태블릿 사이드바 */}
      <MobileSidebar isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  );
}
