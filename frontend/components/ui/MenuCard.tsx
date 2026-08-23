"use client";

import Link from "next/link";
import Image from "next/image";
import { FaLongArrowAltRight } from "react-icons/fa";
import { FaStar, FaRegStar } from "react-icons/fa";
import { MenuItem } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import {
  useFavoriteCheck,
  useAddFavorite,
  useRemoveFavorite,
} from "../../hooks/queries/useFavorites";

interface MenuCardProps {
  menuItem: MenuItem;
  brandSlug: string;
}

export default function MenuCard({ menuItem, brandSlug }: MenuCardProps) {
  const kcal = menuItem.nutrition?.kcal;
  const shouldUseNativeImage =
    menuItem.imageUrl?.includes("momstouch.co.kr") ||
    menuItem.imageUrl?.includes("shinsegaefood.com");
  const { user } = useAuth();
  const { data: favoriteCheck } = useFavoriteCheck(menuItem.id, !!user);
  const isFavorite = favoriteCheck?.isFavorite ?? false;
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();
  const loading =
    addFavoriteMutation.isPending || removeFavoriteMutation.isPending;

  const handleToggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync(menuItem.id);
      } else {
        await addFavoriteMutation.mutateAsync(menuItem.id);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "즐겨찾기 처리에 실패했습니다.";
      alert(message);
    }
  };

  return (
    <div className="group flex flex-col h-full rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-lg relative">
      {/* 즐겨찾기 별표 (왼쪽 상단) */}
      {user && (
        <button
          onClick={handleToggleFavorite}
          disabled={loading}
          className="absolute left-2 top-2 z-10 rounded-full bg-white/80 p-2 shadow-md transition-all cursor-pointer hover:bg-white hover:shadow-lg disabled:opacity-50"
          aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          {isFavorite ? (
            <FaStar className="text-yellow-500" size={20} />
          ) : (
            <FaRegStar className="text-gray-400" size={20} />
          )}
        </button>
      )}
      {/* 이미지 영역 */}
      <div className="mb-3 aspect-video w-full rounded-lg bg-gray-200 relative overflow-hidden shrink-0">
        {menuItem.imageUrl ? (
          // 맘스터치 이미지는 Next.js Image Optimization이 실패하므로 unoptimized 사용
          shouldUseNativeImage ? (
            <img
              src={menuItem.imageUrl}
              alt={menuItem.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <Image
              src={menuItem.imageUrl}
              alt={menuItem.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-4xl">
            🍔
          </div>
        )}
      </div>

      {/* 텍스트 영역 */}
      <div className="flex flex-col flex-1">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 line-clamp-2">
          {menuItem.name}
        </h3>
        {menuItem.description && (
          <p className="mb-2 text-sm text-gray-600 line-clamp-2 flex-1">
            {menuItem.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-sm font-medium text-orange-600">
            {kcal != null ? `${kcal} kcal` : "칼로리 정보 없음"}
          </span>
          <Link
            href={`/brand/${brandSlug}/menu/${menuItem.id}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            상세보기 <FaLongArrowAltRight className="text-xs" />
          </Link>
        </div>
      </div>
    </div>
  );
}
