"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { IoLocationOutline } from "react-icons/io5";
import { FaSearch } from "react-icons/fa";
import {
  getBrand,
  getMenuItems,
  MenuListResponse,
  MenuItem,
} from "../../../lib/api";
import MenuCard from "../../../_components/ui/MenuCard";
import { MenuCardSkeleton } from "../../../_components/ui/Skeleton";

function BrandPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [brand, setBrand] = useState<any>(null);
  const [menuData, setMenuData] = useState<MenuListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState(searchParams.get("sort") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"));
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 디바운스 처리
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setSearchPage(1); // 검색어가 변경되면 첫 페이지로
    }, 300); // 300ms 디바운스

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 검색을 위해 limit을 크게 설정 (실제로는 모든 메뉴를 가져와서 클라이언트에서 필터링)
        const [brandData, menuData] = await Promise.all([
          getBrand(slug),
          getMenuItems(slug, { sort, page: 1, limit: 1000 }), // 검색을 위해 모든 메뉴 가져오기
        ]);
        setBrand(brandData);
        setMenuData(menuData);
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, sort]); // page는 제거 (검색 시 클라이언트 필터링 사용)

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
    const params = new URLSearchParams();
    if (newSort) params.set("sort", newSort);
    router.push(`/brand/${slug}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/brand/${slug}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="h-7 sm:h-9 w-32 sm:w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-8 sm:h-10 w-24 sm:w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2 sm:gap-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
          <div className="h-8 sm:h-10 w-32 sm:w-40 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="text-center text-sm sm:text-base text-red-500">브랜드를 찾을 수 없습니다.</div>
      </div>
    );
  }

  // 검색어로 필터링된 메뉴
  const allItems = menuData?.items || [];
  const filteredItems = debouncedSearchQuery.trim()
    ? allItems.filter((item: MenuItem) => {
        const query = debouncedSearchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query) ?? false)
        );
      })
    : allItems;

  // 정렬 적용 (칼로리 정렬)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sort === "kcal_asc") {
      const aKcal = a.nutrition?.kcal ?? 999999;
      const bKcal = b.nutrition?.kcal ?? 999999;
      if (aKcal !== bKcal) return aKcal - bKcal;
      return a.name.localeCompare(b.name, "ko");
    } else if (sort === "kcal_desc") {
      const aKcal = a.nutrition?.kcal ?? -1;
      const bKcal = b.nutrition?.kcal ?? -1;
      if (aKcal !== bKcal) return bKcal - aKcal;
      return a.name.localeCompare(b.name, "ko");
    }
    return 0;
  });

  // 페이지네이션
  const itemsPerPage = 12;
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const currentPage = debouncedSearchQuery ? searchPage : page;
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{brand.name}</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* 검색창 */}
          <div className="relative w-full sm:w-48 md:w-64">
            <FaSearch className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
            <input
              type="text"
              placeholder="메뉴 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer text-sm sm:text-base"
              >
                ✕
              </button>
            )}
          </div>
          <Link
            href={`/brand/${slug}/stores`}
            className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 sm:px-4 py-2 text-sm sm:text-base text-white hover:bg-orange-600 transition-colors whitespace-nowrap"
          >
            <IoLocationOutline className="text-base sm:text-lg" />
            <span>매장 찾기</span>
          </Link>
        </div>
      </div>

      {/* 정렬 영역 */}
      <div className="mb-4 sm:mb-6 flex flex-wrap gap-2 sm:gap-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm w-full sm:w-auto"
        >
          <option value="">정렬</option>
          <option value="kcal_asc">칼로리 낮은순</option>
          <option value="kcal_desc">칼로리 높은순</option>
        </select>
      </div>

      {/* 검색 결과 표시 */}
      {debouncedSearchQuery && (
        <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
          &quot;{debouncedSearchQuery}&quot; 검색 결과: {filteredItems.length}개
        </div>
      )}

      {/* 메뉴 리스트 */}
      {paginatedItems && paginatedItems.length > 0 ? (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((menuItem) => (
              <MenuCard key={menuItem.id} menuItem={menuItem} brandSlug={slug} />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-6 sm:mt-8 flex justify-center gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (debouncedSearchQuery) {
                    setSearchPage(Math.max(1, searchPage - 1));
                  } else {
                    handlePageChange(page - 1);
                  }
                }}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    if (debouncedSearchQuery) {
                      setSearchPage(p);
                    } else {
                      handlePageChange(p);
                    }
                  }}
                  className={`rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm ${
                    currentPage === p
                      ? "bg-orange-500 text-white"
                      : "border border-gray-300 hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => {
                  if (debouncedSearchQuery) {
                    setSearchPage(Math.min(totalPages, searchPage + 1));
                  } else {
                    handlePageChange(page + 1);
                  }
                }}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-xs sm:text-sm text-gray-500 py-6 sm:py-8">
          {debouncedSearchQuery
            ? `"${debouncedSearchQuery}"에 대한 검색 결과가 없습니다.`
            : "메뉴가 없습니다."}
        </div>
      )}
    </div>
  );
}

export default function BrandPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <MenuCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <BrandPageContent />
    </Suspense>
  );
}
