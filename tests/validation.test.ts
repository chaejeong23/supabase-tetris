import { describe, expect, it } from 'vitest';
import { isPlausibleScore, validateFeedbackContent, validateNickname } from '../src/game/validation';

describe('validateNickname', () => {
  it('길이 2~12자', () => {
    expect(validateNickname('a')).not.toBeNull();
    expect(validateNickname('ab')).toBeNull();
    expect(validateNickname('가나다라마바사아자차카타')).toBeNull();
    expect(validateNickname('가나다라마바사아자차카타파')).not.toBeNull();
    expect(validateNickname('   ')).not.toBeNull();
  });

  it('금칙어 차단', () => {
    expect(validateNickname('FuckYou')).not.toBeNull();
    expect(validateNickname('운영자123')).not.toBeNull();
  });
});

describe('validateFeedbackContent', () => {
  it('빈 내용/500자 초과 거부', () => {
    expect(validateFeedbackContent('  ')).not.toBeNull();
    expect(validateFeedbackContent('좋아요')).toBeNull();
    expect(validateFeedbackContent('a'.repeat(501))).not.toBeNull();
  });
});

describe('isPlausibleScore', () => {
  it('범위와 레벨-줄 수 일관성 확인', () => {
    expect(isPlausibleScore({ score: 1200, level: 2, lines: 12 })).toBe(true);
    expect(isPlausibleScore({ score: 1200, level: 5, lines: 12 })).toBe(false);
    expect(isPlausibleScore({ score: -1, level: 1, lines: 0 })).toBe(false);
    expect(isPlausibleScore({ score: 1.5, level: 1, lines: 0 })).toBe(false);
  });
});
