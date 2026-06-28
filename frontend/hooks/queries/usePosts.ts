import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "../../lib/api";
import { queryKeys } from "./keys";

export function usePosts(
  page: number,
  limit = 20,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.posts.list(page, limit),
    queryFn: () => getPosts(page, limit),
    enabled: options?.enabled !== false,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: () => getPost(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.prefix });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { title?: string; content?: string };
    }) => updatePost(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.prefix });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(id) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.prefix });
    },
  });
}
