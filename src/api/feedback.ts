import { requireClient } from './supabase';

export type FeedbackCategory = 'opinion' | 'bug' | 'suggestion';

export interface FeedbackRow {
  id: number;
  nickname: string;
  category: FeedbackCategory;
  rating: number | null;
  content: string;
  created_at: string;
}

export interface NewFeedback {
  nickname: string;
  category: FeedbackCategory;
  rating: number | null;
  content: string;
}

export const FEEDBACK_PAGE_SIZE = 20;

export async function submitFeedback(f: NewFeedback): Promise<FeedbackRow> {
  const { data, error } = await requireClient().from('feedback').insert(f).select().single();
  if (error) throw error;
  return data as FeedbackRow;
}

export async function fetchFeedback(page = 0): Promise<FeedbackRow[]> {
  const from = page * FEEDBACK_PAGE_SIZE;
  const { data, error } = await requireClient()
    .from('feedback')
    .select('id, nickname, category, rating, content, created_at')
    .order('created_at', { ascending: false })
    .range(from, from + FEEDBACK_PAGE_SIZE - 1);
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}
