/**
 * DB 스키마 이름. final.sql 및 .env DB_SCHEMA와 동일하게 맞출 것.
 * Supabase pooler 등에서 search_path가 적용되지 않을 수 있으므로 엔티티에 명시.
 */
export const DB_SCHEMA_NAME = process.env.DB_SCHEMA || 'hamburger-collection';
