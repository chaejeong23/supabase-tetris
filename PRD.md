# PRD: 웹 기반 블록 퍼즐 게임 (supabase-tetris)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.1 (초안) |
| 작성일 | 2026-11-09 |
| 저장소 | https://github.com/chaejeong23/supabase-tetris.git |
| 배포 | Vercel |
| 백엔드 | Supabase (PostgreSQL + REST) |

---

## 1. 개요

브라우저에서 바로 플레이할 수 있는 테트로미노 낙하형 블록 퍼즐 게임을 만든다.
게임 점수는 Supabase에 저장되어 리더보드로 공유되고, 사용자는 게임에 대한 피드백을 남길 수 있다.
배경음과 효과음을 제공하며, 고스트 피스(낙하 위치 그림자)는 구현하지 않는다.

### 1.1 목표
- 설치 없이 데스크톱/모바일 브라우저에서 즉시 플레이 가능
- 점수를 Supabase에 저장하고 상위 점수를 리더보드로 표시
- 사용자가 피드백(의견, 버그 제보)을 작성하고 다른 사람의 피드백을 볼 수 있음
- 배경음(BGM)과 효과음(SFX)으로 플레이 경험 향상
- GitHub 저장소와 연동된 Vercel 자동 배포

### 1.2 범위에서 제외 (Non-Goals)
- 고스트 피스(그림자) 표시
- 실시간 멀티플레이 / 대전 모드
- 회원가입·소셜 로그인 (v1은 닉네임 기반, 추후 검토)
- 네이티브 앱 (iOS/Android)
- 서버 측 게임 리플레이 검증 (치팅 방지는 기본 수준만)

---

## 2. 요구사항 분석

사용자 요청을 기능 요구사항으로 정리하면 다음과 같다.

| # | 원 요구사항 | 해석 / 결정 사항 |
|---|---|---|
| R1 | 웹 기반 테트리스 | 10×20 보드, 7종 테트로미노, 회전·이동·하드 드롭·홀드·넥스트 미리보기를 갖춘 클래식 규칙의 블록 퍼즐 게임 |
| R2 | Supabase에 저장 | **게임 점수 기록**(닉네임, 점수, 레벨, 제거 줄 수)과 **피드백**을 Supabase 테이블에 저장 |
| R3 | 사용자 피드백 작성 | 닉네임 + 내용(+선택적 별점/분류)으로 피드백 등록, 최신순 목록 조회 |
| R4 | 배경음 및 효과음 | BGM 루프 재생, 주요 동작별 효과음. 음소거/볼륨 조절 제공 |
| R5 | 그림자 효과 없어도 됨 | 고스트 피스 미구현 (범위 제외) |
| R6 | Vercel 배포 | 정적 빌드(Vite) 결과물을 Vercel에 배포, 환경 변수로 Supabase 키 관리 |

---

## 3. 사용자 스토리

1. 방문자로서, 페이지에 들어가자마자 **시작 버튼**을 눌러 게임을 바로 플레이하고 싶다.
2. 플레이어로서, 게임이 끝나면 **닉네임을 입력해 점수를 등록**하고 내 순위를 확인하고 싶다.
3. 플레이어로서, **리더보드(Top 10/전체)**에서 다른 사람들의 최고 점수를 보고 싶다.
4. 사용자로서, 게임에 대한 **의견이나 버그를 피드백으로 남기고** 다른 사람의 피드백도 읽고 싶다.
5. 플레이어로서, **배경음과 효과음**을 들으며 플레이하되, 필요하면 **음소거**하고 싶다.
6. 모바일 사용자로서, **터치 버튼**으로도 조작하고 싶다.

---

## 4. 기능 요구사항

### 4.1 게임 플레이 (F-GAME)

