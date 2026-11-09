/** 제거한 줄 수별 기본 점수 (레벨을 곱함) */
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
export const LINES_PER_LEVEL = 10;
export const MAX_LEVEL = 99;

export function lineClearScore(lines: number, level: number): number {
  return (LINE_SCORES[lines] ?? 0) * level;
}

export function levelForLines(lines: number): number {
  return Math.min(MAX_LEVEL, Math.floor(lines / LINES_PER_LEVEL) + 1);
}

/** 레벨별 1칸 낙하 간격(ms). 레벨이 오를수록 빨라진다. */
export function gravityMs(level: number): number {
  const l = Math.min(level, 20);
  const seconds = Math.pow(0.8 - (l - 1) * 0.007, l - 1);
  return Math.max(30, seconds * 1000);
}
