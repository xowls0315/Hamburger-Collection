"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Skeleton } from "../../components/Skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

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
        // 사용자 정보 새로고침
        await refreshUser();
        router.push("/");
      } else {
        router.push("/");
      }
    };

    handleCallback();
  }, [searchParams, router, refreshUser]);

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
