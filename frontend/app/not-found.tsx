import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="mb-8 text-gray-600">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-orange-500 px-6 py-3 text-white hover:bg-orange-600"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