| ID | 기능 | 상세 | 우선순위 |
|---|---|---|---|
| F-GAME-01 | 게임 보드 | 10열 × 20행 (상단 숨김 2행 포함 가능), Canvas 렌더링 | P0 |
| F-GAME-02 | 테트로미노 | I, O, T, S, Z, J, L 7종, 각기 다른 색상 | P0 |
| F-GAME-03 | 랜덤 생성 | 7-bag 랜덤 방식 (같은 블록 연속 편중 방지) | P0 |
| F-GAME-04 | 이동/회전 | 좌우 이동, 소프트 드롭, 하드 드롭, 시계/반시계 회전, 벽 차기(wall kick) | P0 |
| F-GAME-05 | 줄 제거 | 가득 찬 줄 제거 후 위 블록 하강 | P0 |
| F-GAME-06 | 점수 | 1줄 100 / 2줄 300 / 3줄 500 / 4줄 800 × 레벨, 소프트 드롭 1점/칸, 하드 드롭 2점/칸 | P0 |
| F-GAME-07 | 레벨 | 10줄 제거마다 레벨 +1, 레벨이 오를수록 낙하 속도 증가 | P0 |
| F-GAME-08 | 넥스트 미리보기 | 다음 블록 최소 1개 (권장 3개) 표시 | P0 |
| F-GAME-09 | 홀드 | 현재 블록 보관/교체 (한 번 낙하할 때까지 1회 제한) | P1 |
| F-GAME-10 | 일시정지 | P / Esc 키로 일시정지·재개 | P0 |
| F-GAME-11 | 게임 오버 | 새 블록이 생성 위치에 놓일 수 없으면 종료 → 결과 모달 | P0 |
| F-GAME-12 | 고스트 피스 | **미구현** | — |

**조작키 (데스크톱)**

| 키 | 동작 |
|---|---|
| ← / → | 좌우 이동 |
| ↓ | 소프트 드롭 |
| Space | 하드 드롭 |
| ↑ / X | 시계 방향 회전 |
| Z / Ctrl | 반시계 방향 회전 |
| C / Shift | 홀드 |
| P / Esc | 일시정지 |
| M | 음소거 토글 |

**모바일**: 화면 하단에 터치 버튼(←, →, ↓, 회전, 하드 드롭, 홀드) 제공. (P1)

### 4.2 점수 저장 & 리더보드 (F-SCORE)

| ID | 기능 | 상세 | 우선순위 |
|---|---|---|---|
| F-SCORE-01 | 점수 등록 | 게임 오버 시 닉네임(2~12자) 입력 후 등록. 마지막 닉네임은 localStorage에 기억 | P0 |
| F-SCORE-02 | 리더보드 조회 | 점수 내림차순 Top 10 표시 (닉네임, 점수, 레벨, 줄 수, 날짜) | P0 |
| F-SCORE-03 | 내 순위 강조 | 방금 등록한 기록을 리더보드에서 하이라이트 | P1 |
| F-SCORE-04 | 개인 최고 기록 | 로컬(localStorage) 최고 점수를 게임 화면에 표시 | P1 |
| F-SCORE-05 | 기본 검증 | 점수/레벨/줄 수 범위 체크, 닉네임 길이·금칙어 체크 (DB 제약조건 + 클라이언트) | P0 |

### 4.3 피드백 (F-FEEDBACK)

| ID | 기능 | 상세 | 우선순위 |
|---|---|---|---|
| F-FB-01 | 피드백 작성 | 닉네임(2~12자), 내용(1~500자), 분류(의견/버그/제안), 별점(1~5, 선택) | P0 |
| F-FB-02 | 피드백 목록 | 최신순 목록, 20개 단위 페이지네이션 또는 "더 보기" | P0 |
| F-FB-03 | 도배 방지 | 클라이언트 측 작성 간격 제한(예: 30초), DB 측 길이 제약 | P1 |
| F-FB-04 | XSS 방지 | 피드백 내용은 텍스트로만 렌더링 (`textContent`), HTML 미허용 | P0 |
| F-FB-05 | 수정/삭제 | v1 미지원 (관리자는 Supabase 대시보드에서 직접 관리) | — |

### 4.4 사운드 (F-SOUND)

| ID | 기능 | 상세 | 우선순위 |
|---|---|---|---|
| F-SOUND-01 | 배경음 | 게임 중 루프 재생, 일시정지 시 정지, 게임 오버 시 정지 | P0 |
| F-SOUND-02 | 효과음 | 이동, 회전, 하드 드롭(착지), 줄 제거(1~3줄), 4줄 제거, 레벨업, 홀드, 게임 오버 | P0 |
| F-SOUND-03 | 음소거/볼륨 | BGM·SFX 각각 볼륨 슬라이더 및 음소거 버튼, 설정은 localStorage 저장 | P0 |
| F-SOUND-04 | 자동재생 정책 대응 | 브라우저 정책상 사용자의 첫 상호작용(시작 버튼 클릭) 이후 오디오 시작 | P0 |

