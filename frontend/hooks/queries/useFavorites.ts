import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} from "../../lib/api";
import { queryKeys } from "./keys";

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.favorites.all,
    queryFn: getFavorites,
    enabled,
  });
}

export function useFavoriteCheck(menuItemId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.favorites.check(menuItemId),
    queryFn: () => checkFavorite(menuItemId),
    enabled: enabled && !!menuItemId,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addFavorite,
    onSuccess: (_, menuItemId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.prefix });
      queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.check(menuItemId),
      });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFavorite,
    onSuccess: (_, menuItemId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favorites.prefix });
      queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.check(menuItemId),
      });
    },
  });
}
