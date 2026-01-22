// 스켈레톤 UI 컴포넌트들
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// 기본 Skeleton 컴포넌트를 export (기존 코드와의 호환성을 위해)
export { Skeleton };

export function MenuCardSkeleton() {
  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-4">
      <Skeleton className="mb-3 rounded-lg" height={200} />
      <Skeleton className="mb-2" height={20} width="75%" />
      <Skeleton className="mb-2" height={16} width="50%" />
      <Skeleton height={16} width="33%" />
    </div>
  );
}

export function MenuDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-6" height={16} width={128} />
      <div className="grid gap-8 md:grid-cols-2">
        {/* 이미지 영역 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Skeleton className="rounded-lg" height={400} />
        </div>

        {/* 정보 영역 */}
        <div className="space-y-6">
          <div>
            <Skeleton className="mb-2" height={32} width="75%" />
            <Skeleton className="mb-2" height={16} width="25%" />
            <Skeleton height={16} width="100%" />
            <Skeleton className="mt-2" height={16} width="83%" />
          </div>

          {/* 영양정보 */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Skeleton className="mb-4" height={24} width={128} />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-2" height={16} width={64} />
                  <Skeleton height={24} width={80} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 영양성분 표 */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <Skeleton className="mb-4" height={24} width={128} />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton height={16} width={96} />
              <Skeleton height={16} width={64} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton height={24} width="75%" />
        <Skeleton height={16} width={80} />
      </div>
      <Skeleton className="mb-3" height={16} width="100%" />
      <Skeleton className="mb-3" height={16} width="83%" />
      <div className="flex items-center gap-4">
        <Skeleton height={12} width={96} />
        <Skeleton height={12} width={64} />
        <Skeleton height={12} width={64} />
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton height={16} width={96} />
        <Skeleton height={12} width={80} />
      </div>
      <Skeleton height={16} width="100%" />
      <Skeleton className="mt-2" height={16} width="75%" />
    </div>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <Skeleton className="mb-2" height={20} width="75%" />
      <Skeleton className="mb-2" height={16} width="100%" />
      <Skeleton className="mb-2" height={12} width="50%" />
      <Skeleton height={12} width="25%" />
    </div>
  );
}
