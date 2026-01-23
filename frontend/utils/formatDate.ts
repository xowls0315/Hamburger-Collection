/**
 * 날짜/시간 유틸리티 함수
 * 
 * 백엔드에서 UTC 시간으로 받은 데이터를
 * 프론트엔드에서 한국 시간(KST, UTC+9)으로 변환하여 표시
 */

/**
 * UTC 시간 문자열을 한국 시간(KST, UTC+9) Date 객체로 변환
 * @param dateString UTC 시간 문자열 (예: "2026-01-23T03:07:00Z" 또는 "2026-01-23T03:07:00.000Z")
 * @returns 한국 시간 Date 객체
 */
function toKST(dateString: string): Date {
  // UTC 시간 문자열을 파싱
  // Z가 있으면 UTC로, 없으면 UTC로 가정하고 처리
  let utcDate: Date;
  
  if (dateString.endsWith('Z')) {
    // Z가 있으면 명시적으로 UTC
    utcDate = new Date(dateString);
  } else {
    // Z가 없으면 UTC로 가정하고 Z를 추가
    const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    utcDate = new Date(utcString);
  }
  
  // UTC 시간의 밀리초를 가져와서 9시간(9 * 60 * 60 * 1000ms = 32400000ms)을 더함
  // getTime()은 항상 UTC 기준 밀리초를 반환
  const kstTime = utcDate.getTime() + 9 * 60 * 60 * 1000;
  
  // 새로운 Date 객체 생성
  return new Date(kstTime);
}

/**
 * UTC 시간 문자열을 한국 시간으로 변환하여 날짜만 표시
 * @param dateString UTC 시간 문자열 (예: "2026-01-23T03:07:00Z" 또는 "2026-01-23T03:07:00.000Z")
 * @returns 한국 시간으로 변환된 날짜 문자열 (예: "2026. 1. 23.")
 */
export function formatDate(dateString: string): string {
  const kstDate = toKST(dateString);
  
  return kstDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * UTC 시간 문자열을 한국 시간으로 변환하여 날짜와 시간 표시
 * @param dateString UTC 시간 문자열 (예: "2026-01-23T03:07:00Z" 또는 "2026-01-23T03:07:00.000Z")
 * @returns 한국 시간으로 변환된 날짜+시간 문자열 (예: "2026. 1. 23. 오후 12:07:00")
 */
export function formatDateTime(dateString: string): string {
  const kstDate = toKST(dateString);
  
  return kstDate.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * UTC 시간 문자열을 한국 시간으로 변환하여 상대 시간 표시 (예: "방금 전", "5분 전")
 * @param dateString UTC 시간 문자열
 * @returns 상대 시간 문자열
 */
export function formatRelativeTime(dateString: string): string {
  // UTC 시간 문자열을 UTC Date 객체로 파싱
  const utcDate = new Date(dateString);
  // 현재 시간을 UTC Date 객체로 변환
  const now = new Date();
  
  // 두 시간 모두 UTC 기준 밀리초로 비교 (정확한 차이 계산)
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
