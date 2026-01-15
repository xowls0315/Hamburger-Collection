import Link from "next/link";

export default function MyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">내 정보</h1>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* 프로필 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gray-200"></div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">사용자명</h2>
              <p className="text-sm text-gray-500">kakao@example.com</p>
            </div>
          </div>
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
            로그아웃
          </button>
        </div>

        {/* 내 글 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">내 게시글</h2>
          <div className="space-y-2">
            <Link
              href="/board/1"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-800">게시글 제목 1</h3>
              <p className="mt-1 text-sm text-gray-500">2024.01.01</p>
            </Link>
            <Link
              href="/board/2"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-800">게시글 제목 2</h3>
              <p className="mt-1 text-sm text-gray-500">2024.01.02</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
