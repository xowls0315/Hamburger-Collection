"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { FaLongArrowAltLeft, FaLongArrowAltRight } from "react-icons/fa";
import { FaStar, FaRegStar } from "react-icons/fa";
import { useAuth } from "../../../../../hooks/useAuth";
import { useMenuItem } from "../../../../../hooks/queries/useBrands";
import {
  useFavoriteCheck,
  useAddFavorite,
  useRemoveFavorite,
} from "../../../../../hooks/queries/useFavorites";
import NutritionTable from "../../../../../components/ui/NutritionTable";
import { MenuDetailSkeleton } from "../../../../../components/ui/Skeleton";

export default function MenuDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;

  const { user } = useAuth();
  const { data: menuItem, isLoading: loading, error: queryError } = useMenuItem(id);
  const { data: favoriteCheck } = useFavoriteCheck(id, !!user);
  const isFavorite = favoriteCheck?.isFavorite ?? false;
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();
  const favoriteLoading =
    addFavoriteMutation.isPending || removeFavoriteMutation.isPending;

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "메뉴를 불러올 수 없습니다."
        : null;

  const handleToggleFavorite = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!menuItem) return;

    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync(menuItem.id);
      } else {
        await addFavoriteMutation.mutateAsync(menuItem.id);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "즐겨찾기 처리에 실패했습니다.";
      alert(message);
    }
  };

  if (loading) {
    return <MenuDetailSkeleton />;
  }

  if (error || !menuItem) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          {error || "메뉴를 찾을 수 없습니다."}
        </div>
      </div>
    );
  }

  const shouldUseNativeImage =
    menuItem.imageUrl?.includes("momstouch.co.kr") ||
    menuItem.imageUrl?.includes("shinsegaefood.com");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/brand/${slug}`}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
        >
          <FaLongArrowAltLeft /> {menuItem.brand.name} 메뉴로 돌아가기
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="aspect-square w-full rounded-lg bg-gray-200 relative overflow-hidden">
            {menuItem.imageUrl ? (
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
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-6xl">
                🍔
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {menuItem.name}
            </h1>
            <p className="text-gray-600">{menuItem.brand.name}</p>
            {menuItem.description && (
              <p className="mt-2 text-gray-700">{menuItem.description}</p>
            )}
          </div>

          {menuItem.nutrition && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                주요 영양성분
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">칼로리</div>
                  <div className="text-xl font-bold text-gray-900">
                    {menuItem.nutrition.kcal ?? "-"} kcal
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">나트륨</div>
                  <div className="text-xl font-bold text-gray-900">
                    {menuItem.nutrition.sodium ?? "-"} mg
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">단백질</div>
                  <div className="text-xl font-bold text-gray-900">
                    {menuItem.nutrition.protein ?? "-"} g
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">당류</div>
                  <div className="text-xl font-bold text-gray-900">
                    {menuItem.nutrition.sugar ?? "-"} g
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">포화지방</div>
                  <div className="text-xl font-bold text-gray-900">
                    {menuItem.nutrition.saturatedFat ?? "-"} g
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {menuItem.detailUrl && (
              <a
                href={menuItem.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                출처 보기 <FaLongArrowAltRight />
              </a>
            )}
            {user && (
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 ${
                  isFavorite
                    ? "bg-yellow-500 text-white hover:bg-yellow-600"
                    : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                }`}
              >
                {isFavorite ? (
                  <>
                    <FaStar /> 즐겨찾기 해제
                  </>
                ) : (
                  <>
                    <FaRegStar /> 즐겨찾기
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {menuItem.nutrition && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            상세 영양성분
          </h2>
          <NutritionTable nutrition={menuItem.nutrition} />
        </div>
      )}
    </div>
  );
}
