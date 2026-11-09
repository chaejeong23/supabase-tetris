export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const PIECE_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

type Matrix = number[][];
export type Cell = [x: number, y: number];

/** 회전 상태 0(스폰 방향)의 모양 */
const BASE: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  return m.map((row, r) => row.map((_, c) => m[n - 1 - c][r]));
}

function toCells(m: Matrix): Cell[] {
  const cells: Cell[] = [];
  m.forEach((row, y) => row.forEach((v, x) => v && cells.push([x, y])));
  return cells;
}

function buildRotations(m: Matrix): Cell[][] {
  const rots: Cell[][] = [];
  let cur = m;
  for (let i = 0; i < 4; i++) {
    rots.push(toCells(cur));
    cur = rotateCW(cur);
  }
  return rots;
}

/** SHAPES[type][rotation] = 블록이 차지하는 셀 좌표 목록 (매트릭스 기준 오프셋) */
export const SHAPES: Record<PieceType, Cell[][]> = Object.fromEntries(
  PIECE_TYPES.map((t) => [t, buildRotations(BASE[t])]),
) as Record<PieceType, Cell[][]>;

export const PIECE_SIZE: Record<PieceType, number> = Object.fromEntries(
  PIECE_TYPES.map((t) => [t, BASE[t].length]),
) as Record<PieceType, number>;

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#4fd1c5',
  O: '#f6c945',
  T: '#b17cf0',
  S: '#6fd36f',
  Z: '#f2696b',
  J: '#5b8def',
  L: '#f59e4b',
};
