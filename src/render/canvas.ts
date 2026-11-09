import { COLS, HIDDEN_ROWS, VISIBLE_ROWS, pieceCells } from '../game/board';
import type { Game } from '../game/game';
import { PIECE_COLORS, SHAPES, type PieceType } from '../game/pieces';

const CELL = 30;
const BOARD_W = COLS * CELL;
const BOARD_H = VISIBLE_ROWS * CELL;
const PREVIEW_CELL = 20;
const PREVIEW_SLOT_H = 80;

const BG = '#121528';
const GRID = 'rgba(255,255,255,0.05)';

function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  // 윗면 하이라이트 (그림자 효과 없음, 평면 스타일)
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + 1, y + 1, size - 2, Math.max(2, size * 0.14));
  ctx.globalAlpha = 1;
}

export class Renderer {
  private board: CanvasRenderingContext2D;
  private next: CanvasRenderingContext2D;
  private hold: CanvasRenderingContext2D;

  constructor(boardCanvas: HTMLCanvasElement, nextCanvas: HTMLCanvasElement, holdCanvas: HTMLCanvasElement) {
    this.board = setupCanvas(boardCanvas, BOARD_W, BOARD_H);
    this.next = setupCanvas(nextCanvas, 120, PREVIEW_SLOT_H * 3);
    this.hold = setupCanvas(holdCanvas, 120, PREVIEW_SLOT_H);
  }

  draw(game: Game) {
    this.drawBoard(game);
    this.drawPreviewList(this.next, game.queue.slice(0, 3));
    this.drawPreviewList(this.hold, game.holdType ? [game.holdType] : [], game.canHold ? 1 : 0.35);
  }

  private drawBoard(game: Game) {
    const ctx = this.board;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, BOARD_H);
    }
    for (let y = 1; y < VISIBLE_ROWS; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(BOARD_W, y * CELL + 0.5);
    }
    ctx.stroke();

    for (let y = HIDDEN_ROWS; y < game.board.length; y++) {
      const row = game.board[y];
      for (let x = 0; x < COLS; x++) {
        const c = row[x];
        if (c) drawBlock(ctx, x * CELL, (y - HIDDEN_ROWS) * CELL, CELL, PIECE_COLORS[c]);
      }
    }

    if (game.active) {
      const color = PIECE_COLORS[game.active.type];
      for (const [x, y] of pieceCells(game.active)) {
        if (y >= HIDDEN_ROWS) drawBlock(ctx, x * CELL, (y - HIDDEN_ROWS) * CELL, CELL, color);
      }
    }
  }

  private drawPreviewList(ctx: CanvasRenderingContext2D, types: PieceType[], alpha = 1) {
    const w = ctx.canvas.width / (ctx.getTransform().a || 1);
    const h = ctx.canvas.height / (ctx.getTransform().d || 1);
    ctx.clearRect(0, 0, w, h);
    types.forEach((t, i) => this.drawPreview(ctx, t, w / 2, i * PREVIEW_SLOT_H + PREVIEW_SLOT_H / 2, alpha));
  }

  private drawPreview(ctx: CanvasRenderingContext2D, type: PieceType, cx: number, cy: number, alpha: number) {
    const cells = SHAPES[type][0];
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = (Math.max(...xs) - minX + 1) * PREVIEW_CELL;
    const h = (Math.max(...ys) - minY + 1) * PREVIEW_CELL;
    const ox = cx - w / 2;
    const oy = cy - h / 2;
    for (const [x, y] of cells) {
      drawBlock(ctx, ox + (x - minX) * PREVIEW_CELL, oy + (y - minY) * PREVIEW_CELL, PREVIEW_CELL, PIECE_COLORS[type], alpha);
    }
  }
}
