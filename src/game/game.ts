import { Bag } from './bag';
import {
  COLS,
  HIDDEN_ROWS,
  clearLines,
  collides,
  createBoard,
  merge,
  pieceCells,
  type ActivePiece,
  type Board,
} from './board';
import { PIECE_SIZE, type PieceType } from './pieces';
import { getKicks } from './rotation';
import {
  HARD_DROP_POINTS,
  SOFT_DROP_POINTS,
  gravityMs,
  levelForLines,
  lineClearScore,
} from './scoring';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'over';

export type GameEvent =
  | { type: 'move' }
  | { type: 'rotate' }
  | { type: 'hardDrop' }
  | { type: 'lock' }
  | { type: 'clear'; lines: number }
  | { type: 'levelUp'; level: number }
  | { type: 'hold' }
  | { type: 'gameOver' };

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
const QUEUE_SIZE = 5;

export class Game {
  board: Board = createBoard();
  active: ActivePiece | null = null;
  holdType: PieceType | null = null;
  canHold = true;
  queue: PieceType[] = [];
  score = 0;
  lines = 0;
  level = 1;
  status: GameStatus = 'idle';
  /** 게임 진행 시간(ms, 일시정지 제외) */
  elapsedMs = 0;

  private bag: Bag;
  private gravityAcc = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private listeners: Array<(e: GameEvent) => void> = [];

  constructor(private rng: () => number = Math.random) {
    this.bag = new Bag(rng);
  }

  on(fn: (e: GameEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private emit(e: GameEvent) {
    for (const l of this.listeners) l(e);
  }

  start() {
    this.board = createBoard();
    this.bag = new Bag(this.rng);
    this.queue = [];
    this.fillQueue();
    this.holdType = null;
    this.canHold = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.elapsedMs = 0;
    this.status = 'playing';
    this.spawn();
  }

  togglePause() {
    if (this.status === 'playing') this.status = 'paused';
    else if (this.status === 'paused') this.status = 'playing';
  }

  // ---------- 조작 ----------

  moveLeft(): boolean {
    return this.shift(-1);
  }

  moveRight(): boolean {
    return this.shift(1);
  }

  softDrop(): boolean {
    if (!this.isPlaying()) return false;
    if (this.tryMove(0, 1)) {
      this.score += SOFT_DROP_POINTS;
      this.gravityAcc = 0;
      return true;
    }
    return false;
  }

  hardDrop() {
    if (!this.isPlaying()) return;
    let dist = 0;
    while (this.tryMove(0, 1)) dist++;
    this.score += dist * HARD_DROP_POINTS;
    this.emit({ type: 'hardDrop' });
    this.lock();
  }

  rotate(dir: 1 | -1): boolean {
    if (!this.isPlaying() || !this.active) return false;
    const p = this.active;
    const to = (p.rot + dir + 4) % 4;
    for (const [kx, ky] of getKicks(p.type, p.rot, to)) {
      const cand: ActivePiece = { ...p, rot: to, x: p.x + kx, y: p.y + ky };
      if (!collides(this.board, cand)) {
        this.active = cand;
        this.emit({ type: 'rotate' });
        this.afterManipulation();
        return true;
      }
    }
    return false;
  }

  hold(): boolean {
    if (!this.isPlaying() || !this.active || !this.canHold) return false;
    const current = this.active.type;
    const held = this.holdType;
    this.holdType = current;
    this.spawn(held ?? undefined);
    this.canHold = false;
    this.emit({ type: 'hold' });
    return true;
  }

  // ---------- 진행 ----------

  update(dt: number) {
    if (!this.isPlaying() || !this.active) return;
    this.elapsedMs += dt;

    if (this.isGrounded()) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY_MS) this.lock();
      return;
    }

    this.lockTimer = 0;
    this.gravityAcc += dt;
    const interval = gravityMs(this.level);
    while (this.gravityAcc >= interval) {
      this.gravityAcc -= interval;
      if (!this.tryMove(0, 1)) {
        this.gravityAcc = 0;
        break;
      }
    }
  }

  // ---------- 내부 ----------

  private isPlaying() {
    return this.status === 'playing';
  }

  private fillQueue() {
    while (this.queue.length < QUEUE_SIZE) this.queue.push(this.bag.next());
  }

  private spawn(type?: PieceType) {
    const t = type ?? this.queue.shift()!;
    this.fillQueue();
    const piece: ActivePiece = {
      type: t,
      rot: 0,
      x: Math.floor((COLS - PIECE_SIZE[t]) / 2),
      y: 0,
    };
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    if (collides(this.board, piece)) {
      this.active = null;
      this.endGame();
      return;
    }
    this.active = piece;
  }

  private shift(dx: number): boolean {
    if (!this.isPlaying()) return false;
    if (this.tryMove(dx, 0)) {
      this.emit({ type: 'move' });
      this.afterManipulation();
      return true;
    }
    return false;
  }

  private tryMove(dx: number, dy: number): boolean {
    if (!this.active) return false;
    const cand = { ...this.active, x: this.active.x + dx, y: this.active.y + dy };
    if (collides(this.board, cand)) return false;
    this.active = cand;
    return true;
  }

  private isGrounded(): boolean {
    return !!this.active && collides(this.board, { ...this.active, y: this.active.y + 1 });
  }

  /** 바닥에 닿은 상태에서 이동/회전하면 고정 타이머를 리셋 (최대 횟수 제한) */
  private afterManipulation() {
    if (this.isGrounded() && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  private lock() {
    if (!this.active) return;
    const piece = this.active;
    const lockedAboveField = pieceCells(piece).every(([, y]) => y < HIDDEN_ROWS);
    this.active = null;

    const { board, cleared } = clearLines(merge(this.board, piece));
    this.board = board;

    if (cleared > 0) {
      this.score += lineClearScore(cleared, this.level);
      this.lines += cleared;
      this.emit({ type: 'clear', lines: cleared });
      const newLevel = levelForLines(this.lines);
      if (newLevel > this.level) {
        this.level = newLevel;
        this.emit({ type: 'levelUp', level: newLevel });
      }
    } else {
      this.emit({ type: 'lock' });
    }

    this.canHold = true;
    if (lockedAboveField) {
      this.endGame();
      return;
    }
    this.spawn();
  }

  private endGame() {
    this.status = 'over';
    this.emit({ type: 'gameOver' });
  }
}
