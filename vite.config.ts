import { defineConfig } from 'vitest/config';

export default defineConfig({
  // VITE_* 외에 Vercel의 Supabase 연동이 만드는 NEXT_PUBLIC_* 변수도 클라이언트에 노출
  // (둘 다 공개용 값만 담는 접두사이므로 service_role 키는 포함되지 않음)
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
