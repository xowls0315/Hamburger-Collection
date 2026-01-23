"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaStar, FaRegStar } from "react-icons/fa";
import { getFavorites, removeFavorite, Favorite, MenuItem } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { MenuCardSkeleton } from "../../_components/ui/Skeleton";
import MenuCard from "../../_components/ui/MenuCard";

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (user) {
      const loadFavorites = async () => {
        try {
          setLoading(true);
          const data = await getFavorites();
          setFavorites(data);
        } catch (error) {
          console.error("즐겨찾기 로딩 실패:", error);
        } finally {
          setLoading(false);
        }
      };

      loadFavorites();
    }
  }, [user, authLoading, router]);

  const handleRemoveFavorite = async (menuItemId: string) => {
    try {
      await removeFavorite(menuItemId);
      setFavorites(favorites.filter((fav) => fav.menuItem.id !== menuItemId));
    } catch (error: any) {
      alert(error.message || "즐겨찾기 삭제에 실패했습니다.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-gray-900">즐겨찾기</h1>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
      <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold text-gray-900">즐겨찾기</h1>

      {favorites.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="relative h-full">
              <MenuCard
                menuItem={favorite.menuItem}
                brandSlug={favorite.menuItem.brand.slug}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12">
          <FaRegStar className="mx-auto mb-3 sm:mb-4 text-4xl sm:text-6xl text-gray-300" />
          <p className="text-base sm:text-lg text-gray-500 mb-2">즐겨찾기한 메뉴가 없습니다.</p>
          <p className="text-xs sm:text-sm text-gray-400 px-4">
            메뉴 카드의 별표를 클릭하여 즐겨찾기에 추가해보세요.
          </p>
        </div>
      )}
    </div>
  );
}
