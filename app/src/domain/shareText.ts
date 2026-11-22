export const HASHTAG = '#さなちゃんねるトコトコおでかけビンゴ';

export function buildShareText(bingo: number, achieved: number): string {
  let head: string;
  if (achieved >= 25) head = 'トコトコおでかけビンゴ 全マス達成でおでかけマスター！';
  else if (bingo === 0) head = `トコトコおでかけビンゴ 挑戦中！（${achieved}/25マス）`;
  else head = `トコトコおでかけビンゴ ${bingo}ビンゴ！（${achieved}/25マス）`;
  return `${head}\n${HASHTAG}`;
}

export function xIntentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
