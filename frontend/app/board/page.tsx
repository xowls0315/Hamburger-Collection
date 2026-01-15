import Link from "next/link";

export default function BoardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">게시판</h1>
        <Link
          href="/board/new"
          className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
        >
          ✏️ 글 작성
        </Link>
      </div>

      {/* 검색/필터 */}
      <div className="mb-6 flex gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
        />
        <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200">
          검색
        </button>
      </div>

      {/* 게시글 목록 */}
      <div className="space-y-4">
        {/* 플레이스홀더 게시글 */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <Link
            key={i}
            href={`/board/${i}`}
            className="block rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-orange-400 hover:shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                게시글 제목 {i}
              </h2>
              <span className="text-sm text-gray-500">작성자명</span>
            </div>
            <p className="mb-3 text-gray-600 line-clamp-2">
              게시글 내용 미리보기입니다. 이 부분은 게시글의 본문 일부가
              표시됩니다...
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>2024.01.{String(i).padStart(2, "0")}</span>
              <span>댓글 {i}</span>
              <span>조회 {i * 10}</span>
            </div>
          </Link>
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
