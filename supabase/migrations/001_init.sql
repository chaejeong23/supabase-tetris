-- Stack Drop: 점수 & 피드백 테이블
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.

-- ---------- scores ----------
create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  nickname   text not null check (char_length(btrim(nickname)) between 2 and 12),
  score      integer not null check (score between 0 and 9999999),
  level      integer not null check (level between 1 and 99),
  lines      integer not null check (lines between 0 and 9999),
  created_at timestamptz not null default now(),
  -- 레벨은 줄 수로 결정됨 (10줄당 1레벨)
  constraint scores_level_matches_lines check (level = least(99, lines / 10 + 1))
);

create index if not exists scores_score_idx on public.scores (score desc, created_at asc);

-- ---------- feedback ----------
create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  nickname   text not null check (char_length(btrim(nickname)) between 2 and 12),
  category   text not null check (category in ('opinion', 'bug', 'suggestion')),
  rating     smallint check (rating between 1 and 5),
  content    text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

-- ---------- RLS: 누구나 조회·등록 가능 / 수정·삭제 불가 ----------
alter table public.scores   enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "scores_select" on public.scores;
drop policy if exists "scores_insert" on public.scores;
drop policy if exists "feedback_select" on public.feedback;
drop policy if exists "feedback_insert" on public.feedback;

create policy "scores_select"   on public.scores   for select to anon, authenticated using (true);
create policy "scores_insert"   on public.scores   for insert to anon, authenticated with check (true);
create policy "feedback_select" on public.feedback for select to anon, authenticated using (true);
create policy "feedback_insert" on public.feedback for insert to anon, authenticated with check (true);
-- update / delete 정책 없음 → anon 키로는 거부됨. 관리자는 대시보드(Table Editor)에서 관리.
