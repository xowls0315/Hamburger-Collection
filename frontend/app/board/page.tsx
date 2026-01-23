"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlPencil } from "react-icons/sl";
import { getPosts, Post } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { PostCardSkeleton } from "../../_components/ui/Skeleton";
import { formatDate } from "../../utils/formatDate";

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const data = await getPosts(page, 20);
        setPosts(data.posts);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("게시글 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`/board?page=${newPage}`);
  };

  const filteredPosts = searchQuery
    ? posts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;


  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">게시판</h1>
        {user ? (
          <Link
            href="/board/new"
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-white hover:bg-orange-600 transition-colors"
          >
            <SlPencil className="text-base sm:text-lg" />
            <span className="whitespace-nowrap">글 작성</span>
          </Link>
        ) : (
          <div className="text-xs sm:text-sm text-gray-500">
            글을 작성하려면 로그인이 필요합니다
          </div>
        )}
      </div>

      {/* 검색/필터 */}
      <div className="mb-4 sm:mb-6 flex gap-2 sm:gap-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-sm sm:text-base"
        />
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <>
          <div className="space-y-3 sm:space-y-4">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 sm:p-6 transition-all hover:border-orange-400 hover:shadow-lg"
              >
                <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 line-clamp-2">
                    {post.title}
                  </h2>
                  <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                    {post.author?.nickname || "익명"}
                  </span>
                </div>
                <p className="mb-3 text-sm sm:text-base text-gray-600 line-clamp-2">{post.content}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                  <span>{formatDate(post.createdAt)}</span>
                  <span>댓글 {post._count?.comments || 0}</span>
                  <span>조회 {post.viewCount}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-6 sm:mt-8 flex justify-center gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm ${
                    page === p
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-sm sm:text-base text-gray-500 py-6 sm:py-8">
          {searchQuery ? "검색 결과가 없습니다." : "게시글이 없습니다."}
        </div>
      )}
    </div>
  );
}
