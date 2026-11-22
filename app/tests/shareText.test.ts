import { describe, expect, it } from 'vitest';
import { buildShareText, HASHTAG, xIntentUrl } from '../src/domain/shareText';

describe('buildShareText', () => {
  it('0ビンゴ', () => {
    expect(buildShareText(0, 3)).toBe(`トコトコおでかけビンゴ 挑戦中！（3/25マス）\n${HASHTAG}`);
  });
  it('Nビンゴ', () => {
    expect(buildShareText(3, 12)).toBe(`トコトコおでかけビンゴ 3ビンゴ！（12/25マス）\n${HASHTAG}`);
  });
  it('全マス達成', () => {
    expect(buildShareText(12, 25)).toBe(`トコトコおでかけビンゴ 全マス達成でおでかけマスター！\n${HASHTAG}`);
  });
  it('X intent URL', () => {
    expect(xIntentUrl('a #b')).toBe('https://x.com/intent/post?text=a%20%23b');
  });
});
