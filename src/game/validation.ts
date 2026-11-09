export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;
export const FEEDBACK_MAX = 500;

/** 간단한 금칙어 목록 (부분 일치, 대소문자 무시) */
const BANNED = ['시발', '씨발', '병신', '좆', 'fuck', 'shit', 'bitch', '운영자', 'admin'];

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function containsBanned(text: string): boolean {
  const lower = text.toLowerCase().replace(/\s+/g, '');
  return BANNED.some((w) => lower.includes(w));
}

/** 오류 메시지를 반환, 문제 없으면 null */
export function validateNickname(raw: string): string | null {
  const name = normalizeNickname(raw);
  const len = [...name].length;
  if (len < NICKNAME_MIN || len > NICKNAME_MAX) {
    return `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`;
  }
  // 제어 문자 차단
  if (/[\u0000-\u001f\u007f]/.test(name)) return '사용할 수 없는 문자가 포함되어 있습니다.';
  if (containsBanned(name)) return '사용할 수 없는 닉네임입니다.';
  return null;
}

export function validateFeedbackContent(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0) return '내용을 입력해 주세요.';
  if ([...text].length > FEEDBACK_MAX) return `내용은 ${FEEDBACK_MAX}자 이하로 입력해 주세요.`;
  if (containsBanned(text)) return '부적절한 표현이 포함되어 있습니다.';
  return null;
}

export interface ScorePayload {
  score: number;
  level: number;
  lines: number;
}

/** DB 제약조건과 같은 범위 + 기본 타당성 검사 */
export function isPlausibleScore({ score, level, lines }: ScorePayload): boolean {
  const ints = [score, level, lines].every((n) => Number.isInteger(n) && n >= 0);
  if (!ints) return false;
  if (score > 9_999_999 || level < 1 || level > 99 || lines > 9_999) return false;
  if (level !== Math.min(99, Math.floor(lines / 10) + 1)) return false;
  return true;
}
