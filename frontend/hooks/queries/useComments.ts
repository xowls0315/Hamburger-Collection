import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from "../../lib/api";
import { queryKeys } from "./keys";

export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.comments.list(postId),
    queryFn: () => getComments(postId),
    enabled: !!postId,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(postId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.prefix });
    },
  });
}

export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => updateComment(postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(postId),
      });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(postId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.prefix });
    },
  });
}
