"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaLongArrowAltLeft } from "react-icons/fa";
import { createPost } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Skeleton } from "../../components/Skeleton";

export default function NewPostPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      login();
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setLoading(true);
      const post = await createPost({ title, content });
      router.push(`/board/${post.id}`);
    } catch (error: any) {
      alert(error.message || "게시글 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-10 w-48" />
        <div className="mx-auto max-w-3xl">
          <Skeleton className="mb-6 h-9 w-32" />
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            <div>
              <Skeleton className="mb-2 h-5 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="mb-2 h-5 w-16" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Link
              href="/board"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
            >
              <FaLongArrowAltLeft /> 게시판으로 돌아가기
            </Link>
          </div>
          <div className="text-center">
            <p className="mb-4 text-gray-600">게시글을 작성하려면 로그인이 필요합니다.</p>
            <button
              onClick={login}
              className="rounded-lg bg-yellow-400 px-6 py-2 text-sm font-medium text-black hover:bg-yellow-500 cursor-pointer"
            >
              카카오로 로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/board"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
          >
            <FaLongArrowAltLeft /> 게시판으로 돌아가기
          </Link>
        </div>
        <h1 className="mb-6 text-3xl font-bold text-gray-900">글 작성</h1>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              내용
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={15}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href="/board"
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm hover:bg-gray-100"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "작성 중..." : "작성하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
