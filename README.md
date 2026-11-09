# Stack Drop (supabase-tetris)

브라우저에서 바로 플레이하는 블록 퍼즐 게임입니다. 자세한 요구사항은 [PRD.md](PRD.md)를 참고하세요.

- Vite + TypeScript + Canvas (프레임워크 없음)
- Supabase: 점수(리더보드)와 피드백 저장
- Web Audio API로 합성한 배경음·효과음 (음원 파일 없음)
- Vercel 배포

## 로컬 실행

필요: Node.js 18 이상 (https://nodejs.org)

```bash
npm install
cp .env.example .env.local   # Supabase 값 입력
npm run dev                  # http://localhost:5173
npm test                     # 게임 로직 단위 테스트
npm run build                # 타입 검사 + 프로덕션 빌드 (dist/)
```

`.env.local`이 없어도 게임은 동작하며, 리더보드·피드백만 비활성화됩니다.

## Supabase 설정

1. https://supabase.com 에서 새 프로젝트 생성
2. **SQL Editor**에서 [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql) 내용을 실행
   - `scores`, `feedback` 테이블과 RLS 정책(조회·등록만 허용, 수정·삭제 불가)이 생성됩니다.
3. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사해 `.env.local`에 입력

> `service_role` 키는 절대 프론트엔드나 Vercel 환경 변수(`VITE_` 접두사)에 넣지 마세요.

## Vercel 배포

1. 이 저장소를 GitHub에 push
2. Vercel → **Add New Project** → `chaejeong23/supabase-tetris` Import
3. Framework Preset: **Vite** (자동 감지), Build Command `npm run build`, Output `dist`
4. **Environment Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가 (Production·Preview)
5. Deploy — 이후 `main`에 push하면 자동 배포됩니다.

## 조작법

| 키 | 동작 |
|---|---|
| ← → | 이동 |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| ↑ / X | 시계 방향 회전 |
| Z / Ctrl | 반시계 방향 회전 |
| C / Shift | 홀드 |
| P / Esc | 일시정지 |
| M | 음소거 |
| Enter | 시작 / 재시작 |

모바일에서는 화면 하단 터치 버튼을 사용합니다.

## 구조

```
src/
  game/     게임 규칙 (순수 로직, 테스트 대상)
  render/   Canvas 렌더링
  input/    키보드·터치 입력 (DAS/ARR 자동 반복)
  audio/    배경음·효과음 합성
  api/      Supabase 연동
  ui/       리더보드·피드백·설정 UI
supabase/migrations/   DB 스키마 + RLS
tests/                 Vitest 단위 테스트
```
