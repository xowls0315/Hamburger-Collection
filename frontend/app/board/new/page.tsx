"use client";

import Link from "next/link";
import { useState } from "react";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

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

      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">글 작성</h1>

        <form className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
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
              className="rounded-lg bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600"
            >
              작성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
