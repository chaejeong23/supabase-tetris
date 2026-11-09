import type { Action, Controller } from './controller';

/** data-action 속성을 가진 버튼들을 터치/마우스 입력에 연결 */
export function bindTouch(root: HTMLElement, controller: Controller, onFirstInput: () => void) {
  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
    const action = btn.dataset.action as Action;
    const release = () => controller.release(action);

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      onFirstInput();
      controller.press(action);
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
