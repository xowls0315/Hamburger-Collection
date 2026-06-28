import type { MenuFilters } from "../../lib/api";

export const queryKeys = {
  posts: {
    list: (page: number, limit: number) =>
      ["posts", "list", page, limit] as const,
    detail: (id: string) => ["posts", "detail", id] as const,
    prefix: ["posts"] as const,
  },
  comments: {
    list: (postId: string) => ["comments", postId] as const,
    prefix: ["comments"] as const,
  },
  brands: {
    detail: (slug: string) => ["brands", slug] as const,
    all: ["brands"] as const,
  },
  menuItems: {
    list: (slug: string, filters: MenuFilters) =>
      ["menuItems", slug, filters] as const,
    detail: (id: string) => ["menuItems", "detail", id] as const,
    prefix: ["menuItems"] as const,
  },
  favorites: {
    all: ["favorites"] as const,
    check: (menuItemId: string) => ["favorites", "check", menuItemId] as const,
    prefix: ["favorites"] as const,
  },
  stores: {
    search: (slug: string, lat: number, lng: number, radius: number) =>
      ["stores", slug, lat, lng, radius] as const,
  },
};
