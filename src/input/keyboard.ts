import type { Action, Controller } from './controller';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  Space: 'hardDrop',
  ArrowUp: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  ControlLeft: 'rotateCCW',
  ControlRight: 'rotateCCW',
  KeyC: 'hold',
  ShiftLeft: 'hold',
  ShiftRight: 'hold',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
};

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

export interface KeyboardOptions {
  /** 게임 조작 키를 받을 상태인지 (true면 방향키/스페이스 기본 동작을 막는다) */
  isActive: () => boolean;
  /** Enter 키 (시작/재시작) */
  onEnter: () => void;
}

export function bindKeyboard(controller: Controller, opts: KeyboardOptions) {
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;
    if (document.querySelector('dialog[open]')) return;

    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      if (!(e.target instanceof HTMLButtonElement)) opts.onEnter();
      return;
    }

    const action = KEYMAP[e.code];
    if (!action) return;
    const gameKey = action !== 'mute' && action !== 'pause';
    if (gameKey && opts.isActive()) e.preventDefault();
    if (e.repeat) return;
    controller.press(action);
  });

  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) controller.release(action);
  });

  window.addEventListener('blur', () => controller.releaseAll());
}
