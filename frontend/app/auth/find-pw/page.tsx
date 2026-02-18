"use client";

import { useState } from "react";
import Link from "next/link";
import { findPw } from "../../../lib/api";

export default function FindPwPage() {
  const [email, setEmail] = useState("");
  const [loginId, setLoginId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { temporaryPassword } = await findPw(email.trim(), loginId.trim());
      setResult(temporaryPassword);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "조회에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-gray-800">PW 찾기</h1>
        <p className="mb-4 text-center text-sm text-gray-600">가입 시 등록한 아이디와 이메일을 입력하세요. 임시 비밀번호가 발급됩니다.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="loginId" className="mb-1 block text-sm font-medium text-gray-700">
              아이디
            </label>
            <input
              id="loginId"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="아이디"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="example@email.com"
              required
              autoComplete="email"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="rounded-lg bg-amber-50 p-3 text-center text-sm text-gray-800">
              <p className="font-medium text-amber-800">임시 비밀번호가 발급되었습니다.</p>
              <p className="mt-1 break-all font-mono font-semibold text-amber-900">{result}</p>
              <p className="mt-2 text-gray-600">로그인 후 비밀번호를 변경해 주세요.</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "처리 중..." : "임시 비밀번호 발급"}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
          <Link href="/auth/login" className="text-orange-600 hover:underline">
            로그인
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/auth/find-id" className="text-gray-600 hover:underline">
            ID 찾기
          </Link>
        </div>
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:underline">
            홈으로
          </Link>
        </p>
      </div>
    </div>
  );
}
