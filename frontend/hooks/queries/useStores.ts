import { useQuery } from "@tanstack/react-query";
import { searchStores } from "../../lib/api";
import { queryKeys } from "./keys";

export function useStoreSearch(
  brandSlug: string,
  lat: number | null,
  lng: number | null,
  radius = 5000,
) {
  return useQuery({
    queryKey: queryKeys.stores.search(
      brandSlug,
      lat ?? 0,
      lng ?? 0,
      radius,
    ),
    queryFn: () => searchStores(brandSlug, lat!, lng!, radius),
    enabled: !!brandSlug && lat !== null && lng !== null,
  });
}
