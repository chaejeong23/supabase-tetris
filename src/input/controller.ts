export type Action =
  | 'left'
  | 'right'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'
  | 'pause'
  | 'mute';

/** 길게 누르면 자동 반복되는 동작 */
const REPEATABLE = new Set<Action>(['left', 'right', 'softDrop']);
/** 첫 반복까지 대기 시간 (Delayed Auto Shift) */
const DAS_MS = 170;
/** 반복 간격 (Auto Repeat Rate) */
const ARR_MS = 50;
const SOFT_DROP_MS = 40;

interface HeldState {
  t: number;
  repeating: boolean;
}

/** 키보드·터치 공통 입력 처리기 (누름/뗌 + 자동 반복) */
export class Controller {
  private held = new Map<Action, HeldState>();

  constructor(private handler: (a: Action) => void) {}

  press(a: Action) {
    if (REPEATABLE.has(a)) {
      if (this.held.has(a)) return;
      if (a === 'left') this.held.delete('right');
      if (a === 'right') this.held.delete('left');
      this.held.set(a, { t: 0, repeating: false });
    }
    this.handler(a);
  }

  release(a: Action) {
    this.held.delete(a);
  }

  releaseAll() {
    this.held.clear();
  }

  update(dt: number) {
    for (const [a, s] of this.held) {
      s.t += dt;
      let delay = this.delayFor(a, s);
      while (s.t >= delay) {
        s.t -= delay;
        s.repeating = true;
        this.handler(a);
        delay = this.delayFor(a, s);
      }
    }
  }

  private delayFor(a: Action, s: HeldState): number {
    if (a === 'softDrop') return SOFT_DROP_MS;
    return s.repeating ? ARR_MS : DAS_MS;
  }
}
