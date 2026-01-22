import Link from "next/link";
import Image from "next/image";
import { LuClipboardList } from "react-icons/lu";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { getBrands, Brand } from "./lib/api";

// 헤더 순서와 동일한 브랜드 순서
const brandOrder = [
  "mcdonalds",
  "burgerking",
  "lotteria",
  "momstouch",
  "kfc",
  "nobrand",
  "frank",
];

// 브랜드별 로고 이미지 경로
const brandLogos: Record<string, string> = {
  mcdonalds: "/mcdonalds.svg",
  burgerking: "/burgerking.svg",
  lotteria: "/lotteria.png",
  momstouch: "/momstouch.png",
  kfc: "/kfc.png",
  nobrand: "/nobrand.jpg",
  frank: "/frank.png",
};

export default async function Home() {
  let brands: Brand[] = [];
  try {
    const fetchedBrands = await getBrands();
    // 헤더 순서대로 정렬
    brands = fetchedBrands.sort((a: Brand, b: Brand) => {
      const indexA = brandOrder.indexOf(a.slug);
      const indexB = brandOrder.indexOf(b.slug);
      // 순서에 없는 브랜드는 맨 뒤로
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  } catch (error) {
    console.error("브랜드 목록 로딩 실패:", error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <Image
            src="/logo.png"
            alt="Hamburger-Collection Logo"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
          <h1 className="text-4xl font-bold text-gray-900">
            Hamburger-Collection
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          브랜드별 메뉴와 영양정보를 한 곳에서 탐색하세요
        </p>
      </div>

      {/* 브랜드 그리드 */}
      <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {brands.length > 0 ? (
          brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="group rounded-lg border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-orange-400 hover:shadow-lg"
            >
              <div className="mx-auto mb-3 h-16 w-16 flex items-center justify-center">
                {brandLogos[brand.slug] ? (
                  <Image
                    src={brandLogos[brand.slug]}
                    alt={brand.name}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-500 flex items-center justify-center text-2xl">
                    🍔
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-800 group-hover:text-orange-600">
                {brand.name}
              </h3>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            브랜드를 불러오는 중...
          </div>
        )}
      </div>

      {/* 빠른 링크 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/board"
          className="rounded-lg border-2 border-gray-200 bg-white p-6 transition-all hover:border-orange-400 hover:shadow-lg"
        >
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-gray-800">
            <LuClipboardList className="text-xl" />
            게시판
          </h2>
          <p className="text-gray-600">커뮤니티에서 이야기를 나눠보세요</p>
        </Link>
        <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-gray-800">
            <FaMagnifyingGlass className="text-xl" />
            추천 메뉴
          </h2>
          <p className="text-gray-600">준비 중입니다</p>
        </div>
      </div>
    </div>
  );
}