**사운드 리소스 방침**
- 효과음: Web Audio API로 직접 합성(오실레이터 기반)하거나 CC0 라이선스 음원 사용 → 파일 용량 최소화
- 배경음: **직접 제작한 곡 또는 CC0/로열티 프리 음원** 사용. 저작권이 있는 기존 게임 음악은 사용하지 않음
- 포맷: `.mp3` 또는 `.ogg`, BGM은 1MB 이하 목표
- 사용한 음원의 출처·라이선스는 `CREDITS.md`에 기록

### 4.5 화면 구성 (UI)

```
┌──────────────────────────────────────────────────┐
│  [로고]                         [🔊] [⚙ 설정]     │
├──────────┬─────────────────────┬─────────────────┤
│  HOLD    │                     │  NEXT           │
│  [ ]     │                     │  [ ] [ ] [ ]    │
│          │     게임 보드        │                 │
│  SCORE   │     (10 × 20)       │  LEADERBOARD    │
│  LEVEL   │                     │  1. ...         │
│  LINES   │                     │  2. ...         │
│  BEST    │                     │                 │
├──────────┴─────────────────────┴─────────────────┤
│  피드백 섹션: [작성 폼]  /  [피드백 목록]           │
└──────────────────────────────────────────────────┘
```

- 화면: **시작 화면 → 게임 화면 → 게임 오버 모달(점수 등록) → 리더보드**
- 피드백은 게임 화면 하단 섹션 또는 별도 탭/모달로 제공
- 반응형: 모바일(≤ 768px)에서는 보드 중앙 + 상하 정보 배치 + 터치 컨트롤
- 다크 테마 기본

---

## 5. 기술 스택 및 아키텍처

### 5.1 기술 스택

| 구분 | 선택 | 이유 |
|---|---|---|
| 빌드 도구 | **Vite** | 빠른 개발 서버, 정적 빌드 → Vercel에 그대로 배포 |
| 언어 | **TypeScript** | 게임 로직의 타입 안정성 |
| 렌더링 | **HTML5 Canvas** | 블록 렌더링 성능, 단순한 구조 |
| UI | Vanilla TS + CSS (프레임워크 없음) | 게임 하나 + 폼 두 개 수준이라 프레임워크 불필요, 번들 경량화 |
| 사운드 | **Web Audio API** (+ `HTMLAudioElement` for BGM) | 지연 없는 효과음, 볼륨 제어 |
| 백엔드 | **Supabase** (`@supabase/supabase-js`) | PostgreSQL + 자동 REST API + RLS |
| 배포 | **Vercel** | GitHub 연동 자동 배포, Preview 배포 |
| 테스트 | **Vitest** | 게임 로직(회전, 충돌, 줄 제거, 점수) 단위 테스트 |

### 5.2 아키텍처

```
[Browser]
  ├─ Game Engine (순수 로직: board, piece, rules, scoring)
  ├─ Renderer (Canvas)
  ├─ Input (Keyboard / Touch)
  ├─ Audio Manager (BGM / SFX)
  └─ API Layer (supabase-js)
          │  HTTPS (anon key + RLS)
          ▼
[Supabase]
  ├─ scores 테이블
  └─ feedback 테이블
```

- 게임 엔진은 렌더링·입력과 분리된 **순수 함수/클래스**로 작성하여 테스트 가능하게 한다.
- Supabase 접근은 `anon` 키만 사용하고, 권한은 **RLS 정책**으로 통제한다. (`service_role` 키는 프론트엔드에 절대 포함하지 않음)

### 5.3 디렉터리 구조 (예정)

