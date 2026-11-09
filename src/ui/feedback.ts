import {
  FEEDBACK_PAGE_SIZE,
  fetchFeedback,
  submitFeedback,
  type FeedbackCategory,
  type FeedbackRow,
} from '../api/feedback';
import { isSupabaseConfigured, toUserMessage } from '../api/supabase';
import { FEEDBACK_MAX, normalizeNickname, validateFeedbackContent, validateNickname } from '../game/validation';
import { storage } from './storage';

const COOLDOWN_MS = 30_000;
const COOLDOWN_KEY = 'feedback-last-at';
export const NICKNAME_KEY = 'nickname';

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  opinion: '의견',
  bug: '버그',
  suggestion: '제안',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderItem(f: FeedbackRow): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'fb-item';

  const head = document.createElement('div');
  head.className = 'fb-head';

  const badge = document.createElement('span');
  badge.className = `fb-badge fb-${f.category}`;
  badge.textContent = CATEGORY_LABEL[f.category] ?? f.category;

  const name = document.createElement('strong');
  name.className = 'fb-name';
  name.textContent = f.nickname;

  head.append(badge, name);

  if (f.rating) {
    const stars = document.createElement('span');
    stars.className = 'fb-stars';
    stars.textContent = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);
    stars.setAttribute('aria-label', `별점 ${f.rating}점`);
    head.append(stars);
  }

  const time = document.createElement('time');
  time.className = 'fb-time';
  time.dateTime = f.created_at;
  time.textContent = formatDateTime(f.created_at);
  head.append(time);

  const body = document.createElement('p');
  body.className = 'fb-content';
  body.textContent = f.content; // XSS 방지: HTML로 해석하지 않음

  li.append(head, body);
  return li;
}

export function initFeedback(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('#fb-form')!;
  const list = root.querySelector<HTMLUListElement>('#fb-list')!;
  const more = root.querySelector<HTMLButtonElement>('#fb-more')!;
  const msg = root.querySelector<HTMLElement>('#fb-msg')!;
  const count = root.querySelector<HTMLElement>('#fb-count')!;
  const listStatus = root.querySelector<HTMLElement>('#fb-list-status')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const nicknameInput = form.elements.namedItem('nickname') as HTMLInputElement;
  const contentInput = form.elements.namedItem('content') as HTMLTextAreaElement;

  let page = 0;
  let loading = false;

  nicknameInput.value = storage.get(NICKNAME_KEY) ?? '';

  const setMsg = (text: string, kind: 'ok' | 'error' | '' = '') => {
    msg.textContent = text;
    msg.dataset.kind = kind;
  };

  const updateCount = () => {
    count.textContent = `${[...contentInput.value].length} / ${FEEDBACK_MAX}`;
  };
  contentInput.addEventListener('input', updateCount);
  updateCount();

  const setListStatus = (text: string) => {
    listStatus.textContent = text;
    listStatus.hidden = !text;
  };

  async function loadPage(reset: boolean) {
    if (!isSupabaseConfigured || loading) return;
    loading = true;
    more.disabled = true;
    if (reset) {
      page = 0;
      setListStatus('불러오는 중…');
    }
    try {
      const rows = await fetchFeedback(page);
      const items = rows.map(renderItem);
      if (reset) list.replaceChildren(...items);
      else list.append(...items);
      page++;
      more.hidden = rows.length < FEEDBACK_PAGE_SIZE;
      setListStatus(list.children.length ? '' : '아직 피드백이 없습니다. 첫 의견을 남겨 주세요!');
    } catch (err) {
      console.error(err);
      setListStatus(toUserMessage(err));
    } finally {
      loading = false;
      more.disabled = false;
    }
  }

  more.addEventListener('click', () => void loadPage(false));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setMsg('Supabase가 설정되지 않아 피드백을 저장할 수 없습니다.', 'error');
      return;
    }

    const data = new FormData(form);
    const nickname = normalizeNickname(String(data.get('nickname') ?? ''));
    const content = String(data.get('content') ?? '').trim();
    const category = String(data.get('category') ?? 'opinion') as FeedbackCategory;
    const ratingRaw = String(data.get('rating') ?? '');
    const rating = ratingRaw ? Number(ratingRaw) : null;

    const error = validateNickname(nickname) ?? validateFeedbackContent(content);
    if (error) {
      setMsg(error, 'error');
      return;
    }

    const last = Number(storage.get(COOLDOWN_KEY) ?? 0);
    const wait = COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) {
      setMsg(`${Math.ceil(wait / 1000)}초 후에 다시 작성할 수 있습니다.`, 'error');
      return;
    }

    submitBtn.disabled = true;
    setMsg('등록 중…');
    try {
      const row = await submitFeedback({ nickname, category, rating, content });
      storage.set(COOLDOWN_KEY, String(Date.now()));
      storage.set(NICKNAME_KEY, nickname);
      contentInput.value = '';
      (form.elements.namedItem('rating') as HTMLSelectElement).value = '';
      updateCount();
      list.prepend(renderItem(row));
      setListStatus('');
      setMsg('소중한 의견 감사합니다!', 'ok');
    } catch (err) {
      console.error(err);
      setMsg(toUserMessage(err), 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  if (!isSupabaseConfigured) {
    setListStatus('Supabase가 설정되지 않아 피드백을 불러올 수 없습니다.');
    submitBtn.disabled = true;
    return;
  }
  void loadPage(true);
}
