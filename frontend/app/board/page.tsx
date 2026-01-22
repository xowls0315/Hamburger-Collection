"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlPencil } from "react-icons/sl";
import { getPosts, Post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { PostCardSkeleton } from "../components/Skeleton";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">게시판</h1>
        {user ? (
          <Link
            href="/board/new"
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
          >
            <SlPencil className="text-lg" />
            글 작성
          </Link>
        ) : (
          <div className="text-sm text-gray-500">
            글을 작성하려면 로그인이 필요합니다
          </div>
        )}
      </div>

      {/* 검색/필터 */}
      <div className="mb-6 flex gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
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
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-orange-400 hover:shadow-lg"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {post.title}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {post.author.nickname}
                  </span>
                </div>
                <p className="mb-3 text-gray-600 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{formatDate(post.createdAt)}</span>
                  <span>댓글 {post._count?.comments || 0}</span>
                  <span>조회 {post.viewCount}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`rounded-lg px-4 py-2 text-sm ${
                    page === p
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          {searchQuery ? "검색 결과가 없습니다." : "게시글이 없습니다."}
        </div>
      )}
    </div>
  );
}
