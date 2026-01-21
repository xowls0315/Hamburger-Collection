// API 클라이언트 설정
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchOptions extends RequestInit {
  timeout?: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: "include", // 쿠키 포함
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.message || `HTTP Error: ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timeout");
    }
    throw error;
  }
}

// ============ 브랜드 API ============
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
}

export async function getBrands(): Promise<Brand[]> {
  return fetchApi<Brand[]>("/brands");
}

export async function getBrand(slug: string): Promise<Brand> {
  return fetchApi<Brand>(`/brands/${slug}`);
}

// ============ 메뉴 API ============
export interface Nutrition {
  id: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  carbohydrate?: number;
  sugar?: number;
  fiber?: number;
  calcium?: number;
  iron?: number;
  vitaminA?: number;
  vitaminC?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  brand: Brand;
  nutrition?: Nutrition;
}

export interface MenuListResponse {
  data: MenuItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MenuFilters {
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function getMenuItems(
  brandSlug: string,
  filters: MenuFilters = {}
): Promise<MenuListResponse> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const queryString = params.toString();
  const url = `/brands/${brandSlug}/menu-items${queryString ? `?${queryString}` : ""}`;
  return fetchApi<MenuListResponse>(url);
}

export async function getMenuItem(id: string): Promise<MenuItem> {
  return fetchApi<MenuItem>(`/menu-items/${id}`);
}

// ============ 매장 API ============
export interface Store {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  phone?: string;
  distance: string;
  x: string;
  y: string;
  place_url: string;
}

export interface StoreSearchResponse {
  keyword: string;
  location: { lat: number; lng: number };
  radius: number;
  totalCount: number;
  stores: Store[];
}

export async function searchStores(
  brandSlug: string,
  lat: number,
  lng: number,
  radius: number = 5000
): Promise<StoreSearchResponse> {
  return fetchApi<StoreSearchResponse>(
    `/stores/search?brandSlug=${brandSlug}&lat=${lat}&lng=${lng}&radius=${radius}`
  );
}

// ============ 인증 API ============
export interface User {
  id: string;
  kakaoId: string;
  nickname: string;
  profileImage?: string;
  role: string;
}

export async function getMe(): Promise<User> {
  return fetchApi<User>("/auth/me");
}

export async function refreshToken(): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>("/auth/refresh", { method: "POST" });
}

export async function logout(): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>("/auth/logout", { method: "POST" });
}

export function getKakaoLoginUrl(): string {
  return `${API_BASE_URL}/auth/kakao`;
}

// ============ 게시판 API ============
export interface Author {
  id: string;
  nickname: string;
  profileImage?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  author: Author;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
}

export interface PostListResponse {
  data: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getPosts(
  page: number = 1,
  limit: number = 20
): Promise<PostListResponse> {
  return fetchApi<PostListResponse>(`/posts?page=${page}&limit=${limit}`);
}

export async function getPost(id: string): Promise<Post> {
  return fetchApi<Post>(`/posts/${id}`);
}

export async function createPost(data: {
  title: string;
  content: string;
}): Promise<Post> {
  return fetchApi<Post>("/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePost(
  id: string,
  data: { title?: string; content?: string }
): Promise<Post> {
  return fetchApi<Post>(`/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/posts/${id}`, { method: "DELETE" });
}

// ============ 댓글 API ============
export interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
}

export async function getComments(postId: string): Promise<Comment[]> {
  return fetchApi<Comment[]>(`/posts/${postId}/comments`);
}

export async function createComment(
  postId: string,
  content: string
): Promise<Comment> {
  return fetchApi<Comment>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function updateComment(
  postId: string,
  commentId: string,
  content: string
): Promise<Comment> {
  return fetchApi<Comment>(`/posts/${postId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function deleteComment(
  postId: string,
  commentId: string
): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}
