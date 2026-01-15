import Link from "next/link";
import { notFound } from "next/navigation";

const brands: Record<string, string> = {
  mcdonalds: "맥도날드",
  burgerking: "버거킹",
  lotte: "롯데리아",
  momstouch: "맘스터치",
  kfc: "KFC",
  nobrand: "노브랜드버거",
  frank: "프랭크버거",
};

export default function BrandPage({
  params,
}: {
  params: { slug: string };
}) {
  const brandName = brands[params.slug];

  if (!brandName) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{brandName}</h1>
        <Link
          href={`/brand/${params.slug}/stores`}
          className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
        >
          📍 매장 찾기
        </Link>
      </div>

      {/* 필터 영역 */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <select className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          <option value="">전체 카테고리</option>
          <option value="burger">버거</option>
          <option value="chicken">치킨</option>
          <option value="side">사이드</option>
          <option value="drink">음료</option>
        </select>
        <select className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          <option value="">정렬</option>
          <option value="kcal_asc">칼로리 낮은순</option>
          <option value="kcal_desc">칼로리 높은순</option>
        </select>
      </div>

      {/* 메뉴 리스트 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 플레이스홀더 카드 */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg"
          >
            <div className="mb-3 aspect-video w-full rounded-lg bg-gray-200"></div>
            <h3 className="mb-2 font-semibold text-gray-800">메뉴 이름</h3>
            <div className="mb-2 flex gap-4 text-sm text-gray-600">
              <span>칼로리: - kcal</span>
              <span>나트륨: - mg</span>
            </div>
            <Link
              href={`/brand/${params.slug}/menu/${i}`}
              className="text-sm text-orange-600 hover:underline"
            >
              상세보기 →
            </Link>
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      <div className="mt-8 flex justify-center gap-2">
        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
          이전
        </button>
        <button className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white">
          1
        </button>
        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
          2
        </button>
        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
          다음
        </button>
      </div>
    </div>
  );
}
