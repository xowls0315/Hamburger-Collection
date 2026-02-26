function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 날짜만 표시 (예: 2026. 1. 30.) */
export function formatDate(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 날짜 + 시간 표시 (예: 2026. 1. 30. 오후 3:45) */
export function formatDateTime(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return "";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

