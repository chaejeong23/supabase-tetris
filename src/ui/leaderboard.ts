import { fetchTopScores, type ScoreRow } from '../api/scores';
import { isSupabaseConfigured, toUserMessage } from '../api/supabase';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function renderRow(row: ScoreRow, rank: number, highlight: boolean): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'lb-row' + (highlight ? ' is-me' : '');
  li.title = `레벨 ${row.level} · ${row.lines}줄 · ${formatDate(row.created_at)}`;

  const rankEl = document.createElement('span');
  rankEl.className = 'lb-rank';
  rankEl.textContent = String(rank);

  const name = document.createElement('span');
  name.className = 'lb-name';
  name.textContent = row.nickname; // 사용자 입력은 항상 textContent로

  const score = document.createElement('span');
  score.className = 'lb-score';
  score.textContent = row.score.toLocaleString('ko-KR');

  const meta = document.createElement('span');
  meta.className = 'lb-meta';
  meta.textContent = `Lv.${row.level} · ${row.lines}줄 · ${formatDate(row.created_at)}`;

  li.append(rankEl, name, score, meta);
  return li;
}

export class LeaderboardView {
  private loading = false;

  constructor(
    private list: HTMLOListElement,
    private status: HTMLElement,
  ) {}

  async refresh(highlightId?: number) {
    if (!isSupabaseConfigured) {
      this.setStatus('Supabase가 설정되지 않아 리더보드를 사용할 수 없습니다.');
      return;
    }
    if (this.loading) return;
    this.loading = true;
    if (!this.list.children.length) this.setStatus('불러오는 중…');
    try {
      const rows = await fetchTopScores(10);
      this.list.replaceChildren(...rows.map((r, i) => renderRow(r, i + 1, r.id === highlightId)));
      this.setStatus(rows.length ? '' : '아직 기록이 없습니다. 첫 번째 주인공이 되어 보세요!');
    } catch (err) {
      console.error(err);
      this.setStatus(toUserMessage(err));
    } finally {
      this.loading = false;
    }
  }

  private setStatus(text: string) {
    this.status.textContent = text;
    this.status.hidden = !text;
  }
}
