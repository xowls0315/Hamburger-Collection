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
        // iOS Safari 감지
        const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
        
        // iOS Safari에서 쿠키 설정 후 즉시 읽을 수 없는 경우를 대비한 재시도 로직
        const attemptRefresh = async (): Promise<void> => {
          // iOS Safari는 더 긴 지연 시간과 더 많은 재시도 필요
          const retries = isIOSSafari ? 10 : 5;
          const baseDelay = isIOSSafari ? 2000 : 1000; // iOS: 2초, 일반: 1초
          
          for (let i = 0; i < retries; i++) {
            try {
              // 첫 번째 시도에도 지연 추가 (리다이렉트 후 쿠키 설정 대기)
              // iOS Safari는 리다이렉트 후 쿠키가 설정되기까지 더 긴 시간 필요
              const delay = baseDelay * (i + 1); // iOS: 2초, 4초, 6초... / 일반: 1초, 2초, 3초...
              await new Promise(resolve => setTimeout(resolve, delay));
              
              console.log(`토큰 갱신 시도 ${i + 1}/${retries} (${delay}ms 지연 후)`, {
                isIOSSafari,
                userAgent: navigator.userAgent,
              });
              
              // RefreshToken 쿠키를 사용하여 AccessToken 받기 (Authorization 헤더 방식)
              const result = await refreshToken();
              
              if (result && result.accessToken) {
                console.log("토큰 갱신 성공");
                setAccessToken(result.accessToken);
                
                // 사용자 정보 새로고침
                await refreshUser();
                
                router.push("/");
                return; // 성공 시 함수 종료
              } else {
                throw new Error("AccessToken이 응답에 없습니다");
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error) || "알 수 없는 오류";
              console.error(`토큰 갱신 시도 ${i + 1}/${retries} 실패:`, {
                errorMessage,
                error,
                isIOSSafari,
              });
              
              // 마지막 시도에서도 실패하면 에러 표시
              if (i === retries - 1) {
                console.error("토큰 갱신 최종 실패:", error);
                const finalMessage = isIOSSafari
                  ? `로그인 처리 중 오류가 발생했습니다.\n\n오류: ${errorMessage}\n\niOS Safari에서 쿠키 설정 문제일 수 있습니다.\n\n해결 방법:\n1. Safari 설정 > 개인정보 보호 > 쿠키 차단 해제\n2. Safari 설정 > 개인정보 보호 > 크로스 사이트 추적 방지 해제\n3. 페이지를 새로고침해보세요.`
                  : `로그인 처리 중 오류가 발생했습니다.\n\n오류: ${errorMessage}`;
                alert(finalMessage);
                router.push("/");
                return;
              }
            }
          }
        };

        attemptRefresh();
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
