import { PIECE_TYPES, type PieceType } from './pieces';

/** 7-bag 랜덤: 7종을 한 묶음으로 섞어서 차례로 꺼낸다. */
export class Bag {
  private items: PieceType[] = [];

  constructor(private rng: () => number = Math.random) {}

  next(): PieceType {
    if (this.items.length === 0) this.refill();
    return this.items.pop()!;
  }

  private refill() {
    const arr = [...PIECE_TYPES];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    this.items = arr;
  }
}
