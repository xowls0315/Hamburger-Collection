"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

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

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* 왼쪽: Hamburger-Collection */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-orange-600">
            <Image
              src="/logo.png"
              alt="Hamburger-Collection Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            Hamburger-Collection
          </Link>

          {/* 가운데: 브랜드들 */}
          <nav className="flex gap-2 overflow-x-auto">
            {brands.map((brand) => {
              const isActive = pathname?.startsWith(`/brand/${brand.slug}`);
              return (
                <Link
                  key={brand.slug}
                  href={`/brand/${brand.slug}`}
                  className={`whitespace-nowrap rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all duration-200 ${
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

          {/* 오른쪽: 가이드, 사용자 정보 */}
          <div className="flex items-center gap-4">
            <Link
              href="/guide"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === "/guide"
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              가이드
            </Link>
            {user && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{user.nickname} 님</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
