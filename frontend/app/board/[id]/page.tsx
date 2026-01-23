"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FaLongArrowAltLeft } from "react-icons/fa";
import {
  getPost,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  deletePost,
  Post,
  Comment,
} from "../../../lib/api";
import { useAuth } from "../../../hooks/useAuth";
import { PostCardSkeleton, CommentSkeleton, Skeleton } from "../../../_components/ui/Skeleton";
import { formatDateTime } from "../../../utils/formatDate";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, login } = useAuth();
  const id = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [postData, commentsData] = await Promise.all([
          getPost(id),
          getComments(id),
        ]);
        setPost(postData);
        setComments(commentsData);
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-4 w-32" />
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-2 h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Skeleton className="mb-4 h-6 w-24" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CommentSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmitComment = async () => {
    if (!user) {
      login();
      return;
    }

    // 클라이언트 측 체크 제거 - 백엔드 validation에 맡김
    setCommentError("");

    try {
      await createComment(id, commentContent);
      // 댓글 작성 후 댓글 목록을 다시 불러와서 user 정보를 포함한 완전한 데이터를 가져옴
      const updatedComments = await getComments(id);
      setComments(updatedComments);
      setCommentContent("");
      setCommentError("");
    } catch (error: any) {
      // 백엔드 validation 에러 처리 (fetchApi에서 이미 배열 처리됨)
      const errorMessage = error.message || "댓글 작성에 실패했습니다.";
      setCommentError(errorMessage);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;

    try {
      await updateComment(id, commentId, editingCommentContent);
      // 댓글 수정 후 댓글 목록을 다시 불러와서 user 정보를 포함한 완전한 데이터를 가져옴
      const updatedComments = await getComments(id);
      setComments(updatedComments);
      setEditingCommentId(null);
      setEditingCommentContent("");
    } catch (error: any) {
      alert(error.message || "댓글 수정에 실패했습니다.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await deleteComment(id, commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error: any) {
      alert(error.message || "댓글 삭제에 실패했습니다.");
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;

    try {
      setDeleting(true);
      await deletePost(id);
      router.push("/board");
    } catch (error: any) {
      alert(error.message || "게시글 삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  const formatDate = formatDateTime;

  if (loading || deleting) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-10 w-48" />
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <Skeleton className="mb-2 h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Skeleton className="mb-4 h-6 w-24" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CommentSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">게시글을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const isAuthor = user && user.id === post.author.id;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/board"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
        >
          <FaLongArrowAltLeft /> 게시판으로 돌아가기
        </Link>
      </div>

      {/* 게시글 영역 */}
      <article className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{post.author.nickname}</span>
              <span>{formatDate(post.createdAt)}</span>
              <span>조회 {post.viewCount}</span>
            </div>
          </div>
          {isAuthor && (
            <div className="flex gap-2">
              <Link
                href={`/board/${id}/edit`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
              >
                수정
              </Link>
              <button
                onClick={handleDeletePost}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{post.content}</p>
        </div>
      </article>

      {/* 댓글 영역 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          댓글 ({comments.length})
        </h2>

        {/* 댓글 작성 영역 */}
        {user ? (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <textarea
              value={commentContent}
              onChange={(e) => {
                setCommentContent(e.target.value);
                setCommentError(""); // 입력 시 에러 메시지 초기화
              }}
              placeholder="댓글을 입력하세요"
              rows={3}
              className={`mb-2 w-full rounded-lg border px-4 py-2 focus:outline-none ${
                commentError
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-orange-500"
              }`}
            />
            {commentError && (
              <p className="mb-2 text-sm text-red-600">{commentError}</p>
            )}
            <button
              onClick={handleSubmitComment}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 cursor-pointer"
            >
              댓글 작성
            </button>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-sm text-gray-600">
              댓글을 작성하려면 로그인이 필요합니다.
            </p>
            <button
              onClick={login}
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-500 cursor-pointer"
            >
              카카오로 로그인
            </button>
          </div>
        )}

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => {
              const isCommentAuthor = user && comment.author && user.id === comment.author.id;
              const isEditing = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editingCommentContent}
                        onChange={(e) => setEditingCommentContent(e.target.value)}
                        rows={3}
                        className="mb-2 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingCommentContent("");
                          }}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {comment.author?.nickname || comment.user?.nickname || "익명"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                      {isCommentAuthor && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentContent(comment.content);
                            }}
                            className="text-sm text-gray-600 hover:text-orange-600 cursor-pointer"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-sm text-gray-600 hover:text-red-600 cursor-pointer"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-4">
              댓글이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
