"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Skeleton from "react-loading-skeleton";
import { useAuth } from "../../hooks/useAuth";
import { getPosts, Post } from "../../lib/api";
import { formatDate } from "../../utils/formatDate";

export default function MyPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (user) {
      const loadMyPosts = async () => {
        try {
          // 모든 게시글을 가져와서 필터링 (백엔드에 사용자별 게시글 API가 있다면 그걸 사용)
          const data = await getPosts(1, 100);
          const filtered = data.posts.filter((post) => post.author?.id === user.id);
          setMyPosts(filtered);
        } catch (error) {
          console.error("게시글 로딩 실패:", error);
        } finally {
          setLoading(false);
        }
      };

      loadMyPosts();
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await logout();
      router.push("/");
    }
  };


  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <Skeleton className="mb-4 sm:mb-6" height={32} width={96} />
        <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
          {/* 프로필 영역 스켈레톤 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
            <div className="mb-3 sm:mb-4 flex items-center gap-3 sm:gap-4">
              <Skeleton circle height={60} width={60} className="sm:h-20 sm:w-20" />
              <div className="space-y-2">
                <Skeleton height={20} width={96} className="sm:h-6 sm:w-32" />
                <Skeleton height={14} width={72} className="sm:h-4 sm:w-24" />
              </div>
            </div>
            <Skeleton height={36} width="100%" className="sm:h-10" />
          </div>
          {/* 내 글 영역 스켈레톤 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
            <Skeleton className="mb-3 sm:mb-4" height={20} width={96} className="sm:h-6 sm:w-32" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3 sm:p-4">
                  <Skeleton className="mb-2" height={18} width="75%" className="sm:h-5" />
                  <Skeleton height={14} width="50%" className="sm:h-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
      <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-gray-900">내 정보</h1>

      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        {/* 프로필 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-3 sm:mb-4 flex items-center gap-3 sm:gap-4">
            {user.profileImage ? (
              <Image
                src={user.profileImage}
                alt={user.nickname}
                width={60}
                height={60}
                className="rounded-full sm:w-20 sm:h-20"
              />
            ) : (
              <div className="h-15 w-15 sm:h-20 sm:w-20 rounded-full bg-gray-200 flex items-center justify-center text-xl sm:text-2xl">
                👤
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                {user.nickname}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">카카오 계정</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto rounded-lg bg-red-500 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
          >
            로그아웃
          </button>
        </div>

        {/* 내 글 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-gray-800">
            내 게시글 ({myPosts.length})
          </h2>
          {myPosts.length > 0 ? (
            <div className="space-y-2">
              {myPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/board/${post.id}`}
                  className="block rounded-lg border border-gray-200 p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-sm sm:text-base font-medium text-gray-800 line-clamp-2">{post.title}</h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">
                    {formatDate(post.createdAt)} · 댓글 {post._count?.comments || 0} · 조회 {post.viewCount}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500">작성한 게시글이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
