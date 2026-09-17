import { describe, expect, test } from "vitest";

import {
  BASE_POINT,
  GOAL_SCORE,
  applyKeyPress,
  bonusForStreak,
  finishRound,
  isTypingKeyCode,
  startRound,
} from "@/components/typing-drill/round-engine";

// DRILL_KEYS 여덟 개 중 인덱스 0(ㅁ)과 3(ㄹ)만 번갈아 나오게 해서 타깃 전환을 예측 가능하게 만든다.
const sequence = [0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4];
function fakeRandom() {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

describe("bonusForStreak", () => {
  test("3연속 미만은 보너스가 없다", () => {
    expect(bonusForStreak(1)).toBe(0);
    expect(bonusForStreak(2)).toBe(0);
  });

  test("3,5,7,9연속마다 +20,+40,+60,+80을 준다", () => {
    expect(bonusForStreak(3)).toBe(20);
    expect(bonusForStreak(5)).toBe(40);
    expect(bonusForStreak(7)).toBe(60);
    expect(bonusForStreak(9)).toBe(80);
  });

  test("11연속부터는 +100에서 더 커지지 않는다", () => {
    expect(bonusForStreak(11)).toBe(100);
    expect(bonusForStreak(21)).toBe(100);
  });

  test("짝수 연속에는 보너스가 없다", () => {
    expect(bonusForStreak(4)).toBe(0);
    expect(bonusForStreak(10)).toBe(0);
  });
});

describe("isTypingKeyCode", () => {
  test("글자 키는 판정 대상이다", () => {
    expect(isTypingKeyCode("KeyA")).toBe(true);
    expect(isTypingKeyCode("Semicolon")).toBe(true);
  });

  test("수정키·방향키는 판정 대상이 아니다", () => {
    expect(isTypingKeyCode("ShiftLeft")).toBe(false);
    expect(isTypingKeyCode("ArrowLeft")).toBe(false);
    expect(isTypingKeyCode("ControlLeft")).toBe(false);
  });
});

describe("applyKeyPress", () => {
  test("맞는 키를 누르면 기본 점수를 주고 다음 낱자로 넘어간다", () => {
    const random = fakeRandom();
    const state = startRound(random); // target: ㅁ (KeyA)
    const next = applyKeyPress(state, "KeyA", random);
    expect(next.score).toBe(BASE_POINT);
    expect(next.hits).toBe(1);
    expect(next.firstTry).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.lastOutcome).toBe("hit");
    expect(next.target).not.toBe(state.target);
  });

  test("연습 대상이 아닌 낱자 키(ㅎ, ㅗ)를 눌러도 틀린 것으로 판정한다", () => {
    const random = fakeRandom();
    const state = startRound(random); // target: ㅁ (KeyA)
    const next = applyKeyPress(state, "KeyG", random); // ㅎ, inRound: false
    expect(next.lastOutcome).toBe("miss");
    expect(next.score).toBe(0);
    expect(next.dirty).toBe(true);
    expect(next.target).toBe(state.target); // 같은 낱자에 머문다
  });

  test("틀리면 넘어가지 않고 같은 낱자에 머문다", () => {
    const random = fakeRandom();
    const state = startRound(random); // target: ㅁ (KeyA)
    const next = applyKeyPress(state, "KeyS", random); // ㄴ, 오답
    expect(next.target).toBe(state.target);
    expect(next.score).toBe(0);
  });

  test("틀렸다가 다시 맞혀도 10점을 주지만 연속에는 넣지 않는다", () => {
    const random = fakeRandom();
    let state = startRound(random); // target: ㅁ
    state = applyKeyPress(state, "KeyS", random); // 오답
    state = applyKeyPress(state, "KeyA", random); // 정답(재시도)
    expect(state.score).toBe(BASE_POINT);
    expect(state.firstTry).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.hits).toBe(1);
  });

  test("틀리면 점수를 깎지 않고 연속만 0으로 되돌린다", () => {
    const random = fakeRandom();
    let state = startRound(random);
    state = applyKeyPress(state, "KeyA", random); // 정답, streak 1
    const scoreBeforeMiss = state.score;
    state = applyKeyPress(state, "KeyS", random); // 오답 (다음 타깃은 ㄹ)
    expect(state.score).toBe(scoreBeforeMiss);
    expect(state.streak).toBe(0);
  });

  test("판정 대상이 아닌 키(수정키)는 상태를 바꾸지 않는다", () => {
    const random = fakeRandom();
    const state = startRound(random);
    const next = applyKeyPress(state, "ShiftLeft", random);
    expect(next).toBe(state);
  });

  test("3연속 첫 시도 성공에 +20 보너스가 붙는다", () => {
    const random = fakeRandom(); // ㅁ,ㄹ,ㅁ,ㄹ,... 번갈아 나온다
    let state = startRound(random); // ㅁ
    const codesInOrder = () => {
      // 실제 타깃을 그때그때 확인해서 맞는 코드를 계산한다
      const map: Record<string, string> = { ㅁ: "KeyA", ㄹ: "KeyF" };
      return map[state.target.letter];
    };
    state = applyKeyPress(state, codesInOrder(), random); // 1
    state = applyKeyPress(state, codesInOrder(), random); // 2
    const before = state.score;
    state = applyKeyPress(state, codesInOrder(), random); // 3 -> +20 보너스
    expect(state.streak).toBe(3);
    expect(state.lastBonus).toBe(20);
    expect(state.score).toBe(before + BASE_POINT + 20);
  });

  test("목표 점수를 처음 넘기는 순간에만 goalHit이 켜진다", () => {
    const random = fakeRandom();
    let state = startRound(random);
    expect(state.goalHit).toBe(false);
    // 충분히 많이 맞혀서 700점을 넘긴다
    const map: Record<string, string> = { ㅁ: "KeyA", ㄹ: "KeyF" };
    for (let i = 0; i < 60 && state.score < GOAL_SCORE; i++) {
      state = applyKeyPress(state, map[state.target.letter], random);
    }
    expect(state.score).toBeGreaterThanOrEqual(GOAL_SCORE);
    expect(state.goalHit).toBe(true);
  });
});

describe("finishRound", () => {
  test("정확도는 첫 시도에 맞힌 비율이다", () => {
    const random = fakeRandom();
    let state = startRound(random); // shown: 1 (ㅁ)
    state = applyKeyPress(state, "KeyS", random); // 오답, shown 그대로
    state = applyKeyPress(state, "KeyA", random); // 정답(재시도), shown 2로 증가
    const result = finishRound(state);
    expect(result.shown).toBe(2);
    expect(result.firstTry).toBe(0);
    expect(result.accuracy).toBe(0);
  });

  test("700점 이상이면 목표를 채운 것으로 본다", () => {
    const random = fakeRandom();
    let state = startRound(random);
    const map: Record<string, string> = { ㅁ: "KeyA", ㄹ: "KeyF" };
    for (let i = 0; i < 60 && state.score < GOAL_SCORE; i++) {
      state = applyKeyPress(state, map[state.target.letter], random);
    }
    expect(finishRound(state).met).toBe(true);
  });

  test("700점 미만이면 목표를 못 채운 것으로 본다", () => {
    const random = fakeRandom();
    const state = startRound(random);
    expect(finishRound(state).met).toBe(false);
  });
});
