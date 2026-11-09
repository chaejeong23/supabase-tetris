/** localStorage 접근 래퍼: 사생활 보호 모드 등에서 예외가 나도 앱이 멈추지 않게 한다. */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* 무시 */
    }
  },
  getJSON<T>(key: string, fallback: T): T {
    const raw = this.get(key);
    if (!raw) return fallback;
    try {
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  },
  setJSON(key: string, value: unknown) {
    this.set(key, JSON.stringify(value));
  },
};
