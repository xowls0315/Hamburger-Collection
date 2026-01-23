"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaLongArrowAltRight } from "react-icons/fa";
import { FaStar, FaRegStar } from "react-icons/fa";
import { MenuItem, checkFavorite, addFavorite, removeFavorite } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

interface MenuCardProps {
  menuItem: MenuItem;
  brandSlug: string;
}

export default function MenuCard({ menuItem, brandSlug }: MenuCardProps) {
  const kcal = menuItem.nutrition?.kcal;
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && menuItem.id) {
      checkFavorite(menuItem.id)
        .then((result) => setIsFavorite(result.isFavorite))
        .catch(() => setIsFavorite(false));
    }
  }, [user, menuItem.id]);

  const handleToggleFavorite = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      setLoading(true);
      if (isFavorite) {
        await removeFavorite(menuItem.id);
        setIsFavorite(false);
      } else {
        await addFavorite(menuItem.id);
        setIsFavorite(true);
      }
    } catch (error: any) {
      alert(error.message || "즐겨찾기 처리에 실패했습니다.");
    } finally {
      setLoading(false);
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
          menuItem.imageUrl.includes('momstouch.co.kr') ? (
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
          <div className="flex h-full items-center justify-center text-gray-400">
            🍔
          </div>
        )}
      </div>
      {/* 텍스트 영역 (flex-1로 남은 공간 차지) */}
      <div className="flex flex-col flex-1 min-h-0">
        <h3 className="mb-2 font-semibold text-gray-800 shrink-0">{menuItem.name}</h3>
        {/* Description 영역 - 고정 높이 설정 */}
        <div className="mb-2 min-h-10 shrink-0">
          {menuItem.description ? (
            <p className="text-sm text-gray-600 line-clamp-2">
              {menuItem.description}
            </p>
          ) : (
            <div className="h-10"></div>
          )}
        </div>
        <div className="mb-2 text-sm text-gray-600 shrink-0">
          {kcal !== undefined && <span className="underline">칼로리: {kcal} kcal</span>}
        </div>
        {/* 상세보기 버튼 - 하단 고정 */}
        <Link
          href={`/brand/${brandSlug}/menu/${menuItem.id}`}
          className="mt-auto w-fit flex items-center gap-1 text-md font-bold text-orange-600 hover:underline shrink-0"
        >
          상세보기 <FaLongArrowAltRight />
        </Link>
      </div>
    </div>
  );
}
