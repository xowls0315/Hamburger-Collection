import { useQuery } from "@tanstack/react-query";
import {
  getBrand,
  getBrands,
  getMenuItems,
  getMenuItem,
  MenuFilters,
} from "../../lib/api";
import { queryKeys } from "./keys";

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: getBrands,
  });
}

export function useBrand(slug: string) {
  return useQuery({
    queryKey: queryKeys.brands.detail(slug),
    queryFn: () => getBrand(slug),
    enabled: !!slug,
  });
}

export function useMenuItems(slug: string, filters: MenuFilters = {}) {
  return useQuery({
    queryKey: queryKeys.menuItems.list(slug, filters),
    queryFn: () => getMenuItems(slug, filters),
    enabled: !!slug,
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: queryKeys.menuItems.detail(id),
    queryFn: () => getMenuItem(id),
    enabled: !!id,
  });
}
