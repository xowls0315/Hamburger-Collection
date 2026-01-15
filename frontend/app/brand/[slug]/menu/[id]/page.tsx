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

export default function MenuDetailPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  const brandName = brands[params.slug];

  if (!brandName) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/brand/${params.slug}`}
          className="text-sm text-gray-600 hover:text-orange-600"
        >
          ← {brandName} 메뉴로 돌아가기
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* 이미지 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="aspect-square w-full rounded-lg bg-gray-200"></div>
        </div>

        {/* 정보 영역 */}
        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">메뉴 이름</h1>
            <p className="text-gray-600">{brandName}</p>
          </div>

          {/* 핵심 영양정보 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              주요 영양성분
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">칼로리</div>
                <div className="text-xl font-bold text-gray-900">- kcal</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">나트륨</div>
                <div className="text-xl font-bold text-gray-900">- mg</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">단백질</div>
                <div className="text-xl font-bold text-gray-900">- g</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">당류</div>
                <div className="text-xl font-bold text-gray-900">- g</div>
              </div>
            </div>
          </div>

          {/* 출처 링크 */}
          <div>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              출처 보기 →
            </a>
          </div>
        </div>
      </div>

      {/* 상세 영양성분 표 */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          상세 영양성분
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  항목
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  함량
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-700">칼로리</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  - kcal
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-700">탄수화물</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  - g
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-700">단백질</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  - g
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-700">지방</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  - g
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-700">나트륨</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  - mg
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-700">당류</td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  - g
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
