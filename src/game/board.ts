import { SHAPES, type Cell, type PieceType } from './pieces';

export const COLS = 10;
export const VISIBLE_ROWS = 20;
/** 스폰용 숨김 행 (화면에 그리지 않음) */
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export type BoardCell = PieceType | null;
export type Board = BoardCell[][];

export interface ActivePiece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<BoardCell>(COLS).fill(null));
}

export function pieceCells(p: ActivePiece): Cell[] {
  return SHAPES[p.type][p.rot].map(([cx, cy]) => [p.x + cx, p.y + cy] as Cell);
}

export function collides(board: Board, p: ActivePiece): boolean {
  for (const [x, y] of pieceCells(p)) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    if (board[y][x] !== null) return true;
  }
  return false;
}

export function merge(board: Board, p: ActivePiece): Board {
  const next = board.map((row) => row.slice());
  for (const [x, y] of pieceCells(p)) next[y][x] = p.type;
  return next;
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - remaining.length;
  const empty = Array.from({ length: cleared }, () => Array<BoardCell>(COLS).fill(null));
  return { board: [...empty, ...remaining], cleared };
}
