import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// VITE_* 우선, 없으면 Vercel Supabase 연동이 만드는 NEXT_PUBLIC_* 사용
const env = import.meta.env;
const url = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
const anonKey = (env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

/** 환경 변수가 없으면 null — 게임은 저장 기능 없이 계속 동작한다. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

export const isSupabaseConfigured = supabase !== null;

export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error('서버 연결이 설정되지 않았습니다.');
  return supabase;
}

export function toUserMessage(err: unknown): string {
  if (err instanceof Error && err.message === '서버 연결이 설정되지 않았습니다.') return err.message;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return '인터넷 연결을 확인해 주세요.';
  return '서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
