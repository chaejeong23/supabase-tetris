import type { AudioManager } from '../audio/audio';

export function initSettings(audio: AudioManager, onChange: () => void) {
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
  const openBtn = document.querySelector<HTMLButtonElement>('#settings-btn')!;
  const bgm = dialog.querySelector<HTMLInputElement>('#bgm-volume')!;
  const sfx = dialog.querySelector<HTMLInputElement>('#sfx-volume')!;
  const muted = dialog.querySelector<HTMLInputElement>('#muted')!;
  const bgmOut = dialog.querySelector<HTMLOutputElement>('#bgm-volume-out')!;
  const sfxOut = dialog.querySelector<HTMLOutputElement>('#sfx-volume-out')!;

  const sync = () => {
    const s = audio.settings;
    bgm.value = String(Math.round(s.bgmVolume * 100));
    sfx.value = String(Math.round(s.sfxVolume * 100));
    muted.checked = s.muted;
    bgmOut.textContent = `${bgm.value}%`;
    sfxOut.textContent = `${sfx.value}%`;
  };

  openBtn.addEventListener('click', () => {
    audio.unlock();
    sync();
    dialog.showModal();
  });

  bgm.addEventListener('input', () => {
    audio.setSettings({ bgmVolume: Number(bgm.value) / 100 });
    bgmOut.textContent = `${bgm.value}%`;
  });

  sfx.addEventListener('input', () => {
    audio.setSettings({ sfxVolume: Number(sfx.value) / 100 });
    sfxOut.textContent = `${sfx.value}%`;
  });
  // 슬라이더를 놓을 때 효과음 미리 듣기
  sfx.addEventListener('change', () => audio.play('clear'));

  muted.addEventListener('change', () => {
    audio.setSettings({ muted: muted.checked });
    onChange();
  });

  dialog.addEventListener('close', onChange);

  return { sync };
}
