"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { Skeleton } from "../../../_components/ui/Skeleton";
import { refreshToken } from "../../../lib/api";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, setAccessToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get("success");
      const error = searchParams.get("error");

      if (error) {
        alert(`로그인 실패: ${decodeURIComponent(error)}`);
        router.push("/");
        return;
      }

      if (success === "true") {
        try {
          // RefreshToken 쿠키를 사용하여 AccessToken 받기 (Authorization 헤더 방식)
          const result = await refreshToken();
          setAccessToken(result.accessToken);
          
          // 사용자 정보 새로고침
          await refreshUser();
          
          router.push("/");
        } catch (error) {
          console.error("토큰 갱신 실패:", error);
          alert("로그인 처리 중 오류가 발생했습니다.");
          router.push("/");
        }
      } else {
        router.push("/");
      }
    };

    handleCallback();
  }, [searchParams, router, refreshUser, setAccessToken]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <Skeleton circle height={80} width={80} className="mx-auto mb-4" />
          <Skeleton height={24} width={200} className="mx-auto mb-2" />
          <Skeleton height={16} width={150} className="mx-auto" />
        </div>
        <div className="space-y-3">
          <Skeleton height={12} width="100%" />
          <Skeleton height={12} width="90%" />
          <Skeleton height={12} width="95%" />
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <Skeleton circle height={80} width={80} className="mx-auto mb-4" />
              <Skeleton height={24} width={200} className="mx-auto mb-2" />
              <Skeleton height={16} width={150} className="mx-auto" />
            </div>
            <div className="space-y-3">
              <Skeleton height={12} width="100%" />
              <Skeleton height={12} width="90%" />
              <Skeleton height={12} width="95%" />
            </div>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
