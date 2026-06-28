import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

export function clearUserQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.favorites.prefix });
}
