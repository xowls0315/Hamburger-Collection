"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FaLongArrowAltLeft } from "react-icons/fa";
import { getPost, updatePost } from "../../../../lib/api";
import { useAuth } from "../../../../hooks/useAuth";
import { Skeleton } from "../../../../_components/ui/Skeleton";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const post = await getPost(id);
        // author가 없거나 사용자가 작성자가 아니면 접근 불가
        if (user && post.author && user.id !== post.author.id) {
          router.push(`/board/${id}`);
          return;
        }
        setTitle(post.title);
        setContent(post.content);
      } catch (error) {
        console.error("게시글 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id, user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      await updatePost(id, { title, content });
      router.push(`/board/${id}`);
    } catch (error: any) {
      alert(error.message || "게시글 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || saving) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/board/${id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
          >
            <FaLongArrowAltLeft /> 게시글로 돌아가기
          </Link>
        </div>
        <h1 className="mb-6 text-3xl font-bold text-gray-900">글 수정</h1>

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
              href={`/board/${id}`}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm hover:bg-gray-100"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "수정 중..." : "수정하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
