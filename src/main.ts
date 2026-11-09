import './style.css';
import { fetchRank, submitScore } from './api/scores';
import { isSupabaseConfigured, toUserMessage } from './api/supabase';
import { AudioManager } from './audio/audio';
import { Game, type GameEvent } from './game/game';
import { isPlausibleScore, normalizeNickname, validateNickname } from './game/validation';
import { Controller, type Action } from './input/controller';
import { bindKeyboard } from './input/keyboard';
import { bindTouch } from './input/touch';
import { Renderer } from './render/canvas';
import { NICKNAME_KEY, initFeedback } from './ui/feedback';
import { LeaderboardView } from './ui/leaderboard';
import { initSettings } from './ui/settings';
import { storage } from './ui/storage';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

// ---------- 요소 ----------
const overlay = $('#overlay');
const muteBtn = $<HTMLButtonElement>('#mute-btn');
const stat = {
  score: $('#stat-score'),
  level: $('#stat-level'),
  lines: $('#stat-lines'),
  best: $('#stat-best'),
};
const overScore = $('#over-score');
const overDetail = $('#over-detail');
const overBest = $('#over-best');
const scoreForm = $<HTMLFormElement>('#score-form');
const scoreNickname = $<HTMLInputElement>('#score-nickname');
const scoreSubmit = $<HTMLButtonElement>('#score-submit');
const scoreMsg = $('#score-msg');

// ---------- 상태 ----------
const BEST_KEY = 'best-score';
const game = new Game();
const audio = new AudioManager();
const renderer = new Renderer(
  $<HTMLCanvasElement>('#board-canvas'),
  $<HTMLCanvasElement>('#next-canvas'),
  $<HTMLCanvasElement>('#hold-canvas'),
);
const leaderboard = new LeaderboardView($<HTMLOListElement>('#lb-list'), $('#lb-status'));
let best = Number(storage.get(BEST_KEY)) || 0;
let scoreSubmitted = false;

// ---------- 오버레이 ----------
type Panel = 'start' | 'pause' | 'over';
function showOverlay(panel: Panel | null) {
  overlay.hidden = panel === null;
  overlay.querySelectorAll<HTMLElement>('[data-panel]').forEach((el) => {
    el.hidden = el.dataset.panel !== panel;
  });
}

// ---------- 게임 흐름 ----------
function startGame() {
  audio.unlock();
  controller.releaseAll();
  game.start();
  scoreSubmitted = false;
  audio.setBgmLevel(1);
  audio.startBgm();
  showOverlay(null);
  (document.activeElement as HTMLElement | null)?.blur();
}

function pauseGame() {
  if (game.status !== 'playing') return;
  game.togglePause();
  controller.releaseAll();
  audio.pauseBgm();
  showOverlay('pause');
}

function resumeGame() {
  if (game.status !== 'paused') return;
  audio.unlock();
  game.togglePause();
  audio.resumeBgm();
  showOverlay(null);
  (document.activeElement as HTMLElement | null)?.blur();
}

function onGameOver() {
  audio.stopBgm();
  audio.play('gameOver');
  controller.releaseAll();

  const isNewBest = game.score > best;
  if (isNewBest) {
    best = game.score;
    storage.set(BEST_KEY, String(best));
  }

  overScore.textContent = game.score.toLocaleString('ko-KR');
  overDetail.textContent = `레벨 ${game.level} · ${game.lines}줄`;
  overBest.hidden = !isNewBest || game.score === 0;

  scoreNickname.value = storage.get(NICKNAME_KEY) ?? '';
  scoreMsg.textContent = isSupabaseConfigured ? '' : 'Supabase가 설정되지 않아 점수를 등록할 수 없습니다.';
  scoreMsg.dataset.kind = isSupabaseConfigured ? '' : 'error';
  scoreSubmit.disabled = !isSupabaseConfigured;
  scoreNickname.disabled = !isSupabaseConfigured;
  showOverlay('over');
  if (isSupabaseConfigured) scoreNickname.focus();
}

function onGameEvent(e: GameEvent) {
  switch (e.type) {
    case 'move':
      audio.play('move');
      break;
    case 'rotate':
      audio.play('rotate');
      break;
    case 'hardDrop':
      audio.play('hardDrop');
      break;
    case 'lock':
      audio.play('lock');
      break;
    case 'clear':
      audio.play(e.lines >= 4 ? 'tetris' : 'clear');
      break;
    case 'levelUp':
      audio.play('levelUp');
      audio.setBgmLevel(e.level);
      break;
    case 'hold':
      audio.play('hold');
      break;
    case 'gameOver':
      onGameOver();
      break;
  }
}
game.on(onGameEvent);

