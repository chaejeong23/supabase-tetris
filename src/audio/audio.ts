import { storage } from '../ui/storage';

/**
 * 모든 사운드는 Web Audio API로 실시간 합성한다.
 * - 외부 음원 파일 없음 → 저작권/라이선스 이슈 없음, 다운로드 용량 0
 * - 배경음은 이 프로젝트를 위해 새로 만든 8마디 루프 (A단조)
 */

export type Sfx =
  | 'move'
  | 'rotate'
  | 'hardDrop'
  | 'lock'
  | 'clear'
  | 'tetris'
  | 'levelUp'
  | 'hold'
  | 'gameOver';

export interface AudioSettings {
  bgmVolume: number; // 0~1
  sfxVolume: number; // 0~1
  muted: boolean;
}

const SETTINGS_KEY = 'audio-settings';
const DEFAULT_SETTINGS: AudioSettings = { bgmVolume: 0.5, sfxVolume: 0.7, muted: false };

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// ---- 배경음 악보 (8분음표 단위: [MIDI 음 또는 null(쉼표), 길이]) ----
type Note = [number | null, number];
const MELODY: Note[] = [
  // 1: Am
  [76, 2], [74, 1], [72, 1], [74, 2], [69, 2],
  // 2: F
  [72, 1], [74, 1], [76, 2], [77, 2], [76, 2],
  // 3: C
  [79, 2], [76, 1], [74, 1], [72, 2], [74, 2],
  // 4: G
  [71, 2], [74, 2], [79, 3], [null, 1],
  // 5: Am
  [76, 1], [77, 1], [76, 1], [74, 1], [72, 2], [69, 2],
  // 6: F
  [69, 1], [72, 1], [77, 2], [76, 2], [74, 2],
  // 7: G
  [74, 2], [71, 1], [74, 1], [79, 2], [77, 2],
  // 8: Am
  [76, 4], [null, 2], [69, 2],
];
const BASS_ROOTS = [45, 41, 48, 43, 45, 41, 43, 45]; // 마디별 근음
const STEPS_PER_BAR = 8;
const TOTAL_STEPS = STEPS_PER_BAR * BASS_ROOTS.length;

/** step -> [음, 길이(step)] */
const MELODY_AT: Array<[number, number] | undefined> = (() => {
  const arr: Array<[number, number] | undefined> = new Array(TOTAL_STEPS);
  let step = 0;
  for (const [note, len] of MELODY) {
    if (note !== null) arr[step] = [note, len];
    step += len;
  }
  return arr;
})();

const SCHEDULE_AHEAD = 0.12; // 초
const SCHEDULER_INTERVAL = 25; // ms

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  dest?: AudioNode;
}

export class AudioManager {
  settings: AudioSettings;

  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmGain!: GainNode;
  private sfxGain!: GainNode;

  private bgmTimer: number | undefined;
  private bgmStep = 0;
  private bgmNextTime = 0;
  private bpm = 132;

  constructor() {
    this.settings = storage.getJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
  }

  /** 사용자 입력(클릭/키) 안에서 호출해야 브라우저 자동재생 정책을 통과한다. */
  unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    storage.setJSON(SETTINGS_KEY, this.settings);
    this.applySettings();
  }

  toggleMute() {
    this.setSettings({ muted: !this.settings.muted });
  }

  private applySettings() {
    if (!this.ctx) return;
    const { muted, bgmVolume, sfxVolume } = this.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.01);
    this.bgmGain.gain.setTargetAtTime(bgmVolume * 0.6, t, 0.01);
    this.sfxGain.gain.setTargetAtTime(sfxVolume, t, 0.01);
  }

  // ---------------- 효과음 ----------------

  private tone(freq: number, start: number, dur: number, opts: ToneOptions = {}) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
    const peak = opts.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(opts.dest ?? this.sfxGain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private arpeggio(freqs: number[], step: number, opts: ToneOptions = {}) {
    const t = this.ctx!.currentTime;
    freqs.forEach((f, i) => this.tone(f, t + i * step, step * 1.6, opts));
  }

  play(name: Sfx) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'move':
        this.tone(330, t, 0.035, { gain: 0.06 });
        break;
      case 'rotate':
        this.tone(520, t, 0.06, { gain: 0.07, slideTo: 760 });
        break;
      case 'hardDrop':
        this.tone(200, t, 0.14, { type: 'triangle', gain: 0.45, slideTo: 55 });
        break;
      case 'lock':
        this.tone(140, t, 0.07, { type: 'triangle', gain: 0.3 });
        break;
      case 'hold':
        this.tone(600, t, 0.08, { type: 'sine', gain: 0.18, slideTo: 900 });
        break;
      case 'clear':
        this.arpeggio([523.25, 659.25, 783.99], 0.05, { gain: 0.13 });
        break;
      case 'tetris':
        this.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.045, { gain: 0.15 });
        break;
      case 'levelUp':
        this.arpeggio([392, 523.25, 659.25, 783.99, 1046.5], 0.07, { type: 'triangle', gain: 0.3 });
        break;
      case 'gameOver':
        this.arpeggio([392, 329.63, 261.63, 196, 130.81], 0.18, { type: 'triangle', gain: 0.35 });
        break;
    }
  }

  // ---------------- 배경음 ----------------

  /** 레벨이 오를수록 템포를 조금씩 올린다 */
  setBgmLevel(level: number) {
    this.bpm = 132 + Math.min(level - 1, 12) * 4;
  }

  startBgm() {
    this.stopBgm();
    this.resumeBgm();
  }

  /** 현재 위치를 유지한 채 정지 */
  pauseBgm() {
    if (this.bgmTimer !== undefined) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = undefined;
    }
  }

  resumeBgm() {
    if (!this.ctx || this.bgmTimer !== undefined) return;
    this.bgmNextTime = this.ctx.currentTime + 0.05;
    this.bgmTimer = window.setInterval(() => this.scheduleBgm(), SCHEDULER_INTERVAL);
    this.scheduleBgm();
  }

  /** 정지하고 처음 위치로 되돌림 */
  stopBgm() {
    this.pauseBgm();
    this.bgmStep = 0;
  }

  private scheduleBgm() {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepDur = 60 / this.bpm / 2; // 8분음표
    // 탭이 백그라운드였다가 돌아오면 밀린 음을 몰아서 내지 않도록 보정
    if (this.bgmNextTime < ctx.currentTime - 0.2) this.bgmNextTime = ctx.currentTime + 0.05;
    while (this.bgmNextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      this.playBgmStep(this.bgmStep, this.bgmNextTime, stepDur);
      this.bgmNextTime += stepDur;
      this.bgmStep = (this.bgmStep + 1) % TOTAL_STEPS;
    }
  }

  private playBgmStep(step: number, time: number, stepDur: number) {
    const mel = MELODY_AT[step];
    if (mel) {
      const [note, len] = mel;
      this.tone(midiToFreq(note), time, len * stepDur * 0.9, { type: 'square', gain: 0.09, dest: this.bgmGain });
    }
    const root = BASS_ROOTS[Math.floor(step / STEPS_PER_BAR)];
    const bassNote = step % 2 === 0 ? root : root + 12;
    this.tone(midiToFreq(bassNote), time, stepDur * 0.8, { type: 'triangle', gain: 0.22, dest: this.bgmGain });
  }
}