```
supabase-tetris/
├─ public/
│  └─ sounds/            # bgm.mp3, *.ogg
├─ src/
│  ├─ game/              # board.ts, pieces.ts, rotation.ts, scoring.ts, game.ts
│  ├─ render/            # canvas.ts
│  ├─ input/             # keyboard.ts, touch.ts
│  ├─ audio/             # audio.ts
│  ├─ api/               # supabase.ts, scores.ts, feedback.ts
│  ├─ ui/                # leaderboard.ts, feedback.ts, modal.ts
│  ├─ main.ts
│  └─ style.css
├─ supabase/
│  └─ migrations/        # 001_init.sql (테이블 + RLS)
├─ tests/                # *.test.ts
├─ index.html
├─ .env.example
├─ CREDITS.md
├─ PRD.md
└─ package.json
```

---

## 6. 데이터 모델 (Supabase)

### 6.1 `scores` 테이블

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | `bigint` | PK, identity |
| nickname | `text` | NOT NULL, 길이 2~12 |
| score | `integer` | NOT NULL, 0 ≤ score ≤ 9,999,999 |
| level | `integer` | NOT NULL, 1 ≤ level ≤ 99 |
| lines | `integer` | NOT NULL, 0 ≤ lines ≤ 9,999 |
| created_at | `timestamptz` | DEFAULT now() |

- 인덱스: `score DESC`

### 6.2 `feedback` 테이블

| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | `bigint` | PK, identity |
| nickname | `text` | NOT NULL, 길이 2~12 |
| category | `text` | NOT NULL, `'opinion' \| 'bug' \| 'suggestion'` |
| rating | `smallint` | NULL 허용, 1~5 |
| content | `text` | NOT NULL, 길이 1~500 |
| created_at | `timestamptz` | DEFAULT now() |

- 인덱스: `created_at DESC`

### 6.3 SQL 초안

```sql
create table public.scores (
  id         bigint generated always as identity primary key,
  nickname   text not null check (char_length(nickname) between 2 and 12),
  score      integer not null check (score between 0 and 9999999),
  level      integer not null check (level between 1 and 99),
  lines      integer not null check (lines between 0 and 9999),
  created_at timestamptz not null default now()
);
create index scores_score_idx on public.scores (score desc);

create table public.feedback (
  id         bigint generated always as identity primary key,
  nickname   text not null check (char_length(nickname) between 2 and 12),
  category   text not null check (category in ('opinion','bug','suggestion')),
  rating     smallint check (rating between 1 and 5),
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);

-- RLS: 누구나 조회·등록 가능, 수정·삭제 불가
alter table public.scores   enable row level security;
alter table public.feedback enable row level security;

create policy "scores_select" on public.scores   for select to anon, authenticated using (true);
create policy "scores_insert" on public.scores   for insert to anon, authenticated with check (true);
create policy "feedback_select" on public.feedback for select to anon, authenticated using (true);
create policy "feedback_insert" on public.feedback for insert to anon, authenticated with check (true);
-- update / delete 정책은 만들지 않음 → 기본 거부
```

---

## 7. 비기능 요구사항

| 구분 | 요구사항 |
|---|---|
| 성능 | 60 FPS 유지 (`requestAnimationFrame`), 초기 로드 JS 번들 200KB(gzip) 이하 |
| 호환성 | 최신 Chrome, Edge, Safari, Firefox (데스크톱 + 모바일) |
| 반응형 | 360px 너비 모바일부터 데스크톱까지 레이아웃 대응 |
| 보안 | RLS 적용, anon 키만 클라이언트 노출, 사용자 입력은 텍스트로만 렌더링, DB 제약조건으로 입력 검증 |
| 가용성 | Supabase 장애 시에도 게임은 계속 플레이 가능 (점수 등록/피드백만 오류 메시지 표시) |
| 접근성 | 키보드만으로 모든 기능 사용 가능, 버튼에 `aria-label`, 충분한 색 대비 |
| 저작권 | 기존 게임의 로고·아트·음악을 사용하지 않음. 음원 라이선스는 `CREDITS.md`에 명시 |

---

## 8. 배포 (Vercel)

1. GitHub 저장소 `chaejeong23/supabase-tetris`를 Vercel 프로젝트로 Import
2. Framework Preset: **Vite** / Build Command: `npm run build` / Output Directory: `dist`
3. 환경 변수 등록 (Production · Preview 모두)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. `main` 브랜치 push → Production 자동 배포, PR → Preview 배포
5. 로컬 개발용 `.env.local`은 `.gitignore`에 포함, `.env.example`만 커밋

