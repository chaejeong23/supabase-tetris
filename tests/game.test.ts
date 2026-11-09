import { describe, expect, it } from 'vitest';
import { Bag } from '../src/game/bag';
import { COLS, ROWS, clearLines, collides, createBoard, type Board } from '../src/game/board';
import { Game, LOCK_DELAY_MS, type GameEvent } from '../src/game/game';
import { PIECE_TYPES, SHAPES } from '../src/game/pieces';
import { gravityMs, levelForLines, lineClearScore } from '../src/game/scoring';

/** 항상 같은 순서를 내는 시드 RNG */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function fillRow(board: Board, y: number, gapX: number | null = null) {
  for (let x = 0; x < COLS; x++) board[y][x] = x === gapX ? null : 'O';
}

describe('pieces', () => {
  it('모든 블록은 회전 상태마다 4칸', () => {
    for (const t of PIECE_TYPES) {
      expect(SHAPES[t]).toHaveLength(4);
      for (const cells of SHAPES[t]) expect(cells).toHaveLength(4);
    }
  });

  it('T 블록 시계 회전 모양', () => {
    const cells = SHAPES.T[1].map(([x, y]) => `${x},${y}`).sort();
    expect(cells).toEqual(['1,0', '1,1', '1,2', '2,1'].sort());
  });
});

describe('bag', () => {
  it('7개마다 7종이 한 번씩 나온다', () => {
    const bag = new Bag(seeded(42));
    for (let round = 0; round < 3; round++) {
      const set = new Set(Array.from({ length: 7 }, () => bag.next()));
      expect(set.size).toBe(7);
    }
  });
});

describe('board', () => {
  it('벽과 바닥 충돌', () => {
    const b = createBoard();
    expect(collides(b, { type: 'O', rot: 0, x: -1, y: 0 })).toBe(true);
    expect(collides(b, { type: 'O', rot: 0, x: COLS - 1, y: 0 })).toBe(true);
    expect(collides(b, { type: 'O', rot: 0, x: 0, y: ROWS - 1 })).toBe(true);
    expect(collides(b, { type: 'O', rot: 0, x: 0, y: ROWS - 2 })).toBe(false);
  });

  it('가득 찬 줄만 제거하고 위 줄을 내린다', () => {
    const b = createBoard();
    fillRow(b, ROWS - 1);
    fillRow(b, ROWS - 2, 3);
    fillRow(b, ROWS - 3);
    const { board, cleared } = clearLines(b);
    expect(cleared).toBe(2);
    expect(board).toHaveLength(ROWS);
    expect(board[ROWS - 1][3]).toBeNull();
    expect(board[ROWS - 1][0]).toBe('O');
    expect(board[ROWS - 2].every((c) => c === null)).toBe(true);
  });
});

describe('scoring', () => {
  it('줄 제거 점수 × 레벨', () => {
    expect(lineClearScore(1, 1)).toBe(100);
    expect(lineClearScore(4, 3)).toBe(2400);
  });

  it('10줄마다 레벨 업', () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(25)).toBe(3);
  });

  it('레벨이 오를수록 빨라진다', () => {
    expect(gravityMs(1)).toBeCloseTo(1000);
    expect(gravityMs(5)).toBeLessThan(gravityMs(4));
    expect(gravityMs(30)).toBeGreaterThanOrEqual(30);
  });
});

describe('game', () => {
  it('시작하면 블록이 생성되고 다음 블록 대기열이 찬다', () => {
    const g = new Game(seeded());
    g.start();
    expect(g.status).toBe('playing');
    expect(g.active).not.toBeNull();
    expect(g.queue.length).toBeGreaterThanOrEqual(3);
  });

  it('하드 드롭은 칸당 2점이고 바닥에 고정된다', () => {
    const g = new Game(seeded());
    g.start();
    const first = g.active!;
    g.hardDrop();
    expect(g.score).toBeGreaterThan(0);
    expect(g.score % 2).toBe(0);
    expect(g.board[ROWS - 1].some((c) => c === first.type)).toBe(true);
  });

  it('바닥에 닿으면 고정 지연 후 고정된다', () => {
    const g = new Game(seeded());
    g.start();
    while (g.softDrop()) {
      /* 바닥까지 */
    }
    const before = g.active;
    g.update(LOCK_DELAY_MS - 1);
    expect(g.active).toBe(before);
    g.update(2);
    expect(g.active).not.toBe(before);
  });

  it('줄을 채우면 제거되고 점수가 오른다', () => {
    const g = new Game(seeded());
    g.start();
    // 맨 아래 줄을 I 블록 하나만 들어갈 자리를 남기고 채운다
    for (let x = 0; x < COLS; x++) if (x < 3 || x > 6) g.board[ROWS - 1][x] = 'O';
    g.active = { type: 'I', rot: 0, x: 3, y: 0 };
    const events: GameEvent[] = [];
    g.on((e) => events.push(e));
    g.hardDrop();
    expect(g.lines).toBe(1);
    expect(events.some((e) => e.type === 'clear' && e.lines === 1)).toBe(true);
    expect(g.board[ROWS - 1].every((c) => c === null)).toBe(true);
  });

  it('홀드는 고정 전까지 한 번만 가능', () => {
    const g = new Game(seeded());
    g.start();
    const first = g.active!.type;
    expect(g.hold()).toBe(true);
    expect(g.holdType).toBe(first);
    expect(g.hold()).toBe(false);
    g.hardDrop();
    expect(g.hold()).toBe(true);
  });

  it('벽에 붙어도 벽 차기로 회전한다', () => {
    const g = new Game(seeded());
    g.start();
    g.active = { type: 'T', rot: 1, x: -1, y: 5 }; // 세로 T, 왼쪽 벽에 붙음
    expect(collides(g.board, g.active)).toBe(false);
    expect(g.rotate(1)).toBe(true);
    expect(collides(g.board, g.active!)).toBe(false);
  });

  it('보이는 필드 위(숨김 행)에서 고정되면 게임 오버', () => {
    const g = new Game(seeded());
    g.start();
    // 숨김 행(0,1)을 제외한 모든 행을 한 칸씩 비워 채움 → 줄 제거는 일어나지 않음
    for (let y = 2; y < ROWS; y++) fillRow(g.board, y, COLS - 1);
    g.active = { type: 'O', rot: 0, x: 4, y: 0 };
    const events: GameEvent[] = [];
    g.on((e) => events.push(e));
    g.hardDrop();
    expect(g.status).toBe('over');
    expect(events.some((e) => e.type === 'gameOver')).toBe(true);
  });

  it('일시정지 중에는 조작이 무시된다', () => {
    const g = new Game(seeded());
    g.start();
    g.togglePause();
    const before = { ...g.active! };
    expect(g.moveLeft()).toBe(false);
    g.update(5000);
    expect(g.active).toEqual(before);
  });
});
