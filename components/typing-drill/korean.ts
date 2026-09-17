// 받침 유무에 따라 "은/는" 주제 조사를 붙인다.
export function withTopicMarker(word: string): string {
  const lastChar = word.charCodeAt(word.length - 1);
  const isHangulSyllable = lastChar >= 0xac00 && lastChar <= 0xd7a3;
  const hasFinalConsonant = isHangulSyllable && (lastChar - 0xac00) % 28 !== 0;
  return word + (hasFinalConsonant ? "은" : "는");
}
