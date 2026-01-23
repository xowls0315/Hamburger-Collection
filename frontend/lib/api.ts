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

// AccessToken을 메모리에서 가져오는 함수 (외부에서 주입)
let getAccessToken: (() => string | null) | null = null;
let setAccessToken: ((token: string | null) => void) | null = null;
let refreshTokenCallback: (() => Promise<string | null>) | null = null;

export function setAccessTokenGetter(fn: () => string | null) {
  getAccessToken = fn;
}

export function setAccessTokenSetter(fn: (token: string | null) => void) {
  setAccessToken = fn;
}

export function setRefreshTokenCallback(fn: () => Promise<string | null>) {
  refreshTokenCallback = fn;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // AccessToken이 있으면 Authorization header에 추가
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  const accessToken = getAccessToken?.();
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: "include", // 쿠키 포함 (refreshToken용)
      headers,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // 401 에러이고 refreshTokenCallback이 있으면 자동 refresh 시도
      if (response.status === 401 && refreshTokenCallback && !endpoint.includes('/auth/refresh')) {
        try {
          const newAccessToken = await refreshTokenCallback();
          if (newAccessToken) {
            // 새 accessToken으로 원래 요청 재시도
            const retryHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              ...(fetchOptions.headers as Record<string, string>),
              "Authorization": `Bearer ${newAccessToken}`,
            };

            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
              ...fetchOptions,
              signal: controller.signal,
              credentials: "include",
              headers: retryHeaders,
            });

            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({}));
              let errorMessage = errorData.message || `HTTP Error: ${retryResponse.status}`;
              if (Array.isArray(errorMessage)) {
                errorMessage = errorMessage[0] || `HTTP Error: ${retryResponse.status}`;
              }
              throw new ApiError(retryResponse.status, errorMessage);
            }

            const text = await retryResponse.text();
            if (!text || text.trim() === "") {
              return {} as T;
            }
            try {
              return JSON.parse(text) as T;
            } catch {
              return {} as T;
            }
          }
        } catch (refreshError) {
          // Refresh 실패 시 원래 에러 처리로 진행
        }
      }

      const errorData = await response.json().catch(() => ({}));
      
      // NestJS validation 에러 형식 처리
      let errorMessage = errorData.message || `HTTP Error: ${response.status}`;
      if (Array.isArray(errorMessage)) {
        // validation 에러 배열인 경우 첫 번째 메시지 사용
        errorMessage = errorMessage[0] || `HTTP Error: ${response.status}`;
      }
      
      throw new ApiError(
        response.status,
        errorMessage
      );
    }

    // 응답 본문이 비어있는 경우를 처리 (삭제 API 등)
    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }

    // JSON 파싱 시도
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      // JSON이 아닌 경우 빈 객체 반환
      return {} as T;
    }
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
  detailUrl?: string; // 백엔드 필드명과 일치
  brand: Brand;
  nutrition?: Nutrition;
}

export interface MenuListResponse {
  items: MenuItem[];
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

export async function refreshToken(): Promise<{ accessToken: string }> {
  return fetchApi<{ accessToken: string }>("/auth/refresh", { method: "POST" });
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
  author?: Author; // 프론트엔드에서 변환
  user?: { id: string; nickname: string; profileImage?: string }; // 백엔드 응답
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getPosts(
  page: number = 1,
  limit: number = 20
): Promise<PostListResponse> {
  const data = await fetchApi<PostListResponse>(`/posts?page=${page}&limit=${limit}`);
  // 백엔드의 user를 author로 변환
  if (data.posts) {
    data.posts = data.posts.map((post) => ({
      ...post,
      author: post.user
        ? {
            id: post.user.id,
            nickname: post.user.nickname,
            profileImage: post.user.profileImage,
          }
        : post.author,
    }));
  }
  return data;
}

export async function getPost(id: string): Promise<Post> {
  const post = await fetchApi<Post>(`/posts/${id}`);
  // 백엔드의 user를 author로 변환
  if (post.user) {
    post.author = {
      id: post.user.id,
      nickname: post.user.nickname,
      profileImage: post.user.profileImage,
    };
  }
  return post;
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

export async function deletePost(id: string): Promise<void> {
  await fetchApi<void>(`/posts/${id}`, { method: "DELETE" });
}

// ============ 댓글 API ============
export interface Comment {
  id: string;
  content: string;
  author?: Author; // 프론트엔드에서 변환
  user?: { id: string; nickname: string; profileImage?: string }; // 백엔드 응답
  createdAt: string;
  updatedAt: string;
}

export async function getComments(postId: string): Promise<Comment[]> {
  const comments = await fetchApi<Comment[]>(`/posts/${postId}/comments`);
  // 백엔드의 user를 author로 변환
  return comments.map((comment) => ({
    ...comment,
    author: comment.user
      ? {
          id: comment.user.id,
          nickname: comment.user.nickname,
          profileImage: comment.user.profileImage,
        }
      : comment.author,
  }));
}

export async function createComment(
  postId: string,
  content: string
): Promise<Comment> {
  const comment = await fetchApi<Comment>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  // 백엔드의 user를 author로 변환
  // 백엔드에서 user relation이 포함되지 않을 수 있으므로 안전하게 처리
  if (comment.user) {
    comment.author = {
      id: comment.user.id,
      nickname: comment.user.nickname,
      profileImage: comment.user.profileImage,
    };
  } else if (!comment.author) {
    // user가 없고 author도 없으면 빈 author 설정 (나중에 새로고침하면 로드됨)
    // 또는 현재 사용자 정보를 사용할 수 있지만, 일단 안전하게 처리
    comment.author = undefined;
  }
  return comment;
}

export async function updateComment(
  postId: string,
  commentId: string,
  content: string
): Promise<Comment> {
  const comment = await fetchApi<Comment>(`/posts/${postId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
  // 백엔드의 user를 author로 변환
  if (comment.user) {
    comment.author = {
      id: comment.user.id,
      nickname: comment.user.nickname,
      profileImage: comment.user.profileImage,
    };
  }
  return comment;
}

export async function deleteComment(
  postId: string,
  commentId: string
): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

// ============ 즐겨찾기 API ============
export interface Favorite {
  id: string;
  menuItem: MenuItem;
  createdAt: string;
}

export async function getFavorites(): Promise<Favorite[]> {
  return fetchApi<Favorite[]>("/favorites");
}

export async function addFavorite(menuItemId: string): Promise<Favorite> {
  return fetchApi<Favorite>(`/favorites/${menuItemId}`, {
    method: "POST",
  });
}

export async function removeFavorite(menuItemId: string): Promise<void> {
  await fetchApi<void>(`/favorites/${menuItemId}`, {
    method: "DELETE",
  });
}

export async function checkFavorite(menuItemId: string): Promise<{ isFavorite: boolean }> {
  return fetchApi<{ isFavorite: boolean }>(`/favorites/check/${menuItemId}`);
}