// ---------- 입력 ----------
function updateMuteButton() {
  const muted = audio.settings.muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(muted));
  muteBtn.setAttribute('aria-label', muted ? '소리 켜기' : '음소거');
}

function onAction(a: Action) {
  if (a === 'mute') {
    audio.unlock();
    audio.toggleMute();
    updateMuteButton();
    return;
  }
  if (a === 'pause') {
    if (game.status === 'playing') pauseGame();
    else if (game.status === 'paused') resumeGame();
    return;
  }
  if (game.status !== 'playing') return;
  switch (a) {
    case 'left':
      game.moveLeft();
      break;
    case 'right':
      game.moveRight();
      break;
    case 'softDrop':
      game.softDrop();
      break;
    case 'hardDrop':
      game.hardDrop();
      break;
    case 'rotateCW':
      game.rotate(1);
      break;
    case 'rotateCCW':
      game.rotate(-1);
      break;
    case 'hold':
      game.hold();
      break;
  }
}

const controller = new Controller(onAction);
bindKeyboard(controller, {
  isActive: () => game.status === 'playing',
  onEnter: () => {
    if (game.status === 'idle' || game.status === 'over') startGame();
    else if (game.status === 'paused') resumeGame();
  },
});
bindTouch($('#touch-controls'), controller, () => audio.unlock());

$('#start-btn').addEventListener('click', startGame);
$('#resume-btn').addEventListener('click', resumeGame);
$('#restart-btn').addEventListener('click', startGame);
$('#retry-btn').addEventListener('click', startGame);
$('#lb-refresh').addEventListener('click', () => void leaderboard.refresh());
muteBtn.addEventListener('click', () => onAction('mute'));
$('#settings-btn').addEventListener('click', pauseGame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

initSettings(audio, updateMuteButton);
updateMuteButton();

// ---------- 점수 등록 ----------
scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (scoreSubmitted || !isSupabaseConfigured) return;

  const nickname = normalizeNickname(scoreNickname.value);
  const error = validateNickname(nickname);
  if (error) {
    scoreMsg.textContent = error;
    scoreMsg.dataset.kind = 'error';
    return;
  }
  const payload = { nickname, score: game.score, level: game.level, lines: game.lines };
  if (!isPlausibleScore(payload)) {
    scoreMsg.textContent = '등록할 수 없는 기록입니다.';
    scoreMsg.dataset.kind = 'error';
    return;
  }

  scoreSubmit.disabled = true;
  scoreMsg.textContent = '등록 중…';
  scoreMsg.dataset.kind = '';
  try {
    const row = await submitScore(payload);
    scoreSubmitted = true;
    storage.set(NICKNAME_KEY, nickname);
    let rankText = '';
    try {
      rankText = ` 전체 ${await fetchRank(row.score)}위입니다!`;
    } catch {
      /* 순위 조회 실패는 무시 */
    }
    scoreMsg.textContent = `등록 완료!${rankText}`;
    scoreMsg.dataset.kind = 'ok';
    scoreNickname.disabled = true;
    void leaderboard.refresh(row.id);
  } catch (err) {
    console.error(err);
    scoreMsg.textContent = toUserMessage(err);
    scoreMsg.dataset.kind = 'error';
    scoreSubmit.disabled = false;
  }
});

// ---------- HUD & 루프 ----------
const hudCache = { score: -1, level: -1, lines: -1, best: -1 };
function updateHud() {
  const shownBest = Math.max(best, game.score);
  const values = { score: game.score, level: game.level, lines: game.lines, best: shownBest };
  for (const k of Object.keys(values) as Array<keyof typeof values>) {
    if (hudCache[k] !== values[k]) {
      hudCache[k] = values[k];
      stat[k].textContent = values[k].toLocaleString('ko-KR');
    }
  }
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(100, now - last);
  last = now;
  if (game.status === 'playing') {
    controller.update(dt);
    game.update(dt);
  }
  renderer.draw(game);
  updateHud();
  requestAnimationFrame(frame);
}

showOverlay('start');
void leaderboard.refresh();
initFeedback($('#feedback'));
requestAnimationFrame(frame);