---

## 9. 마일스톤

| 단계 | 내용 | 산출물 |
|---|---|---|
| M1. 프로젝트 셋업 | Vite + TS 초기화, GitHub 연결, Vercel 첫 배포 | 빈 페이지 배포 URL |
| M2. 게임 코어 | 보드, 블록, 이동/회전, 충돌, 줄 제거, 점수/레벨, 게임 오버 + 단위 테스트 | 로컬에서 플레이 가능한 게임 |
| M3. UI 완성 | 시작 화면, 넥스트/홀드, 일시정지, 게임 오버 모달, 반응형, 터치 컨트롤 | 완성된 싱글 플레이 |
| M4. Supabase 연동 | 테이블/RLS 마이그레이션, 점수 등록, 리더보드 | 리더보드 동작 |
| M5. 피드백 | 피드백 작성·목록, 도배 방지 | 피드백 기능 동작 |
| M6. 사운드 | BGM, 효과음, 볼륨/음소거 설정 | 사운드 적용 |
| M7. 마무리 | QA, 성능 점검, README/CREDITS 정리, Production 배포 | 최종 배포 URL |

---

## 10. 수용 기준 (Acceptance Criteria)

- [ ] 배포된 Vercel URL에서 시작 버튼을 누르면 게임이 시작된다.
- [ ] 7종 블록이 7-bag 방식으로 생성되고, 이동·회전·하드 드롭·홀드가 동작한다.
- [ ] 줄이 가득 차면 제거되고 점수·레벨·줄 수가 규칙대로 갱신된다.
- [ ] 고스트 피스는 표시되지 않는다.
- [ ] 게임 오버 후 닉네임을 입력하면 Supabase `scores`에 저장되고 리더보드에 반영된다.
- [ ] 피드백을 작성하면 Supabase `feedback`에 저장되고 목록 최상단에 나타난다.
- [ ] 피드백에 `<script>` 등 HTML을 입력해도 텍스트로 표시된다.
- [ ] anon 키로 `scores`/`feedback`의 수정·삭제 요청 시 거부된다.
- [ ] 게임 시작 시 BGM이 재생되고, 각 동작에 효과음이 나며, 음소거·볼륨 설정이 새로고침 후에도 유지된다.
- [ ] Supabase 연결이 실패해도 게임 플레이는 정상 동작한다.
- [ ] 모바일 브라우저에서 터치 버튼으로 플레이할 수 있다.

---

## 11. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 클라이언트에서 점수를 조작해 등록 | 리더보드 신뢰도 하락 | v1: DB 범위 제약 + 기본 검증. v2: Edge Function에서 게임 시간 대비 점수 타당성 검사 |
| 피드백 스팸/욕설 | 품질 저하 | 클라이언트 쿨다운, 길이 제한, 간단한 금칙어 필터, 관리자가 대시보드에서 삭제 |
| 브라우저 오디오 자동재생 차단 | BGM 미재생 | 시작 버튼 클릭 시 `AudioContext.resume()` |
| 상표·저작권 문제 | 배포 중단 가능성 | 서비스 표시명은 고유한 이름 사용 검토, 기존 게임 에셋·음악 미사용 |
| Supabase 무료 플랜 일시정지(장기 미사용) | 저장 기능 중단 | 장애 시 게임은 계속 동작하도록 설계, 필요 시 플랜 업그레이드 |

---

## 12. 미결 사항 (Open Questions)

v0.1 구현에서는 아래 기본값으로 진행했다. 변경이 필요하면 결정 후 반영한다.

| # | 질문 | v0.1 구현 기본값 |
|---|---|---|
| 1 | 화면에 노출할 게임 이름 | **Stack Drop** (임시, `index.html`·로고에서 변경 가능) |
| 2 | 로그인 도입 여부 | 미도입, 닉네임 기반 익명 등록 |
| 3 | 피드백 공개 범위 | 전체 공개 |
| 4 | 배경음 소스 | **직접 제작** — Web Audio API로 실시간 합성 (음원 파일 없음, `public/sounds/` 불필요) |
| 5 | 리더보드 기간 | 전체 기간 Top 10
