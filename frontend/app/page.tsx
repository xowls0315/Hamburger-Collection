import Link from "next/link";

const brands = [
  { slug: "mcdonalds", name: "맥도날드", color: "bg-yellow-500" },
  { slug: "burgerking", name: "버거킹", color: "bg-red-600" },
  { slug: "lotte", name: "롯데리아", color: "bg-blue-600" },
  { slug: "momstouch", name: "맘스터치", color: "bg-orange-500" },
  { slug: "kfc", name: "KFC", color: "bg-red-700" },
  { slug: "nobrand", name: "노브랜드버거", color: "bg-gray-800" },
  { slug: "frank", name: "프랭크버거", color: "bg-green-600" },
];

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          🍔 햄버거 모음 사이트
        </h1>
        <p className="text-lg text-gray-600">
          브랜드별 메뉴와 영양정보를 한 곳에서 탐색하세요
        </p>
      </div>

      {/* 브랜드 그리드 */}
      <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/brand/${brand.slug}`}
            className="group rounded-lg border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-orange-400 hover:shadow-lg"
          >
            <div
              className={`mx-auto mb-3 h-16 w-16 rounded-full ${brand.color} flex items-center justify-center text-2xl`}
            >
              🍔
            </div>
            <h3 className="font-semibold text-gray-800 group-hover:text-orange-600">
              {brand.name}
            </h3>
          </Link>
        ))}
      </div>

      {/* 빠른 링크 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/board"
          className="rounded-lg border-2 border-gray-200 bg-white p-6 transition-all hover:border-orange-400 hover:shadow-lg"
        >
          <h2 className="mb-2 text-xl font-semibold text-gray-800">📝 게시판</h2>
          <p className="text-gray-600">커뮤니티에서 이야기를 나눠보세요</p>
        </Link>
        <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold text-gray-800">🔍 추천 메뉴</h2>
          <p className="text-gray-600">준비 중입니다</p>
        </div>
      </div>
    </div>
  );
}
