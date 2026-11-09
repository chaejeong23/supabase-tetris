/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  // Vercel × Supabase 연동이 자동으로 만드는 변수명
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
