import Link from "next/link";

export default function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/board"
          className="text-sm text-gray-600 hover:text-orange-600"
        >
          ← 게시판으로 돌아가기
        </Link>
      </div>

      {/* 게시글 영역 */}
      <article className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              게시글 제목
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>작성자명</span>
              <span>2024.01.01</span>
              <span>조회 100</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
              수정
            </button>
            <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              삭제
            </button>
          </div>
        </div>

        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">
            게시글 본문 내용이 여기에 표시됩니다. 여러 줄의 텍스트가 들어갈 수
            있습니다.
          </p>
        </div>
      </article>

      {/* 댓글 영역 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">댓글 (0)</h2>

        {/* 댓글 작성 영역 */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm text-gray-600">
            댓글을 작성하려면 로그인이 필요합니다.
          </p>
          <button className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-500">
            카카오로 로그인
          </button>
        </div>

        {/* 댓글 목록 */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-800">댓글 작성자</span>
              <span className="text-sm text-gray-500">2024.01.01</span>
            </div>
            <p className="text-gray-700">댓글 내용이 여기에 표시됩니다.</p>
            <div className="mt-2 flex gap-2">
              <button className="text-sm text-gray-600 hover:text-orange-600">
                수정
              </button>
              <button className="text-sm text-gray-600 hover:text-red-600">
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
