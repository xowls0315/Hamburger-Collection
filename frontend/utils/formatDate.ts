/**
 * 날짜/시간 유틸리티 함수
 *
 * 백엔드에서 UTC(ISO 8601)로 오는 시간을
 * 한국 시간(KST, Asia/Seoul)으로 표시합니다.
 * (수동 오프셋 없이 timeZone으로만 변환해 8~9시간 밀림 방지)
 */

const KST_OPTIONS = { timeZone: "Asia/Seoul" } as const;

/**
 * UTC 시간 문자열을 파싱한 Date (그대로 사용하면 로컬/지정 타임존으로 표시 가능)
 */
function parseUTC(dateString: string): Date {
  const s = dateString.trim();
  return new Date(s.endsWith("Z") ? s : s + "Z");
}

/**
 * UTC 시간 문자열을 한국 시간으로 변환하여 날짜만 표시
 * @param dateString UTC 시간 문자열 (예: "2026-01-23T03:07:00.000Z")
 * @returns 한국 시간 날짜 문자열 (예: "2026. 1. 23.")
 */
export function formatDate(dateString: string): string {
  const date = parseUTC(dateString);
  return date.toLocaleDateString("ko-KR", {
    ...KST_OPTIONS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * UTC 시간 문자열을 한국 시간으로 변환하여 날짜와 시간 표시
 * @param dateString UTC 시간 문자열 (예: "2026-01-23T03:07:00.000Z")
 * @returns 한국 시간 날짜+시간 문자열 (예: "2026. 1. 23. 오후 12:07")
 */
export function formatDateTime(dateString: string): string {
  const date = parseUTC(dateString);
  return date.toLocaleString("ko-KR", {
    ...KST_OPTIONS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * UTC 시간 문자열을 한국 시간 기준 상대 시간으로 표시 (예: "방금 전", "5분 전")
 * @param dateString UTC 시간 문자열
 * @returns 상대 시간 문자열
 */
export function formatRelativeTime(dateString: string): string {
  const utcDate = parseUTC(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - utcDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "방금 전";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  }

  // 7일 이상이면 날짜로 표시
  return formatDate(dateString);
}
