"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const brands = [
  { slug: "mcdonalds", name: "맥도날드" },
  { slug: "burgerking", name: "버거킹" },
  { slug: "lotte", name: "롯데리아" },
  { slug: "momstouch", name: "맘스터치" },
  { slug: "kfc", name: "KFC" },
  { slug: "nobrand", name: "노브랜드버거" },
  { slug: "frank", name: "프랭크버거" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-orange-600">
            🍔 햄버거 모음
          </Link>
          <nav className="flex gap-1 overflow-x-auto">
            {brands.map((brand) => {
              const isActive = pathname?.startsWith(`/brand/${brand.slug}`);
              return (
                <Link
                  key={brand.slug}
                  href={`/brand/${brand.slug}`}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-orange-100 text-orange-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {brand.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
