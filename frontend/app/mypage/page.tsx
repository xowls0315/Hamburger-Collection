"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Skeleton from "react-loading-skeleton";
import { useAuth } from "../context/AuthContext";
import { getPosts, Post } from "../lib/api";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6" height={36} width={128} />
        <div className="mx-auto max-w-2xl space-y-6">
          {/* 프로필 영역 스켈레톤 */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-4">
              <Skeleton circle height={80} width={80} />
              <div className="space-y-2">
                <Skeleton height={24} width={128} />
                <Skeleton height={16} width={96} />
              </div>
            </div>
            <Skeleton height={40} width="100%" />
          </div>
          {/* 내 글 영역 스켈레톤 */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <Skeleton className="mb-4" height={24} width={128} />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-4">
                  <Skeleton className="mb-2" height={20} width="75%" />
                  <Skeleton height={16} width="50%" />
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">내 정보</h1>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* 프로필 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-4">
            {user.profileImage ? (
              <Image
                src={user.profileImage}
                alt={user.nickname}
                width={80}
                height={80}
                className="rounded-full"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                👤
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {user.nickname}
              </h2>
              <p className="text-sm text-gray-500">카카오 계정</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
          >
            로그아웃
          </button>
        </div>

        {/* 내 글 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            내 게시글 ({myPosts.length})
          </h2>
          {myPosts.length > 0 ? (
            <div className="space-y-2">
              {myPosts.map((post) => (
                <a
                  key={post.id}
                  href={`/board/${post.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <h3 className="font-medium text-gray-800">{post.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(post.createdAt)} · 댓글 {post._count?.comments || 0} · 조회 {post.viewCount}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">작성한 게시글이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
