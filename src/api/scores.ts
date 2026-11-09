import { requireClient } from './supabase';

export interface ScoreRow {
  id: number;
  nickname: string;
  score: number;
  level: number;
  lines: number;
  created_at: string;
}

export interface NewScore {
  nickname: string;
  score: number;
  level: number;
  lines: number;
}

export async function submitScore(s: NewScore): Promise<ScoreRow> {
  const { data, error } = await requireClient().from('scores').insert(s).select().single();
  if (error) throw error;
  return data as ScoreRow;
}

export async function fetchTopScores(limit = 10): Promise<ScoreRow[]> {
  const { data, error } = await requireClient()
    .from('scores')
    .select('id, nickname, score, level, lines, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ScoreRow[];
}

/** 해당 점수의 전체 순위 (더 높은 점수 개수 + 1) */
export async function fetchRank(score: number): Promise<number> {
  const { count, error } = await requireClient()
    .from('scores')
    .select('id', { count: 'exact', head: true })
    .gt('score', score);
  if (error) throw error;
  return (count ?? 0) + 1;
}
